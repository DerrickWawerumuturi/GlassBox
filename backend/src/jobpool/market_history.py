"""
Monthly market history from daily snapshots.

A month is an average of the comparable daily observations, never a sum of
daily inventories. Profiler versions remain separate and missing days are
reported as gaps, not interpolated.
"""
import calendar
from collections import defaultdict
from datetime import date, datetime, timezone

from src.database.session import connection, is_configured

MAX_MONTHS = 6


class NotAvailable(RuntimeError):
    """History cannot be read because the database is not configured."""


def _month_start(day: date, months_back: int) -> date:
    index = day.year * 12 + day.month - 1 - months_back
    return date(index // 12, index % 12 + 1, 1)


def _as_date(value) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def aggregate(rows: list[dict], as_of: date | None = None, months: int = MAX_MONTHS) -> dict:
    """
    Daily snapshot rows -> comparable monthly averages.

    A skill's demand is the arithmetic mean of its daily share of readable
    postings. A missing skill on a captured day contributes zero; a day with
    zero readable postings is excluded from that skill's denominator.
    """
    if not 1 <= months <= MAX_MONTHS:
        raise ValueError(f"months must be between 1 and {MAX_MONTHS}")
    as_of = as_of or datetime.now(timezone.utc).date()
    range_start = _month_start(date(as_of.year, as_of.month, 1), months - 1)
    range_end = as_of

    groups: dict[tuple[str, str, str], dict[date, dict]] = defaultdict(dict)
    for row in rows:
        taken_on = _as_date(row["taken_on"])
        if taken_on < range_start or taken_on > range_end:
            continue
        key = (taken_on.strftime("%Y-%m"), str(row["profiler_version"]), str(row["family"]))
        # The database primary key makes this unique; keeping the last row also
        # makes the pure aggregator robust to duplicated fixtures/input.
        groups[key][taken_on] = row

    series = []
    months_by_version: dict[str, set[str]] = defaultdict(set)
    for (month, version, family), daily_by_date in sorted(groups.items()):
        daily = [daily_by_date[d] for d in sorted(daily_by_date)]
        taken_dates = sorted(daily_by_date)
        readable_days = [row for row in daily if int(row.get("readable") or 0) > 0]
        skill_keys = sorted({key for row in readable_days for key in (row.get("skills") or {})})
        skills = []
        for skill in skill_keys:
            shares = []
            for row in readable_days:
                readable = int(row["readable"])
                counts = (row.get("skills") or {}).get(skill, [0, 0, 0])
                counts = list(counts or [0, 0, 0])
                counts += [0] * (3 - len(counts))
                shares.append([float(counts[i] or 0) / readable for i in range(3)])
            skills.append({
                "key": skill,
                "required_share": round(100 * sum(s[0] for s in shares) / len(shares), 2),
                "preferred_share": round(100 * sum(s[1] for s in shares) / len(shares), 2),
                "mentioned_share": round(100 * sum(s[2] for s in shares) / len(shares), 2),
                "sample_days": len(readable_days),
            })
        skills.sort(key=lambda item: (
            -(item["required_share"] + item["preferred_share"] + item["mentioned_share"]),
            item["key"],
        ))
        coverage_days = calendar.monthrange(int(month[:4]), int(month[5:7]))[1]
        snapshot_days = len(taken_dates)
        months_by_version[version].add(month)
        series.append({
            "month": month,
            "profiler_version": version,
            "family": family,
            "average_active_postings": round(sum(int(r["postings"]) for r in daily) / snapshot_days, 2),
            "average_readable_postings": round(sum(int(r["readable"]) for r in daily) / snapshot_days, 2),
            "snapshot_days": snapshot_days,
            "coverage_days": coverage_days,
            "coverage_fraction": round(snapshot_days / coverage_days, 4),
            "first_snapshot": taken_dates[0].isoformat(),
            "last_snapshot": taken_dates[-1].isoformat(),
            "skill_sample_days": len(readable_days),
            "skills": skills,
        })

    six_month_available = any(len(observed_months) >= 6 for observed_months in months_by_version.values())
    return {
        "range_start": range_start.isoformat(),
        "range_end": range_end.isoformat(),
        "months_requested": months,
        "six_month_available": six_month_available,
        "series": series,
    }


def read(months: int = MAX_MONTHS) -> dict:
    """Read the bounded daily history and return its monthly aggregation."""
    if not is_configured():
        raise NotAvailable("Market history is not configured.")
    today = datetime.now(timezone.utc).date()
    start = _month_start(date(today.year, today.month, 1), months - 1)
    with connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select taken_on, profiler_version, family, postings, readable, skills
            from market_snapshots
            where taken_on >= %s and taken_on <= %s
            order by taken_on, profiler_version, family
            """,
            (start, today),
        )
        rows = cur.fetchall()
    return aggregate(rows, as_of=today, months=months)
