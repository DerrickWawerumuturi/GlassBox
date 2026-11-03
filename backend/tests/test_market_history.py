"""Monthly market history: average comparable daily snapshots, never sum them. Offline."""
from datetime import date

from src.jobpool.market_history import aggregate


def snapshot(day, version="requirements-v6", family="backend", postings=10, readable=10, skills=None):
    return {
        "taken_on": date.fromisoformat(day),
        "profiler_version": version,
        "family": family,
        "postings": postings,
        "readable": readable,
        "skills": skills or {},
    }


def test_repeated_daily_inventories_are_averaged_not_summed():
    result = aggregate([
        snapshot("2026-10-01", postings=10, readable=8),
        snapshot("2026-10-02", postings=14, readable=12),
    ], as_of=date(2026, 10, 31), months=1)
    row = result["series"][0]
    assert row["average_active_postings"] == 12
    assert row["average_readable_postings"] == 10
    assert row["snapshot_days"] == 2
    assert row["coverage_days"] == 31
    assert row["coverage_fraction"] == 0.0645
    assert row["first_snapshot"] == "2026-10-01"
    assert row["last_snapshot"] == "2026-10-02"


def test_missing_dates_are_not_interpolated_or_counted_as_observations():
    result = aggregate([
        snapshot("2026-10-01", postings=10),
        snapshot("2026-10-31", postings=20),
    ], as_of=date(2026, 10, 31), months=1)
    row = result["series"][0]
    assert row["snapshot_days"] == 2
    assert row["coverage_days"] == 31
    assert row["average_active_postings"] == 15


def test_skill_shares_use_each_days_readable_denominator_and_average_daily_shares():
    result = aggregate([
        snapshot("2026-10-01", readable=10, skills={"python": [5, 2, 0]}),
        snapshot("2026-10-02", readable=100, skills={}),
    ], as_of=date(2026, 10, 31), months=1)
    skill = result["series"][0]["skills"][0]
    # Mean of 50% and 0%, not pooled 5/110 = 4.55%.
    assert skill["required_share"] == 25
    assert skill["preferred_share"] == 10
    assert skill["mentioned_share"] == 0
    assert skill["sample_days"] == 2


def test_zero_readable_days_do_not_divide_by_zero_or_dilute_skill_shares():
    result = aggregate([
        snapshot("2026-10-01", readable=10, skills={"python": [5, 0, 0]}),
        snapshot("2026-10-02", postings=4, readable=0, skills={}),
    ], as_of=date(2026, 10, 31), months=1)
    row = result["series"][0]
    assert row["snapshot_days"] == 2
    assert row["skill_sample_days"] == 1
    assert row["skills"][0]["required_share"] == 50


def test_profiler_versions_are_never_combined_and_six_month_view_stays_gated():
    result = aggregate([
        snapshot("2026-10-01", version="requirements-v6", postings=10),
        snapshot("2026-10-02", version="requirements-v7", postings=100),
    ], as_of=date(2026, 10, 31), months=6)
    assert {(row["profiler_version"], row["average_active_postings"]) for row in result["series"]} == {
        ("requirements-v6", 10), ("requirements-v7", 100),
    }
    assert result["six_month_available"] is False


def test_six_month_availability_requires_six_months_from_one_version():
    rows = [
        snapshot(f"2026-{month:02d}-01", version="requirements-v6")
        for month in range(6, 12)
    ]
    result = aggregate(rows, as_of=date(2026, 11, 30), months=6)
    assert result["six_month_available"] is True


def test_out_of_range_snapshots_are_ignored():
    result = aggregate([
        snapshot("2026-05-31", postings=999),
        snapshot("2026-06-01", postings=10),
        snapshot("2026-11-03", postings=20),
    ], as_of=date(2026, 11, 3), months=6)
    assert [row["month"] for row in result["series"]] == ["2026-06", "2026-11"]


def test_invalid_month_window_is_rejected():
    import pytest
    with pytest.raises(ValueError):
        aggregate([], as_of=date(2026, 11, 3), months=7)


def test_six_month_gate_never_combines_versions_to_reach_six_months():
    rows = [
        snapshot(f"2026-{month:02d}-01", version="requirements-v6")
        for month in range(6, 9)
    ] + [
        snapshot(f"2026-{month:02d}-01", version="requirements-v7")
        for month in range(9, 12)
    ]
    result = aggregate(rows, as_of=date(2026, 11, 30), months=6)
    assert result["six_month_available"] is False
