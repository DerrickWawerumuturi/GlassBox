"""
Fill jobs.source (migration 018) for the jobs already in the pool.

    python -m src.database.backfill_job_source --dry-run   count what would be set
    python -m src.database.backfill_job_source             set it, in one transaction

Run it after migration 018 and before the push. Only live rows (seen in the
last 3 days, POOL_WINDOWS["live"]) from sources the collector still reads get
a source: a row given one leaves the old 3 day rule for the closing rule, so an
old row from a board that has gone (the six removed on 2026-10-08) must not get
one, or it would count again. What can't be placed stays NULL, keeps the old
rule, and gets its source at its next sighting by the collector. Re-running
only touches rows still NULL.

Where the source comes from: the provider for the feeds (RemoteOK, Arbeitnow,
the Kenyan boards...); the board in the job's link for Ashby, Lever, Workable
and most Greenhouse boards; for a link without one (stripe.com/jobs?gh_jid=...,
apply.workable.com/j/...), the one board of that provider whose name matches
the company's.
"""
import re
import sys

from src.database.session import connection
from src.jobpool.sources import AGGREGATORS, ATS, KENYAN_BOARDS, POOL_WINDOWS, load_boards

FEEDS = {fn.__name__ for fn in AGGREGATORS} - {"himalayas_regional"}
LINKS = {
    "greenhouse": re.compile(r"greenhouse\.io/(?:embed/job_app\?for=)?([^/?#&]+)", re.I),
    "ashby": re.compile(r"jobs\.ashbyhq\.com/([^/?#]+)", re.I),
    "lever": re.compile(r"jobs\.(?:eu\.)?lever\.co/([^/?#]+)", re.I),
    "workable": re.compile(r"apply\.workable\.com/([^/?#]+)", re.I),
}

# A company name and a board name match on a shared start this long or longer.
MIN_NAME = 4

LIVE_ROWS = """
select id, provider, url, company from jobs
where source is null and closed_at is null and archived_at is null
  and provider = any(%(providers)s::text[])
  and last_seen_at > now() - make_interval(days => %(live)s)
"""

SET = """
update jobs j set source = t.source
from unnest(%s::bigint[], %s::text[]) as t(id, source)
where j.id = t.id and j.source is null
"""


def _key(text: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (text or "").lower())


def source_for(row: dict, boards: dict[str, dict[str, str]]) -> str | None:
    """The collector's name for the source a stored job came from, or None when it can't be told."""
    provider = row["provider"]
    if provider in FEEDS:
        return provider
    if provider in KENYAN_BOARDS:
        return f"ke:{provider}"
    if provider not in ATS:
        return None
    known = boards.get(provider, {})
    found = LINKS[provider].search(row["url"] or "")
    if found and _key(found.group(1)) in known:
        return known[_key(found.group(1))]
    # No board in the link: "Stripe" -> greenhouse:stripe, "Kuda Technologies Ltd" -> workable:kuda,
    # "OnLogic" -> workable:onlogic-inc, when exactly one of the provider's boards fits.
    company = _key(row["company"])
    fits = [name for key, name in known.items()
            if min(len(key), len(company)) >= MIN_NAME and (company.startswith(key) or key.startswith(company))]
    return fits[0] if len(fits) == 1 else None


def backfill(conn, dry_run: bool = False) -> dict:
    boards: dict[str, dict[str, str]] = {}
    for ats, slug in load_boards():
        boards.setdefault(ats, {})[_key(slug)] = f"{ats}:{slug}"
    providers = [*FEEDS, *KENYAN_BOARDS, *ATS]
    with conn.cursor() as cur:
        cur.execute(LIVE_ROWS, {"providers": providers, "live": POOL_WINDOWS["live"]})
        rows = cur.fetchall()
        placed = [(row["id"], source) for row in rows if (source := source_for(row, boards))]
        if placed and not dry_run:
            cur.execute(SET, ([i for i, _ in placed], [s for _, s in placed]))
    return {"live rows without a source": len(rows), "placed": len(placed), "left for the next sighting": len(rows) - len(placed)}


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    with connection() as conn:
        result = backfill(conn, dry_run=dry)
        if dry:
            conn.rollback()
    print(("would set" if dry else "set"), result)
