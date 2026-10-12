"""
MiniLM runs on ONNX Runtime, without torch (embedder.py, GitHub issue #4). Offline:
the model files are read from the Hugging Face cache, baked into the image.

Torch was most of the image every scale-from-zero pulled, and most of the
analysis stack's start: about 7 s on a laptop, under 1 s without it.
"""
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from src.Agent.utils import embedder
from src.Agent.utils.types import ParsedQuery

BACKEND = Path(__file__).resolve().parents[1]


def _model_cached(names=embedder.MODEL_FILES) -> bool:
    try:
        for name in names:
            embedder.model_file(name)
        return True
    except Exception:
        return False


needs_model = pytest.mark.skipif(not _model_cached(), reason="MiniLM isn't in the Hugging Face cache (the image bakes it)")


@needs_model
def test_the_analysis_stack_loads_without_torch():
    # A fresh interpreter: another test may have imported torch already.
    probe = "import sys; from src.Agent.Framework.JobRadarAgent import job_radar_agent; print('torch' in sys.modules)"
    env = {**os.environ, "HF_HUB_OFFLINE": "1", "DATABASE_URL": ""}
    done = subprocess.run([sys.executable, "-c", probe], cwd=BACKEND, env=env, capture_output=True, text=True, timeout=120)
    assert done.returncode == 0, done.stderr[-2000:]
    assert done.stdout.strip().splitlines()[-1] == "False"


@needs_model
def test_the_vectors_are_the_ones_sentence_transformers_gave():
    # Recorded from sentence-transformers 5.7 (torch) on 2026-10-12 for the same
    # profile and titles: the market filter keeps the same jobs it kept before.
    query = ParsedQuery(primary_role="Software Engineer", secondary_roles=["Backend Developer"],
                        skills=["Python", "Django", "PostgreSQL", "Docker"])
    titles = ["Senior Software Engineer", "Backend Developer (Python)", "Copywriter", "Registered Nurse",
              "Data Engineer - Spark"]
    scores = embedder.SentenceEmbedder().role_relevance(query, [SimpleNamespace(title=t) for t in titles])
    assert scores == pytest.approx([0.21314, 0.56622, -0.03753, 0.04402, 0.29511], abs=1e-4)
