"""
The HTTP API. Routes only translate between HTTP and the services:
authentication, request models and status codes live here; the work does not.

    /analyze, /cv/parse         CV analysis (src/Agent)
    /analyze/reuse, /cv/latest  a rescan from the kept profile of the latest CV
    /cv, /analysis, /profile    the user's own data (services/users.py)
    /dashboard/opportunities    the job pool matched to the user's CV (src/jobpool)
    /dashboard/applications     the tracker (services/applications.py)
    .../extract                 pasted job links (src/jobpool)
    .../import                  a spreadsheet of past applications (services/application_import.py)
    /market/look, /market/ad    public: today's count, a pasted ad's asks (src/api/market.py)
    a scan, a new account       counted as daily totals (src/api/daily_counts.py)
"""
import asyncio
import json
import os
import tempfile
import traceback
from contextlib import asynccontextmanager
from functools import cache
from typing import Literal

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pdf_inspector import pdf_inspector

from src.Agent.utils.location import LocationPreferences
from src.api import daily_counts, market
from src.Agent.utils.types import (
    AnalysisPayload, AppliedDateRequest, BookmarkRequest, CVQuery, DeleteApplicationsRequest, ExtractJobRequest, ImportRequest,
    LocationPreferencesRequest, ManualApplicationRequest, TransitionRequest, UrlApplicationRequest,
)
from src.cv import upload
from src.cv.current_user import current_user, optional_user
from src.database.services import application_import
from src.database.services.applications import (
    ApplicationExists, ApplicationNotFound, BadAppliedDate, BookmarkNotRemovable, JobNotFound, application_service,
)
from src.database.services.spreadsheet import MAX_BYTES, InvalidSpreadsheet
from src.database.services.users import NoLatestCV, StaleLatestCV, UserNotFound, account_created, user_service
from src.jobpool.extract import InvalidJobUrl
from src.jobpool.opportunities import NoProfile, opportunity_service
from src.jobpool.service import job_url_service


# The analysis stack (sentence-transformers and torch) takes seconds to import. Imported at the top of this
# file it held every route hostage: after a scale-from-zero the applications
# list could not answer until the models finished loading. Routes that need it
# import it on first use; startup loads it in the background so the first
# analysis is not slower than before.
def _agent():
    from src.Agent.Framework.JobRadarAgent import job_radar_agent
    return job_radar_agent


@cache
def _cv_parser():
    from src.Agent.utils.llm_client import GroqModel
    return GroqModel("cv")


# Loading the models is pure Python and holds the GIL in long stretches, so on a
# 2 vCPU container it slows every request beside it. A scale-from-zero starts
# with the dashboard asking for the CV, the applications and the opportunities;
# those answer in milliseconds and go first. /analyze loads the stack itself if
# it arrives before this, so nothing waits twice.
WARM_AFTER_SECONDS = float(os.getenv("JOBRADAR_WARM_AFTER_SECONDS", "20"))


def _warm_analysis_stack():
    try:
        _agent()
        print("analysis stack loaded")
    except Exception as err:
        # /analyze re-raises this on use; the rest of the API is unaffected.
        print(f"analysis stack failed to load: {err}")


async def _warm_when_quiet():
    await asyncio.sleep(WARM_AFTER_SECONDS)
    await asyncio.get_running_loop().run_in_executor(None, _warm_analysis_stack)


@asynccontextmanager
async def lifespan(_app):
    tasks = [asyncio.create_task(_warm_when_quiet()), asyncio.create_task(market.keep_fresh())]
    yield
    for task in tasks:
        task.cancel()


app = FastAPI(lifespan=lifespan)
app.include_router(market.router)

# One analysis at a time. The work is moved off the event loop so the server
# stays responsive, but it is CPU-bound (the embedder) on a 2 vCPU container,
# so requests queue rather than compete for the same cores.
analysis_lock = asyncio.Lock()


@app.middleware("http")
async def unexpected_errors(request, call_next):
    """
    Any unhandled error becomes a plain 500. Registered before CORS, so CORS
    wraps it: a 500 without CORS headers reaches the browser as an opaque
    "Failed to fetch". The detail is generic on purpose — raw exception text
    can carry database hostnames and internal paths.
    """
    try:
        return await call_next(request)
    except Exception:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again."})


@app.middleware("http")
async def upload_limit(request, call_next):
    """A CV upload that says it is over 10 MB is refused before its body is read (src/cv/upload.py)."""
    if request.url.path in upload.PATHS and upload.declared_too_big(request.headers.get("content-length")):
        return JSONResponse(status_code=413, content={"detail": str(upload.PdfTooLarge())})
    return await call_next(request)


# Read by the frontend (lib/api.ts) to send analytics' signed_up exactly once.
ACCOUNT_CREATED_HEADER = "X-Account-Created"


@app.middleware("http")
async def account_created_header(request, call_next):
    """
    Accounts are created on a user's first write (resolve_user_id), so only
    the API knows when one is new. That response says so in a header. A
    request that fails says nothing: its transaction may have rolled back.
    """
    news = []
    account_created.set(news)
    response = await call_next(request)
    if news and response.status_code < 400:
        response.headers[ACCOUNT_CREATED_HEADER] = "1"
        daily_counts.count("accounts_created")
    return response


# The browser calls this container directly — a Next.js proxy is not an option,
# because an analysis takes far longer than a serverless function is allowed to
# run. That makes CORS load-bearing: an origin missing from here is refused at
# the preflight with a 400 and the frontend cannot talk to the API at all.
#
# Set ALLOWED_ORIGINS as a comma-separated list on the container app, e.g.
#   ALLOWED_ORIGINS=https://seeglassbox.com,https://www.seeglassbox.com,http://localhost:3000
# (no trailing slash: a browser's Origin header never has one)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

# Vercel gives every preview deployment its own hostname, so they cannot be
# enumerated. Set ALLOWED_ORIGIN_REGEX to admit them, e.g.
#   ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
# Default admits private-LAN dev origins (a phone on the same wifi opening
# the dev server via 192.168.x.x). Production overrides via the env var.
ALLOWED_ORIGIN_REGEX = (
    os.getenv("ALLOWED_ORIGIN_REGEX")
    or r"http://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000"
)

app.add_middleware(GZipMiddleware, minimum_size=1024)  # /market/look: 183 KB of JSON, about 40 KB gzipped
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[ACCOUNT_CREATED_HEADER],
)

# Expected failures, each with its status code. Handled inside CORS, like
# HTTPException, and their messages are written for users.
for exc, code in ((ApplicationNotFound, 404), (JobNotFound, 404), (NoProfile, 404), (NoLatestCV, 404),
                  (UserNotFound, 401), (BookmarkNotRemovable, 409), (ApplicationExists, 409),
                  (StaleLatestCV, 409), (InvalidJobUrl, 422), (InvalidSpreadsheet, 422), (BadAppliedDate, 422),
                  (upload.PdfTooLarge, 413), (upload.NotPdf, 415)):
    app.add_exception_handler(
        exc,
        lambda request, err, code=code: JSONResponse(status_code=code, content={"detail": str(err)}),
    )


async def _pdf_text(data: bytes) -> str:
    """The uploaded PDF's text. pdf_inspector reads from a path, hence the temp file."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        temp.write(data)
    try:
        return await run_in_threadpool(pdf_inspector.extract_text, temp.name)
    finally:
        os.remove(temp.name)


@app.get("/health")
async def health():
    """Cheap liveness probe so the frontend can show whether the API is up."""
    return {"status": "ok"}


# ------------------------------------------------------------ CV analysis

async def _location_preferences(user) -> dict | None:
    """Signed-in users rank by their saved preferences. A failed lookup must never cost the analysis."""
    if not user:
        return None
    try:
        return await run_in_threadpool(user_service.fetch_location_preferences, user)
    except Exception as err:
        print(f"location preferences unavailable: {err}")
        return None


async def _parsed_cv(cv_text: str, file_name, user):
    """
    The CV as a matching profile. A signed-in user's kept profile is reused when
    this is the same text; otherwise the LLM parses it, and for a signed-in user
    the result replaces the kept one. Storage failing never costs the scan.
    """
    if user:
        try:
            kept = await run_in_threadpool(user_service.profile_for_text, user, cv_text)
            if kept is not None:
                return kept
        except Exception as err:
            print(f"kept CV profile unavailable: {err}")
    query = await run_in_threadpool(_agent().parse, cv_text)
    if user:
        try:
            await run_in_threadpool(user_service.store_latest_cv, user, query, file_name, cv_text)
        except Exception as err:
            print(f"CV profile not kept: {err}")
    return query


@app.post("/analyze")
@daily_counts.scan()
async def analyze(file: UploadFile = File(...), user=Depends(optional_user)):
    data = await upload.pdf_bytes(file)  # too big or not a PDF fails here, before the queue
    preferences = await _location_preferences(user)
    # Both steps are synchronous and slow. Running them directly in this async
    # endpoint blocked the event loop, which made the whole API (including
    # /health) unreachable for the duration of every analysis.
    async with analysis_lock:
        cv_text = await _pdf_text(data)
        query = await _parsed_cv(cv_text, file.filename, user)
        result = await run_in_threadpool(_agent().match, query, preferences)
    if user:
        # The scan stored the jobs it found; Opportunities shows them now, not
        # when the user's cached list expires.
        opportunity_service.forget(user)
    return result


@app.post("/analyze/reuse")
@daily_counts.scan("cv_reused")
async def analyze_again(user=Depends(current_user)):
    """A rescan from the kept profile of the latest CV: no upload, no LLM call. Same shape as /analyze."""
    query = await run_in_threadpool(user_service.latest_profile, user)
    preferences = await _location_preferences(user)
    async with analysis_lock:
        result = await run_in_threadpool(_agent().match, query, preferences)
    opportunity_service.forget(user)
    return result


@app.post("/cv/parse")
async def parse_cv(file: UploadFile = File(...)):
    cv_text = await _pdf_text(await upload.pdf_bytes(file))
    return await run_in_threadpool(_cv_parser().parse, cv_text)


# ------------------------------------------------------- the user's data

@app.put("/cv")
async def store_cv(cv: CVQuery, user=Depends(current_user)):
    await run_in_threadpool(user_service.store_cv, user, cv.model_dump())


@app.get("/cv")
async def get_cv(user=Depends(current_user)):
    data = await run_in_threadpool(user_service.fetch_cv, user)
    if data is None:
        raise HTTPException(status_code=404, detail="No Cv saved yet")
    return data


@app.get("/cv/latest")
async def get_latest_cv(user=Depends(current_user)):
    data = await run_in_threadpool(user_service.fetch_latest_cv, user)
    if data is None:
        raise HTTPException(status_code=404, detail="No CV kept yet")
    return data


@app.delete("/cv/latest")
async def delete_latest_cv(user=Depends(current_user)):
    return {"deleted": await run_in_threadpool(user_service.delete_latest_cv, user)}


@app.put("/analysis")
async def store_analysis(body: AnalysisPayload, user=Depends(current_user)):
    await run_in_threadpool(user_service.store_analysis, user, body.analysis, body.file_name)


@app.get("/analysis")
async def get_analysis(user=Depends(current_user)):
    row = await run_in_threadpool(user_service.fetch_analysis, user)
    if row is None:
        raise HTTPException(status_code=404, detail="No analysis saved yet")
    return row


@app.get("/profile/location-preferences")
async def get_location_preferences(user=Depends(current_user)):
    saved = await run_in_threadpool(user_service.fetch_location_preferences, user)
    effective = LocationPreferences.resolve(None, saved=saved)
    return {"saved": saved is not None, **effective.to_dict()}


@app.put("/profile/location-preferences")
async def put_location_preferences(body: LocationPreferencesRequest, user=Depends(current_user)):
    try:
        prefs = LocationPreferences.from_dict(body.model_dump())
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    if prefs.country_code is None:
        raise HTTPException(status_code=422, detail=f"unknown country code {body.country_code!r}")
    await run_in_threadpool(user_service.store_location_preferences, user, prefs.to_dict())
    return prefs.to_dict()


@app.delete("/profile/location-preferences")
async def delete_location_preferences(user=Depends(current_user)):
    await run_in_threadpool(user_service.store_location_preferences, user, None)
    return {"saved": False}


@app.delete("/account/data")
async def delete_my_data(user=Depends(current_user)):
    await run_in_threadpool(user_service.delete_data, user)
    return {"deleted": True}


@app.delete("/account")
async def delete_account(user=Depends(current_user)):
    return {"deleted": await run_in_threadpool(user_service.delete_account, user)}


# ----------------------------------------------------------- opportunities

@app.get("/dashboard/opportunities")
async def opportunities(sort: Literal["newest", "match"] = "newest", user=Depends(current_user)):
    return await run_in_threadpool(opportunity_service.list, user, sort)


# ------------------------------------------------------------ applications

@app.get("/dashboard/applications")
async def list_applications(user=Depends(current_user)):
    return await run_in_threadpool(application_service.list_applications, user)


@app.post("/dashboard/applications")
async def toggle_bookmark(body: BookmarkRequest, user=Depends(current_user)):
    return await run_in_threadpool(application_service.toggle_bookmark, user, **body.model_dump())


@app.post("/dashboard/applications/manual")
async def add_manual_application(body: ManualApplicationRequest, user=Depends(current_user)):
    return {"application_id": await run_in_threadpool(application_service.add_manual, user, **body.model_dump())}


@app.post("/dashboard/applications/extract")
async def extract_job(body: ExtractJobRequest, user=Depends(current_user)):
    # Authenticated so the server's outbound fetch is never an open proxy — and
    # so the review screen can show how the job fits the user's CV.
    candidate = await run_in_threadpool(user_service.candidate, user)
    return await run_in_threadpool(job_url_service.extract, body.url, candidate)


@app.post("/dashboard/applications/from-url")
async def add_url_application(body: UrlApplicationRequest, user=Depends(current_user)):
    return {"application_id": await run_in_threadpool(application_service.add_from_url, user, **body.model_dump())}


@app.post("/dashboard/applications/import/preview")
async def preview_import(file: UploadFile = File(...), mapping: str | None = Form(None),
                         date_order: Literal["dmy", "mdy"] | None = Form(None), user=Depends(current_user)):
    """What importing this spreadsheet would do. Writes nothing; send it again with a corrected mapping."""
    try:
        chosen = json.loads(mapping) if mapping else None
    except json.JSONDecodeError as err:
        raise HTTPException(status_code=422, detail="mapping must be JSON: {column index: field}") from err
    if chosen is not None and not isinstance(chosen, dict):
        raise HTTPException(status_code=422, detail="mapping must be JSON: {column index: field}")
    data = await file.read(MAX_BYTES + 1)  # past the limit is refused; never hold a huge upload in memory
    return await run_in_threadpool(application_import.preview, user, data, file.filename or "", chosen, date_order)


@app.post("/dashboard/applications/import")
async def commit_import(body: ImportRequest, background: BackgroundTasks, user=Depends(current_user)):
    rows = [row.model_dump(mode="json") for row in body.rows]
    result = await run_in_threadpool(application_import.commit, user, rows, body.file_name)
    # Reading each row's posting takes seconds a link: it runs after the response.
    background.add_task(application_import.match_imported, user, result["application_ids"])
    return result


@app.post("/dashboard/applications/delete")
async def delete_applications(body: DeleteApplicationsRequest, user=Depends(current_user)):
    return await run_in_threadpool(application_service.remove_many, user, body.ids)


@app.post("/dashboard/applications/{application_id}/transition")
async def transition_application(application_id: int, body: TransitionRequest, user=Depends(current_user)):
    await run_in_threadpool(application_service.transition, user, application_id, **body.model_dump())
    return {"status": body.to_status}


@app.post("/dashboard/applications/{application_id}/applied")
async def set_applied_date(application_id: int, body: AppliedDateRequest, user=Depends(current_user)):
    return {"applied_at": await run_in_threadpool(application_service.set_applied, user, application_id, body.applied_on)}


@app.delete("/dashboard/applications/{application_id}")
async def delete_application(application_id: int, user=Depends(current_user)):
    await run_in_threadpool(application_service.remove, user, application_id)
    return {"deleted": application_id}


@app.get("/dashboard/applications/{application_id}/history")
async def application_history(application_id: int, user=Depends(current_user)):
    return await run_in_threadpool(application_service.history, user, application_id)
