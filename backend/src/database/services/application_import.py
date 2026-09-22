"""
Applications from a spreadsheet the user kept before JobRadar.

    preview(payload, data, file_name, mapping, date_order)   read it, write nothing
    commit(payload, rows, file_name)                          create, skipping duplicates
    match_imported(payload, application_ids)                  afterwards: find postings, score them

Nothing is stored until the user has seen the preview and confirmed it, and the
preview is stateless: the file is simply sent again with the user's corrected
mapping. How a sheet is read is spreadsheet.py.
"""
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone

from src.database.repositories import application_repository as repo
from src.database.services.spreadsheet import (
    FIELDS, MAX_ROWS, date_order, find_header, map_columns, normalise_row, read_table, cell_text,
    InvalidSpreadsheet,  # noqa: F401  (re-raised to the API)
)
from src.database.services.applications import score_job
from src.database.services.users import resolve_user_id
from src.database.session import connection
from src.jobpool.opportunities import duplicate_key
from src.jobpool.service import job_url_service

# Same company and role applied to this far apart is a re-application, not a repeat.
REAPPLY_DAYS = 60
# Postings fetched at once while matching an import: each is a page load elsewhere.
MATCH_WORKERS = 4


def link_key(url: str | None) -> str | None:
    """A link as its job: host without www, path without trailing slash, only the query that names a job."""
    if not url:
        return None
    m = re.match(r"^\w+://(?:www\.)?([^/?#]+)([^?#]*)(?:\?([^#]*))?", url.strip().lower())
    if not m:
        return None
    host, path, query = m.group(1), m.group(2).rstrip("/"), m.group(3) or ""
    keep = sorted(p for p in query.split("&") if p.split("=")[0] in ("gh_jid", "jobid", "job_id", "id", "jk", "currentjobid"))
    return host + path + ("?" + "&".join(keep) if keep else "")


# --------------------------------------------------------------- duplicates

def _dates_close(a: str | None, b: str | None) -> bool:
    if not a or not b:
        return True
    return abs((date.fromisoformat(str(a)[:10]) - date.fromisoformat(str(b)[:10])).days) <= REAPPLY_DAYS


class Duplicates:
    """Applications already tracked, plus the rows accepted so far from this file."""

    def __init__(self, existing: list[dict]):
        self.by_link, self.by_role = {}, {}
        for app in existing:
            self._add(app, {"kind": "existing", "application_id": app["id"]})

    def _add(self, row: dict, ref: dict):
        key = link_key(row.get("url"))
        if key:
            self.by_link.setdefault(key, ref)
        self.by_role.setdefault(duplicate_key(row.get("company"), row.get("title")), []).append(
            {**ref, "applied_at": row.get("applied_at")})

    def check(self, row: dict) -> dict | None:
        """{kind, reason, ...} when the row repeats something; "possible" ones stay importable."""
        key = link_key(row.get("url"))
        if key and key in self.by_link:
            return {**self.by_link[key], "reason": "Same job link", "certain": True}
        if row.get("company") and row.get("title"):
            for ref in self.by_role.get(duplicate_key(row["company"], row["title"]), []):
                applied = str(ref["applied_at"])[:10] if ref["applied_at"] else None
                if _dates_close(row.get("applied_at"), applied):
                    return {**ref, "reason": "Same company and role", "certain": True}
                return {**ref, "reason": f"Same company and role, applied {applied}",
                        "certain": False}
        return None

    def accept(self, row: dict, number: int):
        self._add(row, {"kind": "file", "row": number})


# ------------------------------------------------------------------ service

def preview(payload, data: bytes, file_name: str, mapping: dict | None = None, order: str | None = None) -> dict:
    sheet, sheets, table = read_table(data, file_name or "")
    header_at, _ = find_header(table)
    header = table[header_at] if header_at is not None else []
    body_start = header_at + 1 if header_at is not None else 0
    body = [(n + body_start + 1, r) for n, r in enumerate(table[body_start:]) if any(cell_text(v) for v in r)][:MAX_ROWS]
    if not body:
        raise InvalidSpreadsheet("No rows with data were found in that file.")

    columns = map_columns(header, [r for _, r in body], mapping)
    date_column = next((c["index"] for c in columns if c["field"] == "applied_at"), None)
    detected, ambiguous = date_order([r[date_column] for _, r in body if date_column is not None and date_column < len(r)])
    order = order if order in ("dmy", "mdy") else detected

    with connection() as conn:
        user_id = resolve_user_id(conn, payload, create=False)
        existing = repo.list_for_user(conn, user_id) if user_id else []
    duplicates = Duplicates(existing)
    today = datetime.now(timezone.utc).date()
    rows = []
    for number, values in body:
        row, issues = normalise_row(values, columns, order, today)
        duplicate = duplicates.check(row) if row["title"] else None
        if any(i["level"] == "error" for i in issues):
            state = "error"
        elif duplicate and duplicate["certain"]:
            state = "duplicate"
        else:
            state = "warning" if issues or duplicate else "ready"
            duplicates.accept(row, number)
        # A possible re-application stays importable, but only if the user ticks it.
        rows.append({"row": number, "status": state, "include": state in ("ready", "warning") and not duplicate,
                     "values": row, "issues": issues, "duplicate": duplicate})

    mapped = {c["field"] for c in columns if c["field"]}
    return {
        "file_name": file_name, "sheet": sheet, "sheets": sheets,
        "header_row": header_at + 1 if header_at is not None else None,
        "date_order": order, "date_order_ambiguous": ambiguous and order == detected,
        "columns": columns, "fields": FIELDS,
        "missing_fields": [FIELDS[f] for f in ("title", "company", "applied_at", "status") if f not in mapped],
        "summary": {state: sum(1 for r in rows if r["status"] == state)
                    for state in ("ready", "warning", "duplicate", "error")} | {"rows": len(rows)},
        "rows": rows,
    }


def _pool_jobs(conn, rows: list[dict]) -> dict[str, int]:
    """{link key: jobs.id} for the rows whose link is a job the pool already holds."""
    keys = {k for k in (link_key(r.get("url")) for r in rows) if k}
    urls = [f"{scheme}://{www}{key}" for key in keys for scheme in ("https", "http") for www in ("", "www.")]
    return {link_key(job["url"]): job["id"] for job in repo.jobs_by_link(conn, urls)}


def commit(payload, rows: list[dict], file_name: str | None) -> dict:
    """
    Create the confirmed rows in one transaction: all of them, or none if the
    database refuses one. Duplicates are checked again against what the account
    holds now, so a double click or a second tab cannot import twice.
    """
    now = datetime.now(timezone.utc)
    note = f"Imported from {file_name}" if file_name else "Imported from a spreadsheet"
    accepted, skipped = [], []
    with connection() as conn:
        user_id = resolve_user_id(conn, payload)
        existing = repo.list_for_user(conn, user_id)
        duplicates = Duplicates(existing)
        # One application per job: a link to a job tracked another way is a duplicate too.
        tracked = {app["job_id"] for app in existing if app["job_id"]}
        pool = _pool_jobs(conn, rows)
        for number, row in enumerate(rows, start=1):
            duplicate = duplicates.check(row)
            job_id = pool.get(link_key(row.get("url")))
            if job_id in tracked:
                duplicate = {"reason": "Same job as one you already track", "certain": True}
            if duplicate and duplicate["certain"]:
                skipped.append({"title": row["title"], "reason": duplicate["reason"]})
                continue
            duplicates.accept(row, number)
            if job_id:
                tracked.add(job_id)
            accepted.append({**row, "job_id": job_id, "source": row.get("source") or "import"})
        created = repo.import_many(conn, user_id, accepted, now, note) if accepted else []
    return {"created": len(created), "application_ids": created, "skipped": skipped,
            "matching": sum(1 for row in accepted if row["job_id"] or row.get("url"))}


def match_imported(payload, application_ids: list[int]) -> int:
    """
    After an import has returned: each row's posting (the pool job its link
    matched, else the page behind the link, read as a pasted link is) is
    linked, fills the columns the sheet left blank, and is scored against the
    CV. A link takes seconds to read, so this never runs inside the request.
    Returns how many were scored.
    """
    if not application_ids:
        return 0
    with connection() as conn:
        user_id = resolve_user_id(conn, payload, create=False)
        apps = repo.for_matching(conn, user_id, application_ids) if user_id else []
    with ThreadPoolExecutor(MATCH_WORKERS) as pool:
        return sum(pool.map(lambda app: _match_one(user_id, app), apps))


def _match_one(user_id: int, app: dict) -> bool:
    job_id, fields = app["job_id"], {}
    if job_id is None:
        try:
            found = job_url_service.extract(app["url"])
        except Exception as err:  # private, unreadable or refused links stay as the sheet had them
            print(f"import match: {app['url']} not read: {err}")
            return False
        job_id, fields = found["job_id"], found["fields"]
    if job_id is None:
        return False
    try:
        with connection() as conn:
            score, method = score_job(conn, user_id, job_id)
            # Scored either way, but linked only if no other application holds this job.
            link = job_id if app["job_id"] is None and not repo.find_by_user_and_job(conn, user_id, job_id) else None
            repo.enrich(conn, user_id, app["id"], link, fields, score, method)
        return score is not None
    except Exception as err:
        print(f"import match: application {app['id']} not updated: {err}")
        return False
