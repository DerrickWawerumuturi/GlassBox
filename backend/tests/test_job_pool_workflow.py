"""
The collector runs inside the image the API runs. Offline.

Until 2026-10-08 .github/workflows/job-pool.yml installed a hand-picked list of
packages instead of the app's. On 6 and 7 Oct 2026 a new import (groq) wasn't
on it and both runs died on import. Now the workflow pulls the image deploy.yml
tagged :live after the container app took it, so the collector has the API's
code, dependencies and PROFILER_VERSION, and the two never run at once.
"""
import os
import re
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
WORKFLOWS = BACKEND.parent / ".github" / "workflows"
POOL = (WORKFLOWS / "job-pool.yml").read_text()
DEPLOY = (WORKFLOWS / "deploy.yml").read_text()
LIVE = "jobradarregistry.azurecr.io/jobradar:live"


def test_the_collector_runs_the_deployed_image_every_six_hours():
    assert f"docker pull {LIVE}" in POOL
    assert re.search(rf"docker run --rm -e DATABASE_URL {re.escape(LIVE)} python -m src\.jobpool\.daily\n", POOL)
    assert "pip install" not in POOL                                  # no second dependency list to drift
    assert re.search(r'cron: "\d+ \*/6 \* \* \*"', POOL)


def test_deploy_moves_live_only_after_the_container_app_runs_the_new_image():
    update, tag = DEPLOY.index("az containerapp update"), DEPLOY.index(f"docker push {LIVE}")
    assert update < tag
    assert f'docker tag "$IMAGE" {LIVE}' in DEPLOY


def test_a_deploy_and_a_collection_never_run_at_once():
    group = re.compile(r"concurrency:\s*\n\s*group: pool-and-deploy\s*\n\s*cancel-in-progress: false")
    assert group.search(POOL) and group.search(DEPLOY)


def test_the_entry_points_start_with_only_the_database_url():
    # `docker run -e DATABASE_URL` passes nothing else: no Groq key, no token secret. Set
    # empty rather than unset, so a local .env can't fill them in (dotenv never overrides).
    env = {**os.environ, "DATABASE_URL": "", "DATABASE_URL_DIRECT": "", "GROQ_API_KEY": "", "API_JWT_SECRET": ""}
    code = "import src.jobpool.daily, src.jobpool.publish\n"
    done = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, env=env, capture_output=True, text=True)
    assert done.returncode == 0, done.stderr[-2000:]
