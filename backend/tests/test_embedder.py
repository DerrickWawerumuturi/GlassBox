"""
MiniLM runs on ONNX Runtime, without torch (embedder.py, GitHub issue #4). Offline:
the model files are read from the Hugging Face cache, baked into the image.

Torch was most of the image every scale-from-zero pulled, and most of the
analysis stack's start: about 7 s on a laptop, under 1 s without it.
"""
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
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
    reader = embedder.SentenceEmbedder(model=model)
    jobs = [SimpleNamespace(title=t) for t in titles]
    assert reader.role_relevance(query, jobs) == pytest.approx(scores.tolist(), abs=1e-5)
    kept, dropped = reader.filter_by_role(query, jobs)
    assert kept == [job for job, score in zip(jobs, scores) if score >= max(scores) * embedder.RELEVANCE_ALPHA]
    assert [job for job, _ in dropped] == [job for job in jobs if job not in kept]


class RecordingModel:
    def __init__(self):
        self.calls = []

    @staticmethod
    def vectors(texts):
        values = np.array([[len(t) + 1, sum(map(ord, t)) % 97 + 1, 7] for t in texts], dtype=np.float32)
        return values / np.linalg.norm(values, axis=1, keepdims=True)

    def encode(self, texts):
        self.calls.append(list(texts))
        return self.vectors(texts)


def test_title_reuse_preserves_duplicates_order_and_does_not_cache_cv_profiles():
    model = RecordingModel()
    reader = embedder.SentenceEmbedder(model=model)
    jobs = [SimpleNamespace(title=t) for t in ["Backend Engineer", "Platform Engineer", "Backend Engineer"]]
    queries = [ParsedQuery(primary_role="Software Engineer", skills=[skill]) for skill in ["Python", "Go"]]
    for query in queries:
        vectors = model.vectors([embedder.profile_text(query), *[j.title for j in jobs]])
        assert reader.role_relevance(query, jobs) == pytest.approx((vectors[1:] @ vectors[0]).tolist(), abs=1e-6)
    assert model.calls == [[embedder.profile_text(queries[0])], ["Backend Engineer", "Platform Engineer"],
                           [embedder.profile_text(queries[1])]]
    assert set(reader._titles) == {j.title for j in jobs}
    assert all(vector.base is None for vector in reader._titles.values())


def test_title_cache_eviction_and_long_titles_never_drop_jobs(monkeypatch):
    monkeypatch.setattr(embedder, "TITLE_CACHE_SIZE", 2)
    model = RecordingModel()
    reader = embedder.SentenceEmbedder(model=model)
    long = "x" * (embedder.MAX_CACHED_TITLE_CHARS + 1)
    titles = ["A", "B", "C", long, "A"]
    query = ParsedQuery(primary_role="Software Engineer")
    jobs = [SimpleNamespace(title=t) for t in titles]
    for _ in range(2):
        vectors = model.vectors([embedder.profile_text(query), *titles])
        assert reader.role_relevance(query, jobs) == pytest.approx((vectors[1:] @ vectors[0]).tolist(), abs=1e-6)
        assert len(reader._titles) <= 2
        assert long not in reader._titles
    # Long titles are still encoded on both requests, rather than retained without a size bound.
    assert sum(long in batch for batch in model.calls) == 2


def test_title_cache_failure_returns_no_partial_scores_and_can_recover():
    model = RecordingModel()
    original = model.encode
    broken = True

    def encode(texts):
        if broken and texts == ["Backend Engineer"]:
            raise RuntimeError("synthetic inference failure")
        return original(texts)

    model.encode = encode
    reader = embedder.SentenceEmbedder(model=model)
    query = ParsedQuery(primary_role="Software Engineer")
    jobs = [SimpleNamespace(title="Backend Engineer")]
    with pytest.raises(RuntimeError, match="synthetic inference failure"):
        reader.role_relevance(query, jobs)
    assert not reader._titles
    broken = False
    assert len(reader.role_relevance(query, jobs)) == 1


def test_concurrent_profiles_share_only_job_title_vectors():
    model = RecordingModel()
    reader = embedder.SentenceEmbedder(model=model)
    barrier = Barrier(2)
    jobs = [SimpleNamespace(title="Backend Engineer")]
    queries = [ParsedQuery(primary_role="Software Engineer", skills=[s]) for s in ["Python", "Go"]]

    def run(query):
        barrier.wait(timeout=3)
        return reader.role_relevance(query, jobs)

    with ThreadPoolExecutor(max_workers=2) as pool:
        scores = list(pool.map(run, queries))
    for query, actual in zip(queries, scores):
        vectors = model.vectors([embedder.profile_text(query), jobs[0].title])
        assert actual == pytest.approx([float(vectors[1] @ vectors[0])], abs=1e-6)
    assert model.calls.count(["Backend Engineer"]) == 1
    assert set(reader._titles) == {"Backend Engineer"}


def test_pool_larger_than_cache_still_scores_every_job_with_bounded_batches():
    recorded = RecordingModel()
    model = embedder.MiniLM.__new__(embedder.MiniLM)
    model._encode_batch = recorded.encode
    reader = embedder.SentenceEmbedder(model=model)
    query = ParsedQuery(primary_role="Software Engineer")
    jobs = [SimpleNamespace(title=f"Backend Engineer {i}") for i in range(5003)]
    for ordered in (jobs, list(reversed(jobs))):
        vectors = recorded.vectors([embedder.profile_text(query), *[j.title for j in ordered]])
        actual = reader.role_relevance(query, ordered)
        assert len(actual) == len(ordered)
        assert actual == pytest.approx((vectors[1:] @ vectors[0]).tolist(), abs=1e-6)
        assert len(reader._titles) == embedder.TITLE_CACHE_SIZE
        assert all(v.base is None for v in reader._titles.values())
    assert max(map(len, recorded.calls)) <= embedder.EMBEDDING_BATCH_SIZE
