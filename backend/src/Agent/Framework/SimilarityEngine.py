from sentence_transformers.util import cos_sim
from collections import Counter

from src.Agent.utils.location import location_fit, location_tier


# similarity engine -> asks the question, how similar is the users cv to each of these jobs
class SimilarityEngine:
    def __init__(self):
        # Without preferences, location is an embedding similarity between two
        # place strings, which cannot tell "Remote (USA only)" from "Remote,
        # worldwide". It stays as the fallback only.
        self.weights = {
            "title": 0.30,
            "skills": 0.50,
            "experience": 0.10,
            "location": 0.10
        }
        # With preferences, location is whether the user can actually hold the
        # job and how much they want that arrangement, so it carries more weight.
        self.tier_weights = {
            "title": 0.25,
            "skills": 0.45,
            "experience": 0.10,
            "location": 0.20
        }

    def calculate(self, user_embs, job_embs, jobs, location_prefs=None):
        title_scores = cos_sim(user_embs["title"], job_embs["title"])
        skill_scores = cos_sim(user_embs["skills"],job_embs["skills"])
        experience_scores = cos_sim(user_embs["experience"], job_embs["experience"])

        if location_prefs is None:
            weights = self.weights
            location_scores = cos_sim(user_embs["location"], job_embs["location"])[0].tolist()
            tiers = [None] * len(jobs)
        else:
            weights = self.tier_weights
            tiers = [location_tier(processed.job, location_prefs) for processed in jobs]
            location_scores = [location_fit(tier, location_prefs) for tier in tiers]

        results = []

        for i, job in enumerate(jobs):
            title, skills = float(title_scores[0][i]), float(skill_scores[0][i])
            experience, location = float(experience_scores[0][i]), float(location_scores[i])
            results.append({
                "job": job,
                "title_score": title,
                "skills_score": skills,
                "experience_score": experience,
                "location_score": location,
                "location_tier": tiers[i],
                "overall_score": (weights["title"] * title + weights["skills"] * skills
                                  + weights["experience"] * experience + weights["location"] * location),
            })

        # A job the user cannot legally hold never outranks one they can, however
        # similar it is. It stays in the list, after every eligible job.
        results.sort(
            key=lambda x: (x["location_tier"] != "ineligible", x["overall_score"]),
            reverse=True
        )

        return results


class MarketAnalyzer:
    def calculate_skill_frequency(self, jobs):
        """
        Calculate how frequently each skill appears across jobs.
        Returns:
            [
                {
                    "skill": "python",
                    "job_count": 320,
                    "frequency": 0.64
                },
                ...
            ]
        """
        if not jobs:

            return []

        skill_counts = Counter()
        # Counting is case-insensitive, but the canonical spelling the skill
        # extractor produced ("React.js", not "react.js") is what gets
        # displayed, so keep the first one seen for each key.
        display_names = {}
        for job in jobs:
            # Use a set so a skill appearing twice in one job
            # only counts once for that job.
            unique_skills = {
                skill.strip().lower(): skill.strip()
                for skill in job.skills
                if skill and skill.strip()
            }
            for skill, display in unique_skills.items():
                skill_counts[skill] += 1
                display_names.setdefault(skill, display)
        total_jobs = len(jobs)
        results = [
            {
                "skill": display_names.get(skill, skill),
                "job_count": count,
                "frequency": count / total_jobs
            }

            for skill, count in skill_counts.items()
        ]

        results.sort(
            key=lambda x: x["frequency"],
            reverse=True
        )

        return results

    def get_top_skills(self, jobs, top_k=20):
        """
        Return the most prevalent skills in the market.
        """

        frequency = self.calculate_skill_frequency(jobs)
        return frequency[:top_k]

    def get_skill_gaps(self, user_skills, jobs):
        """
        Find commonly requested market skills that the user
        does not currently have.
        Returns the market statistics for those missing skills.
        """
        market_skills = self.calculate_skill_frequency(jobs)
        user_skills_normalized = {
            skill.strip().lower()
            for skill in user_skills
            if skill and skill.strip()
        }

        gaps = [
            skill
            for skill in market_skills
            if skill["skill"].lower() not in user_skills_normalized
        ]

        return gaps

    def get_user_skill_market_presence(self, user_skills, jobs):

        """
        Determine how prevalent each of the user's skills is
        in the analyzed job market.
        """

        market_skills = self.calculate_skill_frequency(jobs)
        user_skills_normalized = {
            skill.strip().lower()
            for skill in user_skills
            if skill and skill.strip()
        }

        user_market_skills = [
            skill
            for skill in market_skills
            if skill["skill"].lower() in user_skills_normalized
        ]
        return user_market_skills

    def calculate_skill_coverage(self, user_skills, jobs, top_k=20):
        """
        Calculate how many of the top market skills the user already has.
        Example:

        Top 20 market skills
        User has 8 of them
        coverage = 8 / 20 = 0.40
        """

        top_skills = self.get_top_skills(jobs, top_k)
        if not top_skills:
            return {
                "covered": 0,
                "total": 0,
                "coverage": 0.0
            }

        user_skills_normalized = {
            skill.strip().lower()
            for skill in user_skills
            if skill and skill.strip()
        }

        covered = sum(
            1
            for skill in top_skills
            if skill["skill"].lower() in user_skills_normalized
        )

        total = len(top_skills)

        return {
            "covered": covered,
            "total": total,
            "coverage": covered / total
        }

    def analyze(self, user_skills, jobs):
        return {
            "jobs_analyzed": len(jobs),
            "top_skills": self.get_top_skills(jobs),
            "skill_gaps": self.get_skill_gaps(user_skills, jobs),
            "user_skill_presence": self.get_user_skill_market_presence(
                user_skills,
                jobs
            ),
            "skill_coverage": self.calculate_skill_coverage(
                user_skills,
                jobs
            )
        }







