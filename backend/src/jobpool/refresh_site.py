"""
After a publication, the site shows it without waiting for a visitor
(decisions/market-publication.md, GitHub issue #1).

The site's pages are ISR: they are rebuilt on a visit, and the rebuild reads
the API with a 4 s timeout. The API scales to zero and takes about 43 s to
wake, so on a quiet site the rebuild failed, the last page stayed, and on
12 Oct 2026 the 5 October week was served for 11 hours after the 12 October one
was published. So after publishing, publish.py calls refresh(), which:

1. wakes the API: GET /market/look until it answers, up to WAKE_SECONDS;
2. asks the site to drop its cached pages: POST /api/revalidate with the secret;
3. opens each page and share image once, so it is rebuilt now, against an awake API.

Nothing here can change a publication: every failure is one warning line.
Without REVALIDATE_SECRET it does nothing and says so.
"""
import os
import time

import httpx

from src.jobpool import market_pages

SITE_URL = "https://seeglassbox.com"
# The API the site reads (deploy.yml smoke tests the same address).
API_BASE_URL = "https://jobradar-backend.agreeabledune-79b95957.southafricanorth.azurecontainerapps.io"
WAKE_SECONDS = 90
RETRY_SECONDS = 5
TIMEOUT = 30.0


def pages() -> list[str]:
    """Every page and share image that shows the published market: what /api/revalidate drops."""
    market = ["/market", *(f"/market/{name}" for name in market_pages.PAGES),
              *(f"/market/{name}/{answer}" for name, answers in market_pages.ANSWERS.items() for answer in answers)]
    return ["/", "/about", "/product", *market, *(f"{path}/opengraph-image" for path in market)]


def refresh(env=os.environ, client: httpx.Client | None = None, sleep=time.sleep, clock=time.monotonic) -> bool:
    """Wake the API, revalidate the site, open each page. True when every page answered."""
    secret = (env.get("REVALIDATE_SECRET") or "").strip()
    if not secret:
        print("REVALIDATE_SECRET is not set: the site shows the new market once visits rebuild its pages")
        return False
    site = (env.get("SITE_URL") or SITE_URL).rstrip("/")
    api = (env.get("API_BASE_URL") or API_BASE_URL).rstrip("/")
    try:
        with client or httpx.Client(timeout=TIMEOUT) as http:
            if not _wake(http, api, sleep, clock):
                # Revalidating now would only rebuild against a sleeping API and keep the old pages.
                return _warn(f"the API didn't answer in {WAKE_SECONDS} s, so the site wasn't revalidated")
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


def _wake(http: httpx.Client, api: str, sleep, clock) -> bool:
    deadline = clock() + WAKE_SECONDS
    while True:
        try:
            if http.get(f"{api}/market/look").status_code == 200:
                return True
        except httpx.HTTPError:
            pass
        if clock() + RETRY_SECONDS >= deadline:
            return False
        sleep(RETRY_SECONDS)


def _warn(message: str) -> bool:
    # A GitHub Actions annotation: seen on the run's page, and the run stays green.
    print(f"::warning title=Site not refreshed::{message.replace(chr(10), ' ')}")
    return False
