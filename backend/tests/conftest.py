import os

import pytest


@pytest.fixture(autouse=True)
def reset_scan_rate_limit():
    """Each test gets a fresh in-memory scan limiter; the production limiter stays enabled."""
    from src.api import rate_limit

    rate_limit.scans.reset()
    yield
    rate_limit.scans.reset()


# Importing the agent builds its Groq client, which refuses to start without a
# key. No test calls the LLM, so CI (which has no .env) gets a placeholder.
os.environ.setdefault("GROQ_API_KEY", "not-used-by-tests")
# main.py reads the token secret at import. Tests that need the real one (the
# database-backed API tests) load .env first; everything else signs with this.
os.environ.setdefault("API_JWT_SECRET", "test-only-secret-not-used-anywhere-else")
# A publication refreshes the live site when this is set (refresh_site.py). Set empty
# so neither the shell nor a local .env can point a test run at production.
os.environ["REVALIDATE_SECRET"] = ""
