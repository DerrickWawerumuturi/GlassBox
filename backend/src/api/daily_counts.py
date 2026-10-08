"""
Server side daily totals: how many scans started, finished and failed, how
many reused the kept CV, how many accounts were created. The truth when ad
blockers or Do Not Track hide PostHog's events (decisions/analytics.md).
Numbers only: nothing counted says who.

    python -m src.api.daily_counts             the last 14 days and a 7 day total
    python -m src.api.daily_counts --days 30   the last 30

A scan is one POST /analyze or POST /analyze/reuse (`scan`). An upload scan
is two requests at once, /cv/parse and /analyze, and /analyze alone decides
whether it worked (frontend lib/cv-ask.ts), so /cv/parse is not counted.

Counting never costs a request: the write runs on its own thread after the
route has moved on, and a write that fails is logged and dropped.
"""
import functools
import sys
from concurrent.futures import ThreadPoolExecutor

from src.database.repositories import daily_count_repository
from src.database.session import connection, is_configured

# One worker: counts land in the order they happened, and counting holds at
# most one of the pool's connections however busy the API gets.
_writer = ThreadPoolExecutor(max_workers=1, thread_name_prefix="daily-counts")


def _write(events: tuple[str, ...]) -> None:
    if not is_configured():
        return
    try:
        with connection() as conn:
            daily_count_repository.increment(conn, events)
    except Exception as err:
        print(f"daily count not kept ({', '.join(events)}): {err}")


def count(*events: str) -> None:
    """Adds one to each counter on today's row, later, on the writer thread."""
    try:
        _writer.submit(_write, events)
    except Exception as err:  # the writer is shut down: the process is stopping
        print(f"daily count not kept ({', '.join(events)}): {err}")


def settle() -> None:
    """Waits for every count asked for so far. For tests: a request never waits."""
    _writer.submit(lambda: None).result()


def scan(*also: str):
    """Counts a route as one scan: started (and `also`) on the way in, then finished or failed."""
    def wrap(route):
        @functools.wraps(route)  # FastAPI reads the route's parameters through __wrapped__
        async def counted(*args, **kwargs):
            count("scans_started", *also)
            try:
                result = await route(*args, **kwargs)
            except Exception:
                count("scans_failed")
                raise
            count("scans_finished")
            return result
        return counted
    return wrap


# ---------------------------------------------------------------- the read command

HEADINGS = {"scans_started": "started", "scans_finished": "finished", "scans_failed": "failed",
            "cv_reused": "reused", "accounts_created": "accounts"}
WEEK = 7


def table(rows: list[dict], days: int) -> str:
    """The last `days` rows, one line a day, then the total of the last 7."""
    columns = daily_count_repository.COLUMNS
    widths = [max(len(HEADINGS[c]), 8) for c in columns]

    def line(label: str, values) -> str:
        return f"{label:<12}" + "".join(f"{v:>{w + 2}}" for v, w in zip(values, widths))

    week = rows[-WEEK:]
    out = [line("day (UTC)", [HEADINGS[c] for c in columns])]
    out += [line(row["day"].isoformat(), [row[c] for c in columns]) for row in rows[-days:]]
    out.append(line(f"last {len(week)} days", [sum(row[c] for row in week) for c in columns]))
    return "\n".join(out)


def main(argv: list[str]) -> int:
    days = int(argv[argv.index("--days") + 1]) if "--days" in argv else 14
    if not 1 <= days <= 366:
        print("--days takes 1 to 366")
        return 2
    if not is_configured():
        print("DATABASE_URL is not set")
        return 1
    with connection() as conn:  # a select only: safe against production
        rows = daily_count_repository.recent(conn, max(days, WEEK))
    print(table(rows, days))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
