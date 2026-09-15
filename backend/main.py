"""
The HTTP API. Routes only translate between HTTP and the services:
authentication, request models and status codes live here; the work does not.

    /analyze, /cv/parse         CV analysis (src/Agent)
    /cv, /analysis, /profile    the user's own data (services/users.py)
    /dashboard/applications     the tracker (services/applications.py)
    .../extract                 pasted job links (src/jobpool)
"""
import asyncio
import os
import tempfile
import traceback
from contextlib import asynccontextmanager
from functools import cache

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pdf_inspector import pdf_inspector

from src.Agent.utils.location import LocationPreferences
from src.Agent.utils.types import (
    AnalysisPayload, BookmarkRequest, CVQuery, ExtractJobRequest, LocationPreferencesRequest,
    ManualApplicationRequest, TransitionRequest, UrlApplicationRequest,
)
from src.cv.current_user import current_user, optional_user
from src.database.services.applications import (
    ApplicationExists, ApplicationNotFound, BookmarkNotRemovable, JobNotFound, application_service,
)
from src.database.services.users import UserNotFound, user_service
from src.jobpool.extract import InvalidJobUrl
from src.jobpool.service import job_url_service


# The analysis stack (SkillNer matchers, sentence-transformers, spaCy) takes
# ~10s to import on the container and ~20s locally. Imported at the top of this
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


def _warm_analysis_stack():
    try:
        _agent()
        print("analysis stack loaded")
    except Exception as err:
        # /analyze re-raises this on use; the rest of the API is unaffected.
        print(f"analysis stack failed to load: {err}")


@asynccontextmanager
async def lifespan(_app):
    asyncio.get_running_loop().run_in_executor(None, _warm_analysis_stack)
    yield


app = FastAPI(lifespan=lifespan)

# One analysis at a time. The work is moved off the event loop so the server
# stays responsive, but spaCy/SkillNer pipelines are shared mutable objects and
# are not safe to run concurrently, so requests queue rather than overlap.
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


# The browser calls this container directly — a Next.js proxy is not an option,
# because an analysis takes far longer than a serverless function is allowed to
# run. That makes CORS load-bearing: an origin missing from here is refused at
# the preflight with a 400 and the frontend cannot talk to the API at all.
#
# Set ALLOWED_ORIGINS as a comma-separated list on the container app, e.g.
#   ALLOWED_ORIGINS=https://jobradar-frontend-pearl.vercel.app/,http://localhost:3000
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Expected failures, each with its status code. Handled inside CORS, like
# HTTPException, and their messages are written for users.
for exc, code in ((ApplicationNotFound, 404), (JobNotFound, 404), (UserNotFound, 401),
                  (BookmarkNotRemovable, 409), (ApplicationExists, 409), (InvalidJobUrl, 422)):
    app.add_exception_handler(
        exc,
        lambda request, err, code=code: JSONResponse(status_code=code, content={"detail": str(err)}),
    )


async def _pdf_text(file: UploadFile) -> str:
    """The uploaded PDF's text. pdf_inspector reads from a path, hence the temp file."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        temp.write(await file.read())
    try:
        return await run_in_threadpool(pdf_inspector.extract_text, temp.name)
    finally:
        os.remove(temp.name)


@app.get("/health")
async def health():
    """Cheap liveness probe so the frontend can show whether the API is up."""
    return {"status": "ok"}


# ------------------------------------------------------------ CV analysis

@app.post("/analyze")
async def analyze(file: UploadFile = File(...), user=Depends(optional_user)):
    # Signed-in users rank by their saved location preferences; everyone else
    # by the CV's location. A failed lookup must never cost the analysis.
    preferences = None
    if user:
        try:
            preferences = await run_in_threadpool(user_service.fetch_location_preferences, user)
        except Exception as err:
            print(f"location preferences unavailable: {err}")

    # Both steps are synchronous and slow. Running them directly in this async
    # endpoint blocked the event loop, which made the whole API (including
    # /health) unreachable for the duration of every analysis.
    async with analysis_lock:
        cv_text = await _pdf_text(file)
        return await run_in_threadpool(_agent().run, cv_text, preferences)


@app.post("/cv/parse")
async def parse_cv(file: UploadFile = File(...)):
    cv_text = await _pdf_text(file)
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
    # Authenticated so the server's outbound fetch is never an open proxy.
    return await run_in_threadpool(job_url_service.extract, body.url)


@app.post("/dashboard/applications/from-url")
async def add_url_application(body: UrlApplicationRequest, user=Depends(current_user)):
    return {"application_id": await run_in_threadpool(application_service.add_from_url, user, **body.model_dump())}


@app.post("/dashboard/applications/{application_id}/transition")
async def transition_application(application_id: int, body: TransitionRequest, user=Depends(current_user)):
    await run_in_threadpool(application_service.transition, user, application_id, **body.model_dump())
    return {"status": body.to_status}


@app.delete("/dashboard/applications/{application_id}")
async def delete_application(application_id: int, user=Depends(current_user)):
    await run_in_threadpool(application_service.remove, user, application_id)
    return {"deleted": application_id}


@app.get("/dashboard/applications/{application_id}/history")
async def application_history(application_id: int, user=Depends(current_user)):
    return await run_in_threadpool(application_service.history, user, application_id)
