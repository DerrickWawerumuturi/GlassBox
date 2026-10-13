"""
The open dataset: each published week's counts as tidy CSV files anyone may
reuse and cite (decisions/open-data.md, GitHub issue #7).

    python -m src.jobpool.open_data --out <dir>                    the latest published week
    python -m src.jobpool.open_data --out <dir> --week 2026-10-12  that week (its Monday, or 2026-W42)
    python -m src.jobpool.open_data --out <dir> --all              every published week

Reads market_publications only, never the pool: the files hold exactly the
numbers the site showed that week. Writes <dir>/<week>/ for each week, then
rebuilds the all weeks files in <dir> from every week folder there, so a
folder that already holds earlier weeks (the public repository) keeps them.

Only what the site may say is exported: skills that pass the breadth rule
(market_story.broad), on pages with enough readable jobs to publish shares.
Never exported: company names, titles, links or any job's text. The page
bodies hold titles and the largest employer's name; nothing here reads them.
"""
import csv
import json
import re
import shutil
import sys
from pathlib import Path

from src.jobpool import market_story

SCHEMA_VERSION = "1"
README = Path(__file__).with_name("open_data_readme.md")
# The groups of the years page (market_pages.experience), by their names in the files.
GROUPS = {"titled": "early career titles", "software": "all software"}
_WEEK = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Each file's columns: (name, type, what it counts). datapackage.json is built from these.
FILES = {
    "job_types": [
        ("week", "date", "Monday of the week the jobs were counted (UTC)"),
        ("job_type", "string", "The market page: seeglassbox.com/market/<job_type>"),
        ("jobs_counted", "integer", "Open jobs of this type counted that week, each role once"),
        ("jobs_readable", "integer", "Of those, jobs whose ad was long enough to read skills from"),
        ("employers", "integer", "Distinct employers among the jobs counted"),
    ],
    "skills": [
        ("week", "date", "Monday of the week the jobs were counted (UTC)"),
        ("job_type", "string", "The market page: seeglassbox.com/market/<job_type>"),
        ("skill", "string", "The skill, as the site names it"),
        ("jobs_naming", "integer", "Readable jobs that name the skill anywhere in the ad"),
        ("jobs_requiring", "integer", "Readable jobs that list the skill as required"),
        ("jobs_readable", "integer", "Readable jobs of this type: the denominator"),
        ("share_naming", "number", "jobs_naming / jobs_readable, 4 decimals"),
        ("employers", "integer", "Distinct employers among the jobs naming the skill (always 10 or more)"),
    ],
    "experience": [
        ("week", "date", "Monday of the week the jobs were counted (UTC)"),
        ("group", "string", "'early career titles': software jobs whose title says intern, graduate, new grad, "
                            "entry level, early career or junior. 'all software': every software job counted"),
        ("years_bucket", "string", "Years of experience required: 0, 1, 2, 3, 4, 5+, or 'unstated'"),
        ("jobs", "integer", "Jobs in the group asking for that many years"),
    ],
}


def rows(publication: dict) -> dict[str, list[list]]:
    """One published week ({week, pages}) -> each file's rows, in FILES column order."""
    week = str(publication["week"])
    pages = publication.get("pages") or {}
    out = {name: [] for name in FILES}
    for job_type in sorted(pages):
        page = pages[job_type]
        readable = page.get("readable", 0)
        out["job_types"].append([week, job_type, page.get("jobs", 0), readable, page.get("employers", 0)])
        # Under MIN_READABLE readable jobs the page shows counts only, no shares (the 100 rule).
        if not page.get("publishable") or not readable:
            continue
        names = page.get("names") or {}
        for s in (page.get("story") or {}).get("skills", []):
            if market_story.broad(s):
                out["skills"].append([week, job_type, names.get(s["key"], s["key"]), s["any"], s["required"],
                                      readable, round(s["any"] / readable, 4), s["employers"]])
    experience = (pages.get("entry-level-software") or {}).get("experience")
    for key, group in GROUPS.items():
        counted = (experience or {}).get(key)
        if not counted:
            continue                    # publications before 12 Oct 2026 carry no years
        for b in counted["buckets"]:
            out["experience"].append([week, group, f"{b['from']}+" if b["to"] is None else str(b["from"]), b["jobs"]])
        out["experience"].append([week, group, "unstated", counted["unstated"]])
    return out


def _write(path: Path, name: str, data: list[list]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow([column for column, _, _ in FILES[name]])
        writer.writerows(data)


def write_week(out: Path, publication: dict) -> Path:
    """<out>/<week>/<file>.csv for one published week; replaces that week's folder."""
    folder = out / str(publication["week"])
    folder.mkdir(parents=True, exist_ok=True)
    for name, data in rows(publication).items():
        _write(folder / f"{name}.csv", name, data)
    return folder


def combine(out: Path) -> list[str]:
    """The all weeks files, README and datapackage.json, from every week folder in `out`. Returns the weeks."""
    weeks = sorted(p.name for p in out.iterdir() if p.is_dir() and _WEEK.match(p.name))
    for name in FILES:
        data = []
        for week in weeks:
            with (out / week / f"{name}.csv").open(encoding="utf-8") as f:
                data.extend(list(csv.reader(f))[1:])
        _write(out / f"{name}.csv", name, data)
    shutil.copyfile(README, out / "README.md")
    (out / "datapackage.json").write_text(json.dumps(package(weeks), indent=2) + "\n", encoding="utf-8")
    return weeks


def package(weeks: list[str]) -> dict:
    """A Frictionless Data Package describing the all weeks files."""
    return {
        "name": "glassbox-job-counts",
        "title": "Glassbox weekly job counts",
        "version": SCHEMA_VERSION,
        "homepage": "https://seeglassbox.com/method",
        "licenses": [{"name": "CC-BY-4.0", "path": "https://creativecommons.org/licenses/by/4.0/",
                      "title": "Creative Commons Attribution 4.0"}],
        "temporal": {"start": weeks[0], "end": weeks[-1]} if weeks else None,
        "resources": [{
            "name": name, "path": f"{name}.csv", "format": "csv", "mediatype": "text/csv", "encoding": "utf-8",
            "schema": {"fields": [{"name": c, "type": t, "description": d} for c, t, d in columns],
                       "primaryKey": [c for c, _, _ in columns if c in ("week", "job_type", "skill", "group",
                                                                       "years_bucket")]},
        } for name, columns in FILES.items()],
    }


def export(out: Path, publications: list[dict]) -> list[str]:
    """Write each publication's week, then rebuild the all weeks files. Returns every week now in `out`."""
    out.mkdir(parents=True, exist_ok=True)
    for publication in publications:
        write_week(out, publication)
    return combine(out)


def main(argv: list[str]) -> int:
    from src.database.repositories import publication_repository
    from src.database.session import connection, is_configured
    from src.jobpool.publish import parse_week

    if "--out" not in argv:
        print(__doc__.strip().split("\n\n")[1])
        return 2
    if not is_configured():
        print("no DATABASE_URL; nothing to export")
        return 1
    out = Path(argv[argv.index("--out") + 1])
    week = parse_week(argv[argv.index("--week") + 1]) if "--week" in argv else None
    with connection() as conn:
        published = publication_repository.published_weeks(conn, week)
    if not published:
        print("no published week to export" + (f" for the week of {week}" if week else ""))
        return 1
    chosen = published if "--all" in argv or week else published[-1:]
    weeks = export(out, chosen)
    print(f"exported {', '.join(str(p['week']) for p in chosen)} to {out}; it now holds {len(weeks)} weeks")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
