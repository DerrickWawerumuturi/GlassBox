import jwt
from dotenv import find_dotenv, load_dotenv
import os
from fastapi import Header, HTTPException
from typing import Annotated
load_dotenv(find_dotenv())

ALGORITHM = "HS256"
SECRET = os.environ["API_JWT_SECRET"]


def current_user(authorization: Annotated[str, Header()]):
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        # PyJWTError, not DecodeError: an expired token raises ExpiredSignatureError,
        # which DecodeError does not cover, and used to surface as a 500.
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def optional_user(authorization: Annotated[str | None, Header()] = None):
    """The caller's claims when a valid token is sent, else None. Never refuses."""
    if not authorization:
        return None
    try:
        return jwt.decode(authorization.removeprefix("Bearer ").strip(), SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
