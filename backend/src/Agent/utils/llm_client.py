"""
Free text in, one of JobRadar's models out, via a Groq JSON call.

    GroqModel("user").parse(cv_text) -> ParsedQuery   what to search for
    GroqModel("cv").parse(cv_text)   -> CVQuery       the CV as structured data

Both calls share one short system prompt; the user prompt spells out the JSON
shape, and the reply is validated against the model, so a malformed reply fails
here, loudly. Appending the full JSON schema to the system prompt was tried on
2026-09-15 and made parsing less stable (experience_level flipped Mid/Senior on
one CV, plus a JSON validation failure) for ~600 more tokens per call.
"""
import os

from dotenv import find_dotenv, load_dotenv
from groq import Groq
from pydantic import ValidationError

from src.Agent.utils.prompts import ONBOARDING_PROMPT, SYSTEM, USER_PROMPT, build_prompt
from src.Agent.utils.types import CVQuery, ParsedQuery
from src.Agent.utils.versions import PARSER_VERSION  # noqa: F401  defined there so light modules skip groq

load_dotenv(find_dotenv())

REASONING_EFFORT = os.getenv("JOBRADAR_GROQ_REASONING_EFFORT", "medium")
MAX_COMPLETION_TOKENS = int(os.getenv("JOBRADAR_GROQ_MAX_COMPLETION_TOKENS", "4096"))
FALLBACK_REASONING_EFFORT = "low"
FALLBACK_MAX_COMPLETION_TOKENS = 2048

# kind -> (user prompt, its placeholder, result model)
KINDS = {
    "user": (USER_PROMPT, "query", ParsedQuery),
    "cv": (ONBOARDING_PROMPT, "cv", CVQuery),
}


def _should_downgrade(err) -> bool:
    """True for failures that a cheaper reasoning effort can survive."""
    status = getattr(err, "status_code", None)
    return status == 413 or (status == 400 and "json_validate_failed" in str(err))


class GroqModel:
    def __init__(self, kind: str):
        self.kind = kind
        self.prompt_template, self.placeholder, self.result_model = KINDS[kind]
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = os.getenv("GROQ_MODEL_NAME")

    def parse(self, text: str):
        user_prompt = build_prompt(self.prompt_template, **{self.placeholder: text})
        reply = self._generate_with_retry(user_prompt)
        try:
            return self.result_model.model_validate_json(reply)
        except ValidationError as err:
            raise ValueError(f"LLM reply is not a valid {self.result_model.__name__}: {err}") from err

    def _complete(self, user_prompt, effort, max_tokens):
        return self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0,
            reasoning_effort=effort,
            max_completion_tokens=max_tokens,
        )

    def _generate_with_retry(self, user_prompt):
        try:
            res = self._complete(user_prompt, REASONING_EFFORT, MAX_COMPLETION_TOKENS)
        except Exception as err:
            if not _should_downgrade(err):
                print(f"LLM error ({self.kind}): {err}")
                raise
            print(f"LLM retrying at {FALLBACK_REASONING_EFFORT} reasoning effort: {err}")
            res = self._complete(user_prompt, FALLBACK_REASONING_EFFORT, FALLBACK_MAX_COMPLETION_TOKENS)
        return res.choices[0].message.content
