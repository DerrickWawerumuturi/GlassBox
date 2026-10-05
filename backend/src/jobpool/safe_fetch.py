"""
Fetch a page a stranger chose, without letting them aim the server at anything private.

    fetch_page(url) -> (final url, html)

POST /market/ad is public, so unlike extract.py (signed in only) its fetch is
open to anyone. Every rule from extract.py applies, plus two it does not have:

- The address is pinned. Each hop resolves the host once, checks every address
  it got, and then connects to that checked address with the original name sent
  as Host and TLS SNI. A DNS answer that changes between the check and the
  connect (rebinding) never gets a second lookup to change into.
- Hard limits: 8 s, 2 MB read as a stream, 3 redirects, each one checked again.

Errors are short sentences for the page: BlockedLink (400) for an address that
is never fetched, UnreadableLink (422) for a page that could not be read.
"""
import ipaddress
import socket
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx

from src.jobpool import sources
from src.jobpool.extract import ALLOWED_PORTS, BLOCKED_SUFFIXES, HTML_TYPES, _is_public_ip

TIMEOUT = 8.0
MAX_BYTES = 2_000_000
MAX_REDIRECTS = 3
# Names that are private whatever DNS says about them.
BLOCKED_HOSTS = frozenset({"localhost", "metadata.google.internal", "metadata", "instance-data"})

CANT_READ = "That link can't be read."
BLOCKED = "That link points to a private address."


class BlockedLink(ValueError):
    pass


class UnreadableLink(ValueError):
    pass


def check(url: str) -> tuple[str, int, str]:
    """(host, port, checked IP) for a URL that may be fetched; raises BlockedLink otherwise."""
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError:
        raise BlockedLink("That isn't a web link.")
    host = (parts.hostname or "").lower().rstrip(".")
    if parts.scheme not in ("http", "https"):
        raise BlockedLink("Only http and https links can be read.")
    if not host or parts.username or parts.password:
        raise BlockedLink("That isn't a web link.")
    port = port or (443 if parts.scheme == "https" else 80)
    if port not in ALLOWED_PORTS:
        raise BlockedLink("Only standard web addresses can be read.")
    if host in BLOCKED_HOSTS or host.endswith(BLOCKED_SUFFIXES):
        raise BlockedLink(BLOCKED)
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError):
        raise UnreadableLink(CANT_READ)
    addresses = [info[4][0] for info in infos]
    # Every answer must be public: a name with one public and one private
    # address is a rebinding setup, whichever one a connect would pick.
    if not addresses or not all(_is_public_ip(a) for a in addresses):
        raise BlockedLink(BLOCKED)
    return host, port, addresses[0].split("%", 1)[0]


def _pinned(url: str, ip: str, port: int) -> str:
    """The URL with its host replaced by the checked IP."""
    parts = urlsplit(url)
    literal = f"[{ip}]" if isinstance(ipaddress.ip_address(ip), ipaddress.IPv6Address) else ip
    return urlunsplit((parts.scheme, f"{literal}:{port}", parts.path or "/", parts.query, ""))


def _read(response: httpx.Response) -> str:
    kind = response.headers.get("content-type", "").split(";")[0].strip().lower()
    if kind and kind not in HTML_TYPES and kind != "text/plain":
        raise UnreadableLink(CANT_READ)
    body = bytearray()
    for chunk in response.iter_bytes():
        body += chunk
        if len(body) >= MAX_BYTES:
            # Stop reading here: the rest is never downloaded.
            del body[MAX_BYTES:]
            break
    return body.decode(response.encoding or "utf-8", "ignore")


def fetch_page(url: str, transport: httpx.BaseTransport | None = None) -> tuple[str, str]:
    """(final url, body). `transport` is for tests; production uses httpx's own."""
    # trust_env=False: a proxy from the environment would do its own DNS lookup.
    with httpx.Client(timeout=TIMEOUT, follow_redirects=False, trust_env=False, transport=transport) as client:
        for _ in range(MAX_REDIRECTS + 1):
            host, port, ip = check(url)
            scheme = urlsplit(url).scheme
            default_port = 443 if scheme == "https" else 80
            headers = {**sources.UA, "Accept": "text/html,application/xhtml+xml",
                       "Host": host if port == default_port else f"{host}:{port}"}
            # The certificate is checked against sni_hostname, so HTTPS still proves it is `host`.
            extensions = {"sni_hostname": host} if scheme == "https" else {}
            try:
                with client.stream("GET", _pinned(url, ip, port), headers=headers, extensions=extensions) as response:
                    if response.is_redirect:
                        location = response.headers.get("location")
                        if not location:
                            raise UnreadableLink(CANT_READ)
                        url = urljoin(url, location)
                        continue
                    if response.status_code >= 400:
                        raise UnreadableLink(CANT_READ)
                    return url, _read(response)
            except httpx.HTTPError:
                raise UnreadableLink(CANT_READ)
    raise UnreadableLink(CANT_READ)
