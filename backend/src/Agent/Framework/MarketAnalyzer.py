"""
What the market asks for, across every job an analysis retrieved: skill
frequency, the user's gaps, their presence and coverage. See
decisions/market-analyzer.md. How well each job fits the user is not here — that
is src/matching.
"""
from collections import Counter


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
