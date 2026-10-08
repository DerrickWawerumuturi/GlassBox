"""Market snapshot: what gets counted, and that the daily run takes it. Offline."""
from src.jobpool import daily, snapshot


def row(company, title, family="data_analytics", seniority="junior", thin=False,
        required=(), preferred=(), mentioned=(), provider="greenhouse"):
    return {"provider": provider, "company": company, "title": title,
            "profile": {"family": family, "seniority": seniority, "thin": thin,
                        "required": list(required), "preferred": list(preferred), "mentioned": list(mentioned)}}


def test_a_role_listed_twice_counts_once():
    rows = [row("Acme Ltd", "Data Analyst (Remote)", required=["sql"]),
            row("Acme", "Data Analyst", required=["sql"]),              # same role, another board
            row("Acme", "Data Engineer", family="data_engineering", required=["sql"])]
    out = snapshot.summarise(rows)
    assert out["data_analytics"]["postings"] == 1
    assert out["data_analytics"]["skills"] == {"sql": [1, 0, 0]}
    assert out["data_engineering"]["postings"] == 1


def test_skills_are_counted_by_kind():
    rows = [row("A", "Analyst 1", required=["sql", "python"], preferred=["tableau"]),
            row("B", "Analyst 2", required=["sql"], mentioned=["python"])]
    skills = snapshot.summarise(rows)["data_analytics"]["skills"]
    assert skills == {"sql": [2, 0, 0], "python": [1, 0, 1], "tableau": [0, 1, 0]}


def test_thin_postings_count_as_roles_but_not_toward_skills():
    rows = [row("A", "Analyst 1", required=["sql"]),
            row("B", "Analyst 2", seniority="mid", thin=True, required=["excel"])]
    s = snapshot.summarise(rows)["data_analytics"]
    assert (s["postings"], s["readable"]) == (2, 1)
    assert s["seniority"] == {"junior": 1, "mid": 1}
    assert s["skills"] == {"sql": [1, 0, 0]}


def test_only_the_daily_fetch_is_counted_not_what_users_brought_in():
    rows = [row("A", "Analyst 1", required=["sql"], provider="greenhouse"),
            row("B", "Analyst 2", required=["sql"], provider="myjobmag"),       # a Kenyan board: daily
            row("C", "Analyst 3", required=["sql"], provider="url"),            # someone's pasted link
            row("D", "Analyst 4", required=["sql"], provider="jsearch")]        # a user's scan
    s = snapshot.summarise(rows)["data_analytics"]
    assert (s["postings"], s["skills"]["sql"]) == (2, [2, 0, 0])


def test_every_family_the_profiler_can_assign_is_counted():
    # The pool query filters by family; one missing here would vanish from the record.
    # "other" is classify_family's default, not a pattern of its own.
    from src.matching.roles import _FAMILIES
    assert set(snapshot.ALL_FAMILIES) == {name for name, _ in _FAMILIES} | {"other"}


class Ingestion:
    enabled = True

    def __init__(self, calls=None):
        self.calls = calls if calls is not None else []

    def persist_source(self, run_at, source, listed, recent, error=None, closes=False):
        return {"ok": listed is not None, "stored": len(recent), "whole": False, "closed": 0}

    def refresh_profiles(self, ids=None):
        self.calls.append("profile")
        return 1


def _quiet(monkeypatch):
    """No database: the wake up, the retired check and the publication are stubbed."""
    monkeypatch.setattr(daily, "wake", lambda: None)
    monkeypatch.setattr(daily, "retire", lambda run_at: None)
    monkeypatch.setattr(daily.publish, "run", lambda: None)


def test_daily_run_takes_the_snapshot_after_profiling(monkeypatch):
    calls = []
    _quiet(monkeypatch)
    monkeypatch.setattr(daily, "fetch_all", lambda: [("a", [_job()], None)])
    monkeypatch.setattr(daily, "JobIngestionService", lambda: Ingestion(calls))
    monkeypatch.setattr(daily.snapshot, "take", lambda: calls.append("snapshot") or 3)
    assert daily.main() == 0
    assert calls == ["profile", "snapshot"]


def test_a_failed_snapshot_does_not_fail_the_refresh(monkeypatch):
    def broken():
        raise RuntimeError("database went away")

    _quiet(monkeypatch)
    monkeypatch.setattr(daily, "fetch_all", lambda: [("a", [_job()], None)])
    monkeypatch.setattr(daily, "JobIngestionService", Ingestion)
    monkeypatch.setattr(daily.snapshot, "take", broken)
    assert daily.main() == 0


def _job():
    from datetime import datetime, timezone
    from src.Agent.utils.types import Job
    return Job(provider="test", external_id="1", title="Analyst", posted_at_utc=datetime.now(timezone.utc).isoformat())
