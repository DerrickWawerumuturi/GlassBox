import os

# Importing the agent builds its Groq client, which refuses to start without a
# key. No test calls the LLM, so CI (which has no .env) gets a placeholder.
os.environ.setdefault("GROQ_API_KEY", "not-used-by-tests")
# main.py reads the token secret at import. Tests that need the real one (the
# database-backed API tests) load .env first; everything else signs with this.
os.environ.setdefault("API_JWT_SECRET", "test-only-secret-not-used-anywhere-else")
