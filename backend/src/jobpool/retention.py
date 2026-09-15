"""
What a job-pool cleanup would do, without doing it.

    python -m src.jobpool.retention

Read-only. There is deliberately no delete or archive command yet: the policy in
docs/decisions/job-retention.md has to be agreed first.
"""
from src.database.session import connection

REPORT = """
select r.retention_class,
       count(*)                                        as jobs,
       pg_size_pretty(sum(pg_column_size(j.*))::bigint) as row_bytes,
       min(r.last_seen_at)                             as oldest_seen
from job_retention r
join jobs j on j.id = r.id
where r.archived_at is null
group by 1
order by array_position(array['protected','interacted','shown','active','stale'], r.retention_class)
"""


def main() -> int:
    with connection() as conn, conn.cursor() as cur:
        cur.execute(REPORT)
        rows = cur.fetchall()
    print(f"{'class':<12}{'jobs':>8}{'size':>12}  oldest sighting")
    for row in rows:
        print(f"{row['retention_class']:<12}{row['jobs']:>8}{row['row_bytes']:>12}  {row['oldest_seen']:%Y-%m-%d}")
    print("\nOnly 'stale' would be eligible for archiving. Nothing was changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
