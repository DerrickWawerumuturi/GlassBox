import hashlib
import json
import re
from urllib.parse import urlsplit, urlunsplit

from src.database.models.job import JobIdentity

_WHITESPACE = re.compile(r"\s+")


def _squash(value: str | None) -> str:
    return _WHITESPACE.sub(" ", (value or "").strip()).lower()


def _canonical_url(url: str | None) -> str:
    """Scheme, host and path only. Providers vary tracking parameters per call."""
    if not url:
        return ""
    parts = urlsplit(url.strip())
    return urlunsplit((
        parts.scheme.lower(),
        parts.netloc.lower(),
        parts.path.rstrip("/"),
        "",
        "",
    )).lower()


def job_fingerprint(
    provider: str,
    title: str | None,
    company: str | None,
    location: str | None,
    url: str | None,
) -> str:
    """
    Stable identity for a posting that carries no usable provider id.

    Description is deliberately excluded: providers reflow whitespace and
    truncate it differently between calls, so including it would produce a new
    identity for the same posting.
    """
    payload = "|".join([
        provider,
        _squash(company),
        _squash(title),
        _squash(location),
        _canonical_url(url),
    ])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def payload_hash(raw: dict | None) -> str:
    return hashlib.sha256(
        json.dumps(raw or {}, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()


def resolve_identity(job) -> tuple[JobIdentity, str, str]:
    """
    The (provider, external_id) pair a posting is stored under.

    Deterministic and side-effect free so skill persistence can recompute the
    same key later without the job carrying resolution state around.
    """
    provider = job.provider or "unknown"
    fingerprint = job_fingerprint(
        provider, job.title, job.company, job.location, job.url
    )

    external_id = (job.external_id or "").strip()
    if external_id:
        return JobIdentity(provider, external_id), "provider", fingerprint

    return JobIdentity(provider, f"fp:{fingerprint[:32]}"), "fingerprint", fingerprint
