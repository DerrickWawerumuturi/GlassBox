import os
import time

from dotenv import find_dotenv, load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool, PoolTimeout

load_dotenv(find_dotenv())

# Connect timeout is short and min_size is 0 because Neon scales to zero: an
# idle database costs one slow request, and an unreachable one must fail fast
# enough that persistence stays optional rather than stalling an analysis.
CONNECT_TIMEOUT = 10
# The collector can wait where a request can't: one more try after a pause.
# A cold Neon compute took longer than CONNECT_TIMEOUT on 25 and 27 Sep 2026,
# and with no retry both runs stored nothing.
WAKE_BACKOFF_SECONDS = 15

_pool: ConnectionPool | None = None


def is_configured() -> bool:
    return bool(os.getenv("DATABASE_URL"))


def runtime_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url


def migration_url() -> str:
    """
    DDL goes to the direct endpoint where one is configured.

    DATABASE_URL points at Neon's -pooler host, which is PgBouncer in
    transaction mode. It carries ordinary DML fine but is the wrong place for
    CREATE EXTENSION and other session-scoped statements.
    """
    return os.getenv("DATABASE_URL_DIRECT") or runtime_url()


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=runtime_url(),
            min_size=0,
            max_size=int(os.getenv("JOBRADAR_DB_POOL_SIZE", "4")),
            timeout=CONNECT_TIMEOUT,
            # PgBouncer in transaction mode hands the next transaction a
            # different backend, so psycopg's automatic prepared statements
            # (after the 5th execution of a query) start failing with
            # "prepared statement already exists". Disabled rather than debugged
            # intermittently later.
            kwargs={"prepare_threshold": None, "row_factory": dict_row},
            open=True,
        )
    return _pool


def connection():
    """Pooled connection; the transaction commits on clean exit."""
    return get_pool().connection()


def wake(retries: int = 1, backoff: float = WAKE_BACKOFF_SECONDS, sleep=time.sleep) -> None:
    """
    Make sure the database answers before a batch job writes: one retry, after
    a pause, when the first connection times out. Raises the last PoolTimeout.
    Requests never call this; they stay fail fast.
    """
    for attempt in range(retries + 1):
        try:
            with connection() as conn, conn.cursor() as cur:
                cur.execute("select 1")
            return
        except PoolTimeout:
            if attempt == retries:
                raise
            print(f"database did not answer in {CONNECT_TIMEOUT}s; trying again in {backoff:.0f}s")
            sleep(backoff)
