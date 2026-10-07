"""
The daily job pool must start with only the fetcher's dependencies. Offline.

.github/workflows/job-pool.yml installs a short list instead of requirements.txt
(no ML stack for a job that makes HTTP calls). On 6 and 7 Oct 2026 the run died
on import: services/users.py had started importing llm_client, which imports
groq. This imports the job in a fresh interpreter with every other requirement
blocked, the way the workflow's runner sees it.
"""
import os
import re
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]

# What job-pool.yml's "Install fetcher dependencies" step installs. Keep in step with it.
WORKFLOW_INSTALLS = {"psycopg", "psycopg-pool", "pydantic", "python-dotenv", "requests", "pycountry"}

# Distribution name -> the module it is imported as, where they differ.
IMPORT_NAMES = {"python-multipart": "multipart", "pyjwt": "jwt", "ipython": "IPython",
                "python-dotenv": "dotenv", "psycopg-pool": "psycopg_pool", "pdf-inspector": "pdf_inspector",
                "sentence-transformers": "sentence_transformers", "xai-sdk": "xai_sdk"}


def blocked_modules() -> list[str]:
    names = []
    for line in (BACKEND / "requirements.txt").read_text().splitlines():
        dist = re.split(r"[\[<>=~ ]", line.strip(), maxsplit=1)[0].lower()
        if dist and not dist.startswith("#") and dist not in WORKFLOW_INSTALLS:
            names.append(IMPORT_NAMES.get(dist, dist.replace("-", "_")))
    return names


def test_the_daily_job_imports_without_packages_the_workflow_skips():
    blocked = blocked_modules()
    assert "groq" in blocked and "fastapi" in blocked  # the list really is the heavy ones
    # A None entry in sys.modules makes `import x` raise ImportError, as if x were not installed.
    code = ("import sys\n"
            f"for name in {blocked!r}: sys.modules[name] = None\n"
            "import src.jobpool.daily\n")
    env = {**os.environ, "DATABASE_URL": "", "DATABASE_URL_DIRECT": ""}
    done = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, env=env, capture_output=True, text=True)
    assert done.returncode == 0, done.stderr[-2000:]
