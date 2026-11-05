"""Diagnostics stay useful across worker handoffs without exposing scan inputs."""
import asyncio
import json
import logging
from pathlib import Path

import pytest
from fastapi.concurrency import run_in_threadpool

from src.api import cv_telemetry as telemetry


def test_worker_stage_carries_context_and_sanitizes_failure(caplog, monkeypatch):
    monkeypatch.setattr(telemetry, "memory_metrics", lambda: {"rss_bytes": 1234})

    def work():
        with telemetry.stage("embedding", batch_count=2, batch_size=32,
                             cv_text="PRIVATE_CONTENT", job_count=40):
            raise RuntimeError("PRIVATE_CONTENT")

    async def request():
        token = telemetry.scan_context.set(("a" * 32, "/analyze"))
        try:
            with pytest.raises(RuntimeError, match="PRIVATE_CONTENT"):
                await run_in_threadpool(work)
        finally:
            telemetry.scan_context.reset(token)

    with caplog.at_level(logging.INFO, logger="glassbox.cv"):
        asyncio.run(request())
    events = [json.loads(r.message) for r in caplog.records if r.name == "glassbox.cv"]
    assert [e["outcome"] for e in events] == ["start", "failure"]
    assert all(e["request_id"] == "a" * 32 and e["rss_bytes"] == 1234 for e in events)
    assert all(e["batch_size"] == 32 and e["batch_count"] == 2 and e["duration_ms"] >= 0 for e in events)
    assert events[-1]["error_type"] == "RuntimeError"
    assert "PRIVATE_CONTENT" not in caplog.text
    assert telemetry.scan_context.get() is None


def test_memory_metrics_are_optional(monkeypatch):
    def unavailable(_path):
        raise OSError("not available")
    monkeypatch.setattr(Path, "read_text", unavailable)
    assert telemetry.memory_metrics() == {}


def test_memory_metrics_read_only_allowlisted_numeric_fields(monkeypatch):
    files = {"/proc/self/status": "Name:\tPRIVATE\nVmRSS:\t12 kB\nVmHWM:\t20 kB\n",
             "/sys/fs/cgroup/memory.current": "1024", "/sys/fs/cgroup/memory.peak": "2048",
             "/sys/fs/cgroup/memory.max": "max",
             "/sys/fs/cgroup/memory.events": "low 0\nmax 2\noom 1\noom_kill 1\n"}
    monkeypatch.setattr(Path, "read_text", lambda path: files[str(path)])
    assert telemetry.memory_metrics() == dict(rss_bytes=12288, peak_rss_bytes=20480,
        cgroup_memory_bytes=1024, cgroup_peak_bytes=2048, cgroup_oom=1, cgroup_oom_kill=1)


def test_diagnostic_failure_does_not_fail_work(monkeypatch):
    def broken():
        raise RuntimeError("diagnostic unavailable")
    monkeypatch.setattr(telemetry, "memory_metrics", broken)
    token = telemetry.scan_context.set(("a" * 32, "/analyze"))
    try:
        with telemetry.stage("scoring"):
            result = 42
        assert result == 42
    finally:
        telemetry.scan_context.reset(token)
