"""
Everything JobRadar knows about where a user is and where a job is.

    resolve             the CV's free-text location -> a validated country/city
    remote_eligibility  can someone in country X hold this remote job?
    location_tier       where a job sits relative to the user (local, remote
                        open to their country, ... ineligible)
    location_fit        a tier -> 0..1 ranking score, by the user's preferences

The model is asked for an ISO 3166-1 alpha-2 code directly, because mapping
"Nairobi" to a country needs world knowledge that a local table does not have.
Everything it returns is then checked against the real ISO list, so a plausible
invention becomes a detected fallback rather than a silently wrong search.
"""

import os
import re
from dataclasses import dataclass

import pycountry

# Values that name a working arrangement rather than a place.
REMOTE_WORDS = frozenset({
    "remote", "anywhere", "worldwide", "global", "flexible", "work from home",
    "wfh", "distributed", "remote-first", "fully remote",
})


@dataclass(frozen=True)
class ResolvedLocation:
    country_code: str | None = None   # validated ISO 3166-1 alpha-2, lowercase
    country_name: str | None = None   # official name, for provider query text
    city: str | None = None
    remote_only: bool = False
    source: str = "unknown"           # llm | recovered | none
    warning: str | None = None

    @property
    def known(self) -> bool:
        return self.country_code is not None

    def place_phrase(self) -> str | None:
        """What to put in a provider's free-text query.

        JSearch returns almost nothing for "engineer in ke" and a full page for
        "engineer in Kenya" — the code belongs in the country parameter, never in
        the query text.
        """
        if self.city and self.country_name:
            return f"{self.city}, {self.country_name}"
        return self.city or self.country_name


def _clean(value: str | None) -> str:
    return " ".join((value or "").split()).strip()


def _looks_remote(text: str) -> bool:
    lowered = text.lower()
    return any(word in lowered for word in REMOTE_WORDS)


def _normalise_gb(code: str) -> str:
    return "gb" if code == "uk" else code


def _validate_code(code: str | None) -> str | None:
    """An alpha-2 code the ISO standard actually contains."""
    code = _clean(code).lower()
    if len(code) != 2:
        return None
    # The UK trades as 'uk' at several providers; ISO calls it GB.
    lookup = "gb" if code == "uk" else code
    return code if pycountry.countries.get(alpha_2=lookup.upper()) else None


def _country_name(code: str) -> str | None:
    entry = pycountry.countries.get(alpha_2=("GB" if code == "uk" else code).upper())
    if entry is None:
        return None
    return getattr(entry, "common_name", None) or entry.name


def _country_in_text(text: str) -> str | None:
    """
    The country actually named in a free-text location, if any.

    Tried on the whole string and then on each comma-separated part, last part
    first, because "Nairobi, Kenya" puts the country at the end. A fuzzy match
    counts only when the matched country's name really occurs in the text —
    search_fuzzy will otherwise return a confident answer for anything.
    """
    text = _clean(text)
    if not text:
        return None

    parts = [text] + [p.strip() for p in reversed(text.split(",")) if p.strip()]
    for part in parts:
        entry = pycountry.countries.get(name=part) or pycountry.countries.get(alpha_2=part.upper()) \
            if len(part) <= 56 else None
        if entry:
            return entry.alpha_2.lower()

    lowered = text.lower()
    for part in parts:
        try:
            matches = pycountry.countries.search_fuzzy(part)
        except LookupError:
            continue
        for match in matches:
            names = {match.name.lower(), getattr(match, "common_name", "").lower(),
                     getattr(match, "official_name", "").lower()}
            if any(name and name in lowered for name in names):
                return match.alpha_2.lower()
    return None


def resolve(query) -> ResolvedLocation:
    """
    Resolve `query.country_code` / `query.city` / `query.location` into a target.

    The LLM's code is trusted only after it validates. When it does not, the
    free-text location is searched for a country name before giving up, and the
    result is labelled so callers can tell a confirmed location from a guess.
    """
    raw_location = _clean(getattr(query, "location", None))
    city = _clean(getattr(query, "city", None)) or None
    remote_flag = bool(getattr(query, "remote", False))

    # "Remote" is an arrangement, not a place. Treat it as such rather than
    # letting it fail country lookup and look like a missing location.
    if raw_location and _looks_remote(raw_location) and not city:
        return ResolvedLocation(remote_only=True, source="llm")

    claimed = _clean(getattr(query, "country_code", None))
    code = _validate_code(claimed)
    from_text = _country_in_text(raw_location or city or "")
    source = "llm"
    warning = None

    # Validating against the ISO list is not enough on its own. A hallucinated
    # code is almost always a *valid* code for the wrong country — "kn" (Saint
    # Kitts and Nevis) for "Nairobi, Kenya" passes every format check there is.
    # The location text is the corroborating evidence, so it wins on conflict.
    if code and from_text and _normalise_gb(code) != _normalise_gb(from_text):
        warning = (
            f"country_code {claimed!r} ({_country_name(code)}) contradicts "
            f"location {raw_location!r}; using {from_text!r} "
            f"({_country_name(from_text)})"
        )
        code, source = from_text, "corrected"

    elif code is None:
        if from_text:
            code, source = from_text, "recovered"
            if claimed:
                warning = (
                    f"country_code {claimed!r} is not a valid ISO code; "
                    f"recovered {from_text!r} from location {raw_location!r}"
                )
        else:
            return ResolvedLocation(
                city=city,
                remote_only=remote_flag,
                source="none",
                warning=(
                    f"could not resolve a country from location={raw_location!r} "
                    f"country_code={claimed!r}"
                ) if (raw_location or claimed) else None,
            )

    if city and _looks_remote(city):
        city = None

    return ResolvedLocation(
        country_code=code,
        country_name=_country_name(code),
        city=city,
        remote_only=remote_flag,
        source=source,
        warning=warning,
    )


# Coarse region membership, used to decide whether a remote posting that lists
# eligible regions is open to this user. Only the groupings providers actually
# write in that field are modelled.
_REGIONS = {
    "africa": {"dz", "ao", "eg", "gh", "ke", "ma", "ng", "so", "tn", "za", "ug", "tz", "rw", "et"},
    "emea": {"dz", "ao", "at", "be", "ch", "de", "dk", "eg", "es", "fi", "fr", "gb", "gh",
             "gr", "hu", "ie", "il", "iq", "it", "ke", "kw", "ma", "ng", "nl", "no", "om",
             "pl", "pt", "qa", "ro", "ru", "sa", "se", "so", "tn", "tr", "ua", "ae", "za"},
    "europe": {"at", "be", "ch", "de", "dk", "es", "fi", "fr", "gb", "gr", "hu", "ie", "it",
               "nl", "no", "pl", "pt", "ro", "se", "ua"},
    "americas": {"ar", "br", "ca", "cl", "co", "mx", "pa", "pe", "us", "ve"},
    "north america": {"ca", "mx", "us"},
    "northern america": {"ca", "us"},
    "asia": {"hk", "id", "in", "jp", "kr", "lk", "my", "ph", "pk", "sg", "tw", "th", "vn"},
    "oceania": {"au", "nz"},
}

_OPEN_WORDS = ("worldwide", "anywhere", "global", "any location", "international")

# Words that say "this job is remote" without saying who may hold it.
_UNINFORMATIVE = ("remote", "work from home", "wfh", "distributed", "flexible")

_ALIASES = {
    "us": ("usa", "united states", "u.s."),
    "gb": ("uk", "united kingdom", "britain", "england"),
}


# "South Africa" is a country, not the continent; "Central African Republic" too.
_REGION_PATTERNS = {
    "africa": r"(?<!south )(?<!central )\bafrica\b",
}


def _mentions_region(text: str, region: str) -> bool:
    pattern = _REGION_PATTERNS.get(region)
    if pattern:
        return re.search(pattern, text) is not None
    return re.search(rf"\b{re.escape(region)}\b", text) is not None


def _names_any_place(text: str) -> bool:
    """Does this string name a country or region at all?"""
    if any(region in text for region in _REGIONS):
        return True
    if any(alias in text for aliases in _ALIASES.values() for alias in aliases):
        return True
    return any(
        country.name.lower() in text
        for country in pycountry.countries
        if len(country.name) > 4
    )


def remote_eligibility(requirement: str | None, country_code: str | None) -> bool | None:
    """
    Can someone in `country_code` hold this remote job?

    True when the posting is open or names their country/region, False when it
    names places and theirs is absent, None when there is nothing to judge.

    The None case matters as much as the False one. "Remote" states an
    arrangement, not an eligibility list — treating that as a restriction
    silently discarded every RemoteOK posting, since that board usually leaves
    the field blank.
    """
    text = _clean(requirement).lower()
    if not text:
        return None
    if any(word in text for word in _OPEN_WORDS):
        return True
    if not country_code:
        return None

    code = _normalise_gb(country_code)
    name = (_country_name(code) or "").lower()
    if name and name in text:
        return True
    if any(alias in text for alias in _ALIASES.get(code, ())):
        return True

    for region, members in _REGIONS.items():
        if _mentions_region(text, region) and code in members:
            return True

    # Names somewhere, and it is not this user's somewhere.
    if _names_any_place(text):
        return False

    # Says only "Remote" or similar: unknown, not excluded.
    if any(word in text for word in _UNINFORMATIVE):
        return None

    return None


# ----------------------------------------------------------- location tiers
# Collection is broad; ranking is where a user's location matters. Every job is
# placed in one tier relative to the user, and the user's preferred order turns
# that tier into a 0..1 location fit. Nothing here names a particular country:
# the home market comes from the user's CV or saved preferences.

TIERS = (
    "local",               # onsite/hybrid in the user's city or country
    "remote_country",      # remote, open to the user's country by name
    "remote_region",       # remote, open to the user's region (e.g. Africa)
    "remote_emea",         # remote, open to EMEA and the user is in EMEA
    "remote_global",       # remote, explicitly worldwide
    "remote_unspecified",  # remote, eligibility not stated
    "international",       # onsite/hybrid somewhere else
)

# The market assumed when a CV gives no location. Configuration, not code:
# set JOBRADAR_DEFAULT_COUNTRY for a deployment serving a different market.
DEFAULT_COUNTRY = os.getenv("JOBRADAR_DEFAULT_COUNTRY", "ke").lower() or None

# Continental grouping for the remote_region tier, most specific first.
_HOME_REGIONS = ("africa", "europe", "north america", "americas", "asia", "oceania")


@dataclass(frozen=True)
class LocationPreferences:
    country_code: str | None = None
    city: str | None = None
    order: tuple[str, ...] = TIERS
    source: str = "resolved"   # resolved | saved | default

    def __post_init__(self):
        unknown = set(self.order) - set(TIERS)
        if unknown or len(set(self.order)) != len(self.order):
            raise ValueError(f"invalid tier order {self.order!r}")

    @property
    def region(self) -> str | None:
        code = _normalise_gb(self.country_code) if self.country_code else None
        return next((r for r in _HOME_REGIONS if code and code in _REGIONS[r]), None)

    @property
    def in_emea(self) -> bool:
        return bool(self.country_code) and _normalise_gb(self.country_code) in _REGIONS["emea"]

    @classmethod
    def resolve(cls, resolved: ResolvedLocation | None, saved: dict | None = None) -> "LocationPreferences":
        """Saved preferences win; then the CV's location; then the deployment default."""
        if saved:
            return cls.from_dict(saved)
        if resolved is not None and resolved.country_code:
            return cls(country_code=resolved.country_code, city=resolved.city, source="resolved")
        return cls(country_code=DEFAULT_COUNTRY, source="default")

    @classmethod
    def from_dict(cls, data: dict) -> "LocationPreferences":
        code = _validate_code(data.get("country_code"))
        order = tuple(data.get("order") or TIERS)
        return cls(country_code=code, city=_clean(data.get("city")) or None, order=order, source="saved")

    def to_dict(self) -> dict:
        return {"country_code": self.country_code, "city": self.city,
                "order": list(self.order), "source": self.source}


def _names_home(text: str, prefs: LocationPreferences) -> bool:
    if prefs.city and prefs.city.lower() in text:
        return True
    if not prefs.country_code:
        return False
    code = _normalise_gb(prefs.country_code)
    name = (_country_name(code) or "").lower()
    return bool(name and name in text) or any(a in text for a in _ALIASES.get(code, ()))


_US_STATES = frozenset("""al ak az ar ca co ct de fl ga hi id il in ia ks ky la me md ma mi mn ms mo mt
ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv wi wy dc""".split())
_US_STATE_SUFFIX = re.compile(r",\s*([A-Za-z]{2})\b")


# Hubs boards write without a country ("Westlands, Nairobi", "NYC Office").
_HUB_CITIES = {
    "nairobi": "ke", "mombasa": "ke", "kisumu": "ke", "lagos": "ng", "abuja": "ng", "accra": "gh",
    "kampala": "ug", "kigali": "rw", "dar es salaam": "tz", "addis ababa": "et", "cairo": "eg",
    "johannesburg": "za", "cape town": "za", "casablanca": "ma", "tunis": "tn",
    "london": "gb", "manchester": "gb", "edinburgh": "gb", "dublin": "ie", "berlin": "de", "munich": "de",
    "paris": "fr", "amsterdam": "nl", "madrid": "es", "barcelona": "es", "lisbon": "pt", "warsaw": "pl",
    "stockholm": "se", "zurich": "ch", "dubai": "ae", "tel aviv": "il", "istanbul": "tr",
    "new york": "us", "nyc": "us", "san francisco": "us", "seattle": "us", "austin": "us", "boston": "us",
    "chicago": "us", "los angeles": "us", "toronto": "ca", "vancouver": "ca", "montreal": "ca",
    "sao paulo": "br", "mexico city": "mx", "bengaluru": "in", "bangalore": "in", "mumbai": "in",
    "singapore": "sg", "tokyo": "jp", "sydney": "au", "melbourne": "au",
}


_COUNTRY_TOKENS = re.compile(r"\b(usa|us|uk|u\.s\.)\b")
_NOT_PLACE_WORDS = REMOTE_WORDS | {"office", "hq", "headquarters", "-", "(", ")"}


def country_named(place: str) -> str | None:
    """
    The one country a job's location string names, or None.

    Boards rarely name the country outright: "Austin, TX", "NYC Office",
    "Remote - US", "Westlands, Nairobi". Work-arrangement words are ignored, so
    "Remote - Spain" names Spain.
    """
    core = place.lower()
    for word in _NOT_PLACE_WORDS:
        core = core.replace(word, " ")
    core = " ".join(core.split())
    if not core:
        return None
    token = _COUNTRY_TOKENS.search(core)
    if token:
        return "gb" if token.group(1) == "uk" else "us"
    for m in _US_STATE_SUFFIX.finditer(place):
        if m.group(1).lower() in _US_STATES:
            return "us"
    for city, code in _HUB_CITIES.items():
        if city in core:
            return code
    return _country_in_text(core)


def location_tier(job, prefs: LocationPreferences) -> str:
    """One of TIERS, or "ineligible" for a remote job that excludes the user."""
    place = _clean(getattr(job, "location", None)).lower()
    stated = _clean(getattr(job, "remote_eligibility", None)).lower()
    remote = bool(getattr(job, "remote", None)) or (bool(place) and _looks_remote(place))

    if not remote:
        if _names_home(place, prefs):
            return "local"
        home = _normalise_gb(prefs.country_code) if prefs.country_code else None
        return "local" if home and country_named(place) == home else "international"

    text = f"{stated} {place}"
    if _names_home(text, prefs):
        return "remote_country"
    eligible = remote_eligibility(stated or place, prefs.country_code)
    if eligible is False:
        return "ineligible"
    if prefs.region and _mentions_region(text, prefs.region):
        return "remote_region"
    if prefs.in_emea and _mentions_region(text, "emea"):
        return "remote_emea"
    if any(word in text for word in _OPEN_WORDS):
        return "remote_global"
    if eligible:
        # Open to the user through a grouping not modelled as its own tier.
        return "remote_region"
    # "Remote - Spain", "Remote - US", or a "remote" flag on "New York City
    # Office": the place a remote job names is where it hires.
    restricted_to = country_named(place)
    home = _normalise_gb(prefs.country_code) if prefs.country_code else None
    if restricted_to and home:
        return "remote_country" if restricted_to == home else "ineligible"
    return "remote_unspecified"


def location_fit(tier: str, prefs: LocationPreferences) -> float:
    """1.0 for the user's first tier, falling evenly to 0.2 for the last; 0 if ineligible."""
    if tier not in prefs.order:
        return 0.0
    steps = max(len(prefs.order) - 1, 1)
    return round(1.0 - 0.8 * prefs.order.index(tier) / steps, 4)
