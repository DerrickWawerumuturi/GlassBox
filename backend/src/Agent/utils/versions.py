"""
Version stamps that light modules need without the LLM stack.

Kept apart from llm_client.py on purpose: the daily job pool imports
services/users.py (through snapshot and opportunities), and the job-pool
workflow installs only the fetcher's dependencies. Importing llm_client there
pulls in `groq`, which that workflow doesn't install, and the run dies before
it fetches anything (6 and 7 Oct 2026). Nothing here may import a package.
"""

# Stored with every kept CV profile (latest_cvs). Bump it when USER_PROMPT or
# ParsedQuery changes what a parse returns: a profile from an older version is
# then refused for reuse, and the user uploads their CV again.
PARSER_VERSION = "query-v1"
