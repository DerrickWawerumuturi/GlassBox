"""SSRF guard for POST /dashboard/applications/extract. No network access needed."""
import socket
import urllib.error
import urllib.request

import pytest

from src.jobpool import extract as ex


def fake_dns(mapping):
    def getaddrinfo(host, port, *args, **kwargs):
        if host not in mapping:
            raise socket.gaierror("not found")
        return [(socket.AF_INET6 if ":" in ip else socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port))
                for ip in mapping[host]]
    return getaddrinfo


@pytest.fixture(autouse=True)
def dns(monkeypatch):
    monkeypatch.setattr(ex.socket, "getaddrinfo", fake_dns({
        "jobs.example.com": ["93.184.216.34"],
        "rebind.example.com": ["93.184.216.34", "10.0.0.5"],
        "v6-mapped.example.com": ["::ffff:127.0.0.1"],
        "scoped.example.com": ["fe80::1%lo0"],
        "multicast.example.com": ["224.0.0.1"],
        "cgnat.example.com": ["100.64.1.1"],
        "metadata.google.internal": ["169.254.169.254"],
        "127.0.0.1": ["127.0.0.1"], "169.254.169.254": ["169.254.169.254"], "::1": ["::1"],
        "10.1.2.3": ["10.1.2.3"], "192.168.1.1": ["192.168.1.1"], "0.0.0.0": ["0.0.0.0"],
    }))


@pytest.mark.parametrize("url", [
    "ftp://jobs.example.com/x", "file:///etc/passwd", "gopher://jobs.example.com/", "javascript:alert(1)",
    "data:text/html,hi", "http://localhost/", "http://api.localhost/", "http://printer.local/",
    "http://metadata.google.internal/", "http://127.0.0.1/", "http://169.254.169.254/latest/meta-data",
    "http://[::1]/", "http://10.1.2.3/", "http://192.168.1.1/", "http://0.0.0.0/",
    "http://v6-mapped.example.com/", "http://scoped.example.com/", "http://multicast.example.com/",
    "http://cgnat.example.com/", "http://rebind.example.com/", "http://jobs.example.com:8080/",
    "http://user:pw@jobs.example.com/", "http://nosuchhost.example.com/", "not a url", "",
])
def test_rejected(url):
    with pytest.raises(ex.InvalidJobUrl):
        ex._check_public(url)


@pytest.mark.parametrize("url", ["https://jobs.example.com/role/1", "http://jobs.example.com:443/x", "https://JOBS.example.com./a"])
def test_allowed(url):
    ex._check_public(url)


def test_redirect_to_private_address_is_refused():
    req = urllib.request.Request("https://jobs.example.com/apply")
    handler = ex._SafeRedirects()
    # urllib resolves relative Location headers before calling redirect_request.
    for target in ("http://169.254.169.254/latest/meta-data", "file:///etc/passwd",
                   "http://localhost:8000/", "http://jobs.example.com:6379/"):
        with pytest.raises(ex.InvalidJobUrl):
            handler.redirect_request(req, None, 302, "Found", {}, target)


def test_relative_redirect_on_public_host_is_allowed():
    req = urllib.request.Request("https://jobs.example.com/apply")
    assert ex._SafeRedirects().redirect_request(req, None, 302, "Found", {}, "https://jobs.example.com/role/2") is not None


def test_opener_only_speaks_http():
    kinds = {type(h).__name__ for h in ex._opener.handlers}
    assert not kinds & {"FileHandler", "FTPHandler", "DataHandler"}
    for url in ("file:///etc/passwd", "ftp://jobs.example.com/", "data:text/plain,x"):
        with pytest.raises(urllib.error.URLError):
            ex._opener.open(url)


def test_redirect_limit():
    assert ex._SafeRedirects.max_redirections <= 5


def test_extract_reports_invalid_url_before_any_fetch(monkeypatch):
    monkeypatch.setattr(ex, "_fetch", lambda url: pytest.fail("fetched a rejected URL"))
    monkeypatch.setattr(ex, "_from_ats", lambda url: pytest.fail("called an ATS for a rejected URL"))
    with pytest.raises(ex.InvalidJobUrl):
        ex.extract("http://169.254.169.254/latest/meta-data")
