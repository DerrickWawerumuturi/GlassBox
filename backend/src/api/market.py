"""
Public market routes: no sign-in, nothing about the visitor is read or kept.

    GET  /market/look   the published count per role family (src/jobpool/market_look.py)
    GET  /market/page/{name}  one public market page's counts (src/jobpool/market_pages.py)
                        Both serve the latest weekly publication (src/jobpool/publish.py).
    POST /market/ad     a pasted ad or link -> what it asks for (src/jobpool/ad_reader.py)

Kept out of main.py so its routes stay about the signed-in product. The
decision behind both, including what is never returned: decisions/market-look.md.
"""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.api import rate_limit
from src.jobpool import ad_reader, market_look, market_pages
from src.jobpool.safe_fetch import BlockedLink, UnreadableLink

router = APIRouter(prefix="/market")


class AdRequest(BaseModel):
    text: str | None = None
    url: str | None = None


async def keep_fresh():
    """Started with the app: loads the latest publication now, then checks for a newer one every REFRESH_SECONDS, off the event loop."""
    while True:
        await run_in_threadpool(market_look.refresh)
        await asyncio.sleep(market_look.REFRESH_SECONDS)


def _built(read):
    """A published body as a cached response, or 503 while the first load runs."""
    try:
        body = read()
    except market_look.NotReady as err:
        raise HTTPException(status_code=503, detail=str(err),
                            headers={"Retry-After": str(market_look.RETRY_SECONDS)}) from err
    except market_look.NotAvailable as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    # The count changes once a week; an hour in a browser or CDN costs nothing.
    return JSONResponse(body, headers={"Cache-Control": f"public, max-age={market_look.CACHE_SECONDS}"})


@router.get("/look")
def look():
    # Only ever reads the loaded publication (market_look.look), so this answers in microseconds.
    return _built(market_look.look)


# The name is checked against the known pages before anything is read, so a
# stranger's path can't reach anything else.
@router.get("/page/{name}")
def page(name: str):
    if len(name) > 64 or name not in market_pages.PAGES:
        raise HTTPException(status_code=404, detail="No such page.")
    return _built(lambda: market_look.page(name))


# About 20 ads an hour per visitor: each one can make us fetch a page (rate_limit.py).
@router.post("/ad", dependencies=[Depends(rate_limit.ads)])
async def read_ad(body: AdRequest):
    # The ad is someone's job search: it is read and dropped, never stored or
    # logged, and errors never echo it back.
    if (body.text is None) == (body.url is None):
        raise HTTPException(status_code=422, detail="Paste the ad's text or a link to it.")
    try:
        if body.text is not None:
            if not body.text.strip():
                raise HTTPException(status_code=422, detail="Paste the ad's text or a link to it.")
            return await run_in_threadpool(ad_reader.read_text, body.text)
        return await run_in_threadpool(ad_reader.read_url, body.url)
    except ad_reader.AdTooLong as err:
        raise HTTPException(status_code=413, detail=str(err)) from None
    except BlockedLink as err:
        raise HTTPException(status_code=400, detail=str(err)) from None
    except UnreadableLink as err:
        raise HTTPException(status_code=422, detail=str(err)) from None
