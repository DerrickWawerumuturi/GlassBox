"""
Cut the CVs already stored down to what we keep (src/matching/kept_cv.py).

    python -m src.database.backfill_kept_cv --dry-run   count what would change
    python -m src.database.backfill_kept_cv             change it, in one transaction

Run it BEFORE migration 017. It works out what matching needs (years per
track from the positions' dates, families, the PhD flag) while the details
are still there, then drops them. Migration 017 then strips any personal key
left, as a safety net, so matching on rows it alone touched falls back to the
CV's level label until the next scan.
"""
import sys

from psycopg.types.json import Jsonb

from src.database.session import connection
from src.matching.kept_cv import PERSONAL, PROFILE_DROP, kept_cv, kept_profile


def _personal(data: dict | None, keys) -> bool:
    return isinstance(data, dict) and any(key in data for key in keys)


def minimise(conn, dry_run: bool = False) -> dict:
    """Rewrites every stored CV, kept profile and application snapshot that still holds details."""
    counts = {"cvs": 0, "latest_cvs": 0, "application": 0}
    with conn.cursor() as cur:
        cur.execute("select user_id, data from cvs")
        for row in cur.fetchall():
            if _personal(row["data"], PERSONAL):
                counts["cvs"] += 1
                if not dry_run:
                    cur.execute("update cvs set data = %s where user_id = %s", (Jsonb(kept_cv(row["data"])), row["user_id"]))
        cur.execute("select user_id, profile from latest_cvs")
        for row in cur.fetchall():
            if _personal(row["profile"], PROFILE_DROP):
                counts["latest_cvs"] += 1
                if not dry_run:
                    cur.execute("update latest_cvs set profile = %s where user_id = %s",
                                (Jsonb(kept_profile(row["profile"])), row["user_id"]))
        cur.execute("select id, cv_snapshot from application where cv_snapshot is not null")
        for row in cur.fetchall():
            if _personal(row["cv_snapshot"], PERSONAL):
                counts["application"] += 1
                if not dry_run:
                    cur.execute("update application set cv_snapshot = %s where id = %s",
                                (Jsonb(kept_cv(row["cv_snapshot"])), row["id"]))
    return counts


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    with connection() as conn:
        result = minimise(conn, dry_run=dry)
        if dry:
            conn.rollback()
    print(("would change" if dry else "changed"), result)
