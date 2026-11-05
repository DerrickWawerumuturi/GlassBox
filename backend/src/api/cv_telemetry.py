"""Sanitized scan diagnostics shared by the request and its worker threads."""
import json
import logging
import time
from contextlib import contextmanager
from contextvars import ContextVar
from pathlib import Path


logger = logging.getLogger("glassbox.cv")
logger.setLevel(logging.INFO)
# Uvicorn configures its own loggers, not the application's root logger.
if not logger.hasHandlers():
    logger.addHandler(logging.StreamHandler())

scan_context = ContextVar("scan_context", default=None)
COUNTS = frozenset({"job_count", "input_count", "batch_count", "batch_size", "batch_index"})


def memory_metrics() -> dict:
    metrics = {}
    try:
        for line in Path("/proc/self/status").read_text().splitlines():
            key, _, value = line.partition(":")
            if key in {"VmRSS", "VmHWM"}:
                metrics["rss_bytes" if key == "VmRSS" else "peak_rss_bytes"] = int(value.split()[0]) * 1024
    except (OSError, ValueError):
        pass
    for name, key in (("memory.current", "cgroup_memory_bytes"),
                      ("memory.peak", "cgroup_peak_bytes"), ("memory.max", "cgroup_limit_bytes")):
        try:
            value = Path("/sys/fs/cgroup", name).read_text().strip()
            if value != "max":
                metrics[key] = int(value)
        except (OSError, ValueError):
            pass
    try:
        for line in Path("/sys/fs/cgroup/memory.events").read_text().splitlines():
            key, value = line.split()
            if key in {"oom", "oom_kill"}:
                metrics["cgroup_" + key] = int(value)
    except (OSError, ValueError):
        pass
    return metrics


def emit(stage, outcome, started, *, context=None, error=None, status_code=None, **counts):
    """Only fixed metadata, numeric counts and exception type; logging is best effort."""
    context = context or scan_context.get()
    if context is None:
        return
    try:
        request_id, endpoint = context
        entry = dict(event="cv_pipeline", request_id=request_id, endpoint=endpoint,
                     stage=stage, outcome=outcome,
                     duration_ms=round((time.perf_counter() - started) * 1000))
        entry.update(memory_metrics())
        entry.update({k: v for k, v in counts.items() if k in COUNTS and isinstance(v, int)})
        if status_code is not None:
            entry["status_code"] = status_code
        if error is not None:
            entry["error_type"] = type(error).__name__
            provider_status = getattr(error, "status_code", None)
            if isinstance(provider_status, int):
                entry["provider_status"] = provider_status
        logger.log(logging.ERROR if outcome == "failure" else logging.INFO,
                   json.dumps(entry, sort_keys=True))
    except Exception:
        # Diagnostics must never turn a successful scan into a failed request.
        pass


@contextmanager
def stage(name, **counts):
    started = time.perf_counter()
    emit(name, "start", started, **counts)
    try:
        yield
    except Exception as error:
        emit(name, "failure", started, error=error, **counts)
        raise
    else:
        emit(name, "success", started, **counts)
