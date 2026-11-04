"""
After a publication, the site shows it without waiting for a visitor.
A 200 alone is not proof that a revalidated page contains the new week, so
the publication week and each page's job count are checked in returned HTML.
"""
import os
from datetime import date

import httpx

from src.jobpool import market_pages

SITE_URL = "https://seeglassbox.com"
TIMEOUT = 30.0


def pages() -> list[str]:
    """Every page and share image that shows the published market."""
    market = ["/market", *(f"/market/{name}" for name in market_pages.PAGES),
              *(f"/market/{name}/{answer}" for name, answers in market_pages.ANSWERS.items() for answer in answers)]
    return ["/", "/about", "/product", *market, *(f"{path}/opengraph-image" for path in market)]


def _week_label(week: date) -> str:
    return f"{week.day} {week.strftime('%B %Y')}"


def _contains_publication(text: str, week: date, jobs: int | None = None) -> bool:
    """The HTML must identify the expected week and, for market pages, its job count."""
    if _week_label(week) not in text:
        return False
    return jobs is None or f"{jobs:,}" in text


def refresh(env=os.environ, client: httpx.Client | None = None, *,
            expected_week: date | None = None, expected_pages: dict | None = None) -> bool:
    """Revalidate and open every page. If supplied, assert the actual HTML matches the publication."""
    secret = (env.get("REVALIDATE_SECRET") or "").strip()
    if not secret:
        print("REVALIDATE_SECRET is not set: the site keeps the last market until its next deploy")
        return False
    site = (env.get("SITE_URL") or SITE_URL).rstrip("/")
    expected_pages = expected_pages or {}
    try:
        with client or httpx.Client(timeout=TIMEOUT) as http:
            answer = http.post(f"{site}/api/revalidate", headers={"Authorization": f"Bearer {secret}"})
            if answer.status_code != 200:
                return _warn(f"{site}/api/revalidate answered {answer.status_code}")
            failed = []
            for path in pages():
                response = http.get(f"{site}{path}")
                if response.status_code != 200:
                    failed.append(f"{path} (HTTP {response.status_code})")
                    continue
                if expected_week and path == "/market" and not _contains_publication(response.text, expected_week):
                    failed.append(f"{path} (expected week {_week_label(expected_week)} absent from HTML)")
                elif expected_week and path.startswith("/market/") and path.count("/") == 2:
                    name = path.rsplit("/", 1)[-1]
                    jobs = (expected_pages.get(name) or {}).get("jobs")
                    if not _contains_publication(response.text, expected_week, jobs):
                        failed.append(f"{path} (expected week/count {_week_label(expected_week)}/{jobs} absent from HTML)")
    except Exception as err:
        return _warn(f"{type(err).__name__}: {err}")
    if failed:
        return _warn(f"revalidated, but these pages failed verification: {', '.join(failed)}")
    print(f"site refreshed and verified: {len(pages())} pages on {site}" if expected_week
          else f"site refreshed: {len(pages())} pages rebuilt on {site}")
    return True


def _warn(message: str) -> bool:
    print(f"::warning title=Site not refreshed::{message.replace(chr(10), ' ')}")
    return False
