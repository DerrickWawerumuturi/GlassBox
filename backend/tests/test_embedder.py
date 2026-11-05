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
import numpy as np

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


def test_batches_keep_every_input_in_order_without_large_onnx_calls():
    model = embedder.MiniLM.__new__(embedder.MiniLM)
    batches = []

    def encode_batch(texts):
        batches.append(texts)
        return np.array([[int(text), 1] for text in texts], dtype=np.float32)

    model._encode_batch = encode_batch
    texts = [str(i) for i in range(5003)]
    vectors = model.encode(texts)
    assert [text for batch in batches for text in batch] == texts
    assert max(map(len, batches)) == embedder.EMBEDDING_BATCH_SIZE
    np.testing.assert_array_equal(vectors[:, 0], np.arange(len(texts)))
    assert len(batches) == 157


def test_failed_batch_raises_instead_of_returning_partial_results(monkeypatch):
    monkeypatch.setattr(embedder, "EMBEDDING_BATCH_SIZE", 2)
    model = embedder.MiniLM.__new__(embedder.MiniLM)
    calls = []

    def encode_batch(texts):
        calls.append(texts)
        if len(calls) == 2:
            raise RuntimeError("synthetic inference failure")
        return np.ones((len(texts), 3))

    model._encode_batch = encode_batch
    with pytest.raises(RuntimeError, match="synthetic inference failure"):
        model.encode(["a", "b", "c", "d", "e"])
    assert calls == [["a", "b"], ["c", "d"]]


@needs_model
def test_batched_vectors_cosines_and_filter_agree_with_single_batch(monkeypatch):
    model = embedder.MiniLM()
    query = ParsedQuery(primary_role="Backend Engineer", skills=["Python", "PostgreSQL"])
    titles = ["Backend Developer", "Registered Nurse", "Python Software Engineer",
              "Senior Frontend Developer", "Machine Learning Engineer", "Copywriter",
              "Data Engineer", "Platform Engineer", "Full Stack Developer"]
    texts = [embedder.profile_text(query), *titles]
    expected = model._encode_batch(texts)
    monkeypatch.setattr(embedder, "EMBEDDING_BATCH_SIZE", 3)
    actual = model.encode(texts)
    np.testing.assert_allclose(actual, expected, atol=1e-5, rtol=1e-4)
    np.testing.assert_allclose(np.linalg.norm(actual, axis=1), 1, atol=1e-6)
    scores = expected[1:] @ expected[0]
    reader = embedder.SentenceEmbedder.__new__(embedder.SentenceEmbedder)
    reader.model = model
    jobs = [SimpleNamespace(title=t) for t in titles]
    assert reader.role_relevance(query, jobs) == pytest.approx(scores.tolist(), abs=1e-5)
    kept, dropped = reader.filter_by_role(query, jobs)
    assert kept == [job for job, score in zip(jobs, scores) if score >= max(scores) * embedder.RELEVANCE_ALPHA]
    assert [job for job, _ in dropped] == [job for job in jobs if job not in kept]
