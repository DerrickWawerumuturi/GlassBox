"""
MiniLM, for one job: deciding which retrieved postings belong to this user's
market before skill extraction, so an analysis' market statistics are not
skewed by off-market postings. Matching a job to the user is src/matching —
fit, not text similarity — and no longer uses embeddings. See
decisions/embeddings.md.
"""
import os

from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

from src.Agent.utils.types import ParsedQuery

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


class SentenceEmbedder:
    def __init__(self):
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    def role_relevance(self, query: ParsedQuery, jobs: list) -> list:
        """Cosine of the user's profile against each job title."""
        profile = profile_text(query)
        if not profile or not jobs:
            return [1.0] * len(jobs)

        titles = [getattr(job, "title", "") or "" for job in jobs]
        return cos_sim(self.model.encode(profile), self.model.encode(titles))[0].tolist()

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
