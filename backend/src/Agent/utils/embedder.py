"""
MiniLM, for one job: deciding which retrieved postings belong to this user's
market before skill extraction, so an analysis' market statistics are not
skewed by off-market postings. Matching a job to the user is src/matching —
fit, not text similarity — and no longer uses embeddings. See
decisions/embeddings.md.

The model runs on ONNX Runtime, not torch: the same weights, exported by the
model's authors (onnx/model.onnx in the same repository), with the same
tokenizer, mean pooling and normalisation sentence-transformers applies. Torch
was most of a 1 GB image that every scale-from-zero pulls (decisions/deployment.md,
GitHub issue #4); the vectors agree to about 1e-6.
"""
import os

import numpy as np

from src.Agent.utils.types import ParsedQuery

MODEL_REPO = "sentence-transformers/all-MiniLM-L6-v2"
# Pinned: the Dockerfile bakes these files into the image and the API reads them offline.
MODEL_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
MODEL_FILES = ("onnx/model.onnx", "tokenizer.json")
# sentence-transformers' max_seq_length for this model (sentence_bert_config.json).
MAX_TOKENS = 256

# Fraction of the best-matching title's score a posting must reach to be counted
# as part of this user's market. Relative rather than absolute because the
# absolute numbers are not portable: measured, 0.21 was the right cut for a
# software-engineer profile and dropped genuine "Senior Software Engineer"
# postings for a machine-learning one, since the profile string changes the
# scale of every cosine in the batch.
RELEVANCE_ALPHA = float(os.getenv("JOBRADAR_RELEVANCE_ALPHA", "0.30"))


def profile_text(query: ParsedQuery) -> str:
    """
    Role plus skills, which separates far better than the role alone.

    Measured over a real corpus: role-only scored "Business Development
    Representative" above "Senior Software Developer". Adding the description
    to the job side made it worse still — postings share so much generic
    corporate prose that everything drifts together.
    """
    parts = [query.primary_role or ""]
    parts += list(query.secondary_roles or [])
    parts += list(query.skills or [])
    return " ".join(part for part in parts if part).strip()


def model_file(name: str) -> str:
    """A model file from the Hugging Face cache (HF_HOME); offline in the image, where it was baked in."""
    from huggingface_hub import hf_hub_download
    return hf_hub_download(MODEL_REPO, name, revision=MODEL_REVISION)


class MiniLM:
    """all-MiniLM-L6-v2 as sentence-transformers runs it: tokens, the model, mean pooling, unit length."""

    def __init__(self):
        import onnxruntime
        from tokenizers import Tokenizer

        self.tokenizer = Tokenizer.from_file(model_file("tokenizer.json"))
        self.tokenizer.enable_truncation(MAX_TOKENS)
        self.tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")  # to the longest in the batch
        self.session = onnxruntime.InferenceSession(model_file("onnx/model.onnx"),
                                                    providers=["CPUExecutionProvider"])

    def encode(self, texts: list[str]) -> np.ndarray:
        encoded = self.tokenizer.encode_batch(texts)
        ids = np.array([e.ids for e in encoded], dtype=np.int64)
        mask = np.array([e.attention_mask for e in encoded], dtype=np.int64)
        types = np.array([e.type_ids for e in encoded], dtype=np.int64)
        hidden = self.session.run(["last_hidden_state"],
                                  {"input_ids": ids, "attention_mask": mask, "token_type_ids": types})[0]
        weights = mask[..., None].astype(hidden.dtype)
        pooled = (hidden * weights).sum(axis=1) / np.clip(weights.sum(axis=1), 1e-9, None)
        return pooled / np.clip(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-12, None)


class SentenceEmbedder:
    def __init__(self):
        self.model = MiniLM()

    def role_relevance(self, query: ParsedQuery, jobs: list) -> list:
        """Cosine of the user's profile against each job title."""
        profile = profile_text(query)
        if not profile or not jobs:
            return [1.0] * len(jobs)

        titles = [getattr(job, "title", "") or "" for job in jobs]
        vectors = self.model.encode([profile, *titles])  # unit length, so the dot product is the cosine
        return (vectors[1:] @ vectors[0]).tolist()

    def filter_by_role(
        self,
        query: ParsedQuery,
        jobs: list,
        alpha: float = RELEVANCE_ALPHA,
        min_keep: int = 0,
    ):
        """
        Drop postings that are not this user's market.

        MarketAnalyzer weights every posting equally, so a copywriter vacancy in
        the corpus is not merely noise in the ranked list — its skills become
        market demand. Running before skill extraction also means the dropped
        postings are never paid for, since extraction is the expensive stage.
        """
        if not jobs:
            return [], []

        scores = self.role_relevance(query, jobs)
        best = max(scores)
        if best <= 0:
            return jobs, []

        ranked = sorted(range(len(jobs)), key=lambda i: scores[i], reverse=True)
        threshold = alpha * best
        keep = {i for i in ranked if scores[i] >= threshold}

        # Filtering must not undo the minimum-jobs floor the search just worked
        # to satisfy; below it the market statistics stop meaning anything.
        for index in ranked:
            if len(keep) >= min_keep:
                break
            keep.add(index)

        kept = [job for i, job in enumerate(jobs) if i in keep]
        dropped = [(jobs[i], scores[i]) for i in range(len(jobs)) if i not in keep]
        return kept, dropped
