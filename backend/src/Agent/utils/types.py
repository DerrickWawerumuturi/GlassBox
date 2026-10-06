from datetime import date, datetime
from typing import Literal

from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field, field_validator, model_validator
from dataclasses import field
from dataclasses import dataclass


class Position(BaseModel):
    """One job on the CV. Only its dates and role are read: years are counted from them."""
    role: str | None = None
    company: str | None = None
    start_date: str | None = None
    end_date: str | None = None


class ParsedQuery(BaseModel):
    primary_role: str | None = None
    secondary_roles: list[str] = Field(default_factory=list)
    # The Muse filters on its own category taxonomy, not on a job title. The
    # prompt has always asked for this; the field was missing here, so pydantic
    # dropped it and the provider was sent a role string that matched nothing.
    category: str | None = None
    skills: list[str] = Field(default_factory=list)
    # Dated positions, so matching counts professional years per track instead
    # of trusting the label below, which came back "Mid Level" for early-career CVs.
    experience: list[Position] = Field(default_factory=list)
    experience_level: str | None = None
    job_requirements: str | None = None
    education: str | None = None
    location: str | None = None
    # Asked for separately from `location` so the search has something a
    # provider will accept. Validated against ISO 3166-1 before it is used.
    country_code: str | None = None
    city: str | None = None
    remote: bool | None = None
    employment_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str | None = None
    industries: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    exclude_keywords: list[str] = Field(default_factory=list)
    company_preferences: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    notes: str | None = None
    # A kept profile (src/matching/kept_cv.py) has these instead of its
    # positions and education: what they told matching, derived when read.
    education_level: str | None = None
    derived: dict | None = None


class Job(BaseModel):
    id: str | None = None
    title: str | None = None
    company: str | None = None
    description: str | None = None
    salary: int | float | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    salary_period: str | None = None
    location: str | None = None
    remote: bool | None = None
    # Which regions a remote posting will actually hire from, as the provider
    # states it. "Remote" restricted to the USA is not remote for a user in
    # Nairobi, and roughly half of remote postings carry such a restriction.
    remote_eligibility: str | None = None
    experience_level: str | None = None
    employment_type: str | None = None
    url: str | None = None
    posted_at: str | None = None
    # The provider's own absolute publication time, where it offers one.
    # `posted_at` stays whatever the provider called it, which for JSearch is a
    # relative phrase ("2 days ago") that is not a timestamp.
    posted_at_utc: str | None = None

    # Persistence-only. Excluded from serialisation so the storage layer can
    # identify a posting and keep its source payload without widening the
    # /analyze response.
    # Our own jobs.id, attached after persistence so the dashboard can bookmark
    # a posting. None when persistence is disabled or the write failed.
    db_id: int | None = None

    provider: str | None = Field(default=None, exclude=True)
    external_id: str | None = Field(default=None, exclude=True)
    raw: dict | None = Field(default=None, exclude=True, repr=False)

    @field_validator("id", "external_id", mode="before")
    @classmethod
    def _coerce_identifier(cls, value):
        """
        The Muse returns integer job ids and pydantic 2 does not coerce int to
        str, so every Muse posting used to fail validation and get skipped.
        """
        if value is None or isinstance(value, str):
            return value
        return str(value)


@dataclass
class SearchQuery:
    """
    What the job providers search on, mapped field by field from a ParsedQuery.

    Build it with `from_parsed`. Location is read with getattr defaults further
    down, so a wrongly-shaped query does not fail — it silently searches with no
    location. The type check below turns that into an immediate error.
    """
    primary_role: str | None
    secondary_roles: list[str] = field(default_factory=list)
    category: str | None = None
    skills: list[str] = field(default_factory=list)
    experience_level: str | None = None
    job_requirements: str | None = None
    location: str | None = None
    country_code: str | None = None
    city: str | None = None
    remote: bool | None = None

    def __post_init__(self):
        if self.primary_role is not None and not isinstance(self.primary_role, str):
            raise TypeError(
                f"SearchQuery.primary_role must be a string, got {type(self.primary_role).__name__}; "
                "use SearchQuery.from_parsed(parsed_query)"
            )

    @classmethod
    def from_parsed(cls, parsed: "ParsedQuery") -> "SearchQuery":
        return cls(
            primary_role=parsed.primary_role,
            secondary_roles=list(parsed.secondary_roles),
            category=parsed.category,
            skills=list(parsed.skills),
            experience_level=parsed.experience_level,
            job_requirements=parsed.job_requirements,
            location=parsed.location,
            country_code=parsed.country_code,
            city=parsed.city,
            remote=parsed.remote,
        )

@dataclass
class ProcessedJob:
    job: Job
    skills: list[str]

@dataclass
@dataclass(frozen=True)
class SearchScope:
    """One leg of a search: where to look and under what arrangement."""

    kind: str                      # local | remote | fallback
    label: str
    country_code: str | None = None
    country_name: str | None = None
    city: str | None = None
    place: str | None = None       # phrase for a provider's free-text query


@dataclass
class SearchOutcome:
    jobs: list = field(default_factory=list)
    coverage: dict = field(default_factory=dict)

class Education(BaseModel):
    school_name: str | None
    course_title: str | None


class Experience(BaseModel):
    company: str | None
    role: str | None
    start_date: str | None
    end_date: str | None
    description: str | None


class CVQuery(BaseModel):
    name: str | None
    title: str | None
    location: str | None
    phone_number: str | None
    email: str | None
    portfolio: str | None
    linkedIn: str | None
    professional_summary: str | None
    skills:list[str] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    experience_level: str | None
    education: list[Education]
    # Kept CVs carry these; see src/matching/kept_cv.py.
    education_level: str | None = None
    languages: list[str] = Field(default_factory=list)
    derived: dict | None = None


class BookmarkRequest(BaseModel):
    job_id: int
    title: str | None = None
    company: str | None = None
    source: str | None = None
    match_score: float | None = None
    cv_snapshot: dict | None = None


class AnalysisPayload(BaseModel):
    analysis: dict
    file_name: str | None = None


class ManualApplicationRequest(BaseModel):
    title: str
    company: str | None = None
    url: str | None = None
    location: str | None = None
    status: Literal["saved", "applied"] = "applied"
    cv_snapshot: dict | None = None


class LocationPreferencesRequest(BaseModel):
    """null order means the default tier order; see location.TIERS."""
    country_code: str = Field(min_length=2, max_length=2)
    city: str | None = Field(default=None, max_length=100)
    order: list[Literal[
        "local", "remote_country", "remote_region", "remote_emea",
        "remote_global", "remote_unspecified", "international",
    ]] | None = None

    @field_validator("order")
    @classmethod
    def _unique(cls, value):
        if value is not None and len(set(value)) != len(value):
            raise ValueError("each tier may appear once")
        return value


class ExtractJobRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class UrlApplicationRequest(BaseModel):
    """What the user confirmed on the review screen."""
    url: str = Field(min_length=1, max_length=2048)
    title: str = Field(min_length=1, max_length=300)
    job_id: int | None = None
    company: str | None = Field(default=None, max_length=300)
    location: str | None = Field(default=None, max_length=300)
    workplace: Literal["remote", "hybrid", "onsite"] | None = None
    employment_type: str | None = Field(default=None, max_length=100)
    salary: str | None = Field(default=None, max_length=200)
    source: str | None = Field(default=None, max_length=50)
    status: Literal["saved", "applied"] = "saved"
    cv_snapshot: dict | None = None


ApplicationStatus = Literal["saved", "applied", "screening", "interview", "offer", "rejected", "withdrawn"]


class ImportRow(BaseModel):
    """One spreadsheet row as the user confirmed it on the import preview."""
    title: str = Field(min_length=1, max_length=300)
    company: str | None = Field(default=None, max_length=300)
    url: str | None = Field(default=None, max_length=2048, pattern=r"^https?://")
    location: str | None = Field(default=None, max_length=300)
    workplace: Literal["remote", "hybrid", "onsite"] | None = None
    applied_at: date | None = None
    status: ApplicationStatus = "applied"
    employment_type: str | None = Field(default=None, max_length=100)
    salary: str | None = Field(default=None, max_length=200)
    source: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def _saved_has_no_date(self):
        if self.status == "saved":
            self.applied_at = None
        return self


class ImportRequest(BaseModel):
    file_name: str | None = Field(default=None, max_length=255)
    rows: list[ImportRow] = Field(min_length=1, max_length=2000)


class DeleteApplicationsRequest(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=2000)


class AppliedDateRequest(BaseModel):
    """The day the user applied, picked on a calendar: a date, not a time."""
    applied_on: date


class TransitionRequest(BaseModel):
    to_status: Literal[
        "applied", "screening", "interview", "offer", "rejected", "withdrawn"
    ]
    occurred_at: datetime | None = None
    scheduled_for: datetime | None = None
    note: str | None = None
