"""
A per client cap on the public routes that cost us work (POST /market/ad
fetches pages for anyone). In memory, per replica: the app runs one replica
(decisions/deployment.md). With more replicas each keeps its own count, so a
client could get `limit` per replica; that needs a shared store (decisions/market-look.md).

Who the client is: the address that connected, unless that address is the
platform's ingress (a private or shared address), in which case the last X-Forwarded-For
entry, the one the ingress appended. Earlier entries are whatever the client
sent and are never trusted.
"""
import ipaddress
import threading
import time
from collections import deque

from fastapi import HTTPException, Request

TOO_MANY = "That's a lot of ads for one hour. Try again soon."
MAX_CLIENTS = 50_000  # bounds memory: past this, the stalest clients are forgotten


def _is_ingress(address: str | None) -> bool:
    try:
        ip = ipaddress.ip_address(address or "")
    except ValueError:
        return False
    # Private, loopback and the shared range (100.64.0.0/10) Azure's ingress uses.
    return not ip.is_global


def client_key(peer: str | None, forwarded_for: str | None) -> str:
    """The client's address: the ingress's last X-Forwarded-For hop, or the peer itself."""
    if forwarded_for and _is_ingress(peer):
        last = forwarded_for.split(",")[-1].strip()
        try:
            return str(ipaddress.ip_address(last))
        except ValueError:
            pass
    return peer or "unknown"


class RateLimit:
    """At most `limit` calls per client in any `window` seconds (a sliding window)."""

    def __init__(self, limit: int, window: float, clock=time.monotonic):
        self.limit, self.window, self.clock = limit, window, clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> float:
        """0 when the call may go ahead (and counts it); otherwise seconds until it may."""
        now = self.clock()
        with self._lock:
            hits = self._hits.get(key)
            if hits is None:
                if len(self._hits) >= MAX_CLIENTS:
                    self._forget(now)
                hits = self._hits[key] = deque()
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return self.window - (now - hits[0])
            hits.append(now)
            return 0.0

    def _forget(self, now: float) -> None:
        for key in [k for k, h in self._hits.items() if not h or now - h[-1] >= self.window]:
            del self._hits[key]
        while len(self._hits) >= MAX_CLIENTS:  # all still active: drop the stalest
            del self._hits[min(self._hits, key=lambda k: self._hits[k][-1])]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def __call__(self, request: Request) -> None:
        """A FastAPI dependency: 429 with the friendly line once the client is over."""
        key = client_key(request.client.host if request.client else None, request.headers.get("x-forwarded-for"))
        wait = self.allow(key)
        if wait:
            raise HTTPException(status_code=429, detail=TOO_MANY, headers={"Retry-After": str(max(1, int(wait) + 1))})


ads = RateLimit(limit=20, window=3600)
