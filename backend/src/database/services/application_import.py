"""
Applications from a spreadsheet the user kept before JobRadar.

    preview(payload, data, file_name, mapping, date_order)   read it, write nothing
    commit(payload, rows, file_name)                          create, skipping duplicates

Nothing is stored until the user has seen the preview and confirmed it, and the
preview is stateless: the file is simply sent again with the user's corrected
mapping. How a sheet is read is spreadsheet.py.
"""
import re
from datetime import date, datetime, timezone

from src.database.repositories import application_repository as repo
from src.database.services.spreadsheet import (
    FIELDS, MAX_ROWS, date_order, find_header, map_columns, normalise_row, read_table, cell_text,
    InvalidSpreadsheet,  # noqa: F401  (re-raised to the API)
)
from src.database.services.users import resolve_user_id
from src.database.session import connection
from src.jobpool.opportunities import duplicate_key

# Same company and role applied to this far apart is a re-application, not a repeat.
REAPPLY_DAYS = 60


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
                return {**ref, "reason": f"Same company and role, applied {applied} — a re-application?",
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
    Create the confirmed rows. Duplicates are checked again against what the
    account holds now, so a double click or a second tab cannot import twice.
    Each row is its own savepoint: one bad row is reported, not fatal.
    """
    now = datetime.now(timezone.utc)
    note = f"Imported from {file_name}" if file_name else "Imported from a spreadsheet"
    created, skipped = [], []
    with connection() as conn:
        user_id = resolve_user_id(conn, payload)
        duplicates = Duplicates(repo.list_for_user(conn, user_id))
        pool = _pool_jobs(conn, rows)
        for number, row in enumerate(rows, start=1):
            duplicate = duplicates.check(row)
            if duplicate and duplicate["certain"]:
                skipped.append({"title": row["title"], "reason": duplicate["reason"]})
                continue
            try:
                with conn.transaction():
                    application_id = repo.create(
                        conn, user_id, job_id=pool.get(link_key(row.get("url"))), title=row["title"],
                        company=row.get("company"), source=row.get("source") or "import", url=row.get("url"),
                        location=row.get("location"), workplace=row.get("workplace"),
                        employment_type=row.get("employment_type"), salary=row.get("salary"), notes=row.get("notes"))
                    repo.import_status(conn, application_id, row["status"], row.get("applied_at"), now, note)
            except Exception as err:
                skipped.append({"title": row["title"], "reason": "Couldn't be saved"})
                print(f"import: row {number} failed: {err}")
                continue
            duplicates.accept(row, number)
            created.append(application_id)
    return {"created": len(created), "application_ids": created, "skipped": skipped}
