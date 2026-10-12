"""
After a publication, the site shows it without waiting for a visitor
(decisions/market-publication.md, GitHub issues #1 and #5).

The site's public pages are static with no timer: built at deploy, rebuilt
only when asked. Each rebuild reads the publication straight from the
database (frontend src/lib/published.ts), never the API, so nothing here wakes
the API. After publishing, publish.py calls refresh(), which:

1. asks the site to drop its cached pages: POST /api/revalidate with the secret;
2. opens each page and share image once, so it is rebuilt now, not on a visit.

Until 12 Oct 2026 the pages read the API, and this woke it first (about 43 s
from zero); on that day the 5 October week was served for 11 hours after the
12 October one was published.

Nothing here can change a publication: every failure is one warning line.
Without REVALIDATE_SECRET it does nothing and says so.
"""
import os

import httpx

from src.jobpool import market_pages

SITE_URL = "https://seeglassbox.com"
TIMEOUT = 30.0


def pages() -> list[str]:
    """Every page and share image that shows the published market: what /api/revalidate drops."""
    market = ["/market", *(f"/market/{name}" for name in market_pages.PAGES),
              *(f"/market/{name}/{answer}" for name, answers in market_pages.ANSWERS.items() for answer in answers)]
    return ["/", "/about", "/product", *market, *(f"{path}/opengraph-image" for path in market)]


def refresh(env=os.environ, client: httpx.Client | None = None) -> bool:
    """Revalidate the site, open each page. True when every page answered."""
    secret = (env.get("REVALIDATE_SECRET") or "").strip()
    if not secret:
        print("REVALIDATE_SECRET is not set: the site keeps the last market until its next deploy")
        return False
    site = (env.get("SITE_URL") or SITE_URL).rstrip("/")
    try:
        with client or httpx.Client(timeout=TIMEOUT) as http:
            answer = http.post(f"{site}/api/revalidate", headers={"Authorization": f"Bearer {secret}"})
            if answer.status_code != 200:
                return _warn(f"{site}/api/revalidate answered {answer.status_code}")
            failed = [path for path in pages() if http.get(f"{site}{path}").status_code != 200]
    except Exception as err:
        return _warn(f"{type(err).__name__}: {err}")
    if failed:
        return _warn(f"revalidated, but these pages didn't answer: {', '.join(failed)}")
    print(f"site refreshed: {len(pages())} pages rebuilt on {site}")
    return True


def _warn(message: str) -> bool:
    # A GitHub Actions annotation: seen on the run's page, and the run stays green.
    print(f"::warning title=Site not refreshed::{message.replace(chr(10), ' ')}")
    return False
