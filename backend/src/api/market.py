"""
Public market routes: no sign-in, nothing about the visitor is read or kept.

    GET  /market/look   today's count per role family (src/jobpool/market_look.py)
    POST /market/ad     a pasted ad or link -> what it asks for (src/jobpool/ad_reader.py)

Kept out of main.py so its routes stay about the signed-in product. The
decision behind both, including what is never returned: decisions/market-look.md.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.api import rate_limit
from src.jobpool import ad_reader, market_look
from src.jobpool.safe_fetch import BlockedLink, UnreadableLink

router = APIRouter(prefix="/market")


class AdRequest(BaseModel):
    text: str | None = None
    url: str | None = None


@router.get("/look")
async def look():
    try:
        body = await run_in_threadpool(market_look.look)
    except market_look.NotAvailable as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    # The count changes once a day; an hour in a browser or CDN costs nothing.
    return JSONResponse(body, headers={"Cache-Control": f"public, max-age={market_look.CACHE_SECONDS}"})


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
