"""SSRF guard for POST /market/ad's link reading. DNS and HTTP are faked: no network."""
import socket

import httpx
import pytest

from src.jobpool import safe_fetch as sf

PUBLIC = "93.184.216.34"


def fake_dns(mapping, calls=None):
    def getaddrinfo(host, port, *args, **kwargs):
        if calls is not None:
            calls.append(host)
        answer = mapping.get(host)
        if callable(answer):
            answer = answer()
        if not answer:
            raise socket.gaierror("not found")
        return [(socket.AF_INET6 if ":" in ip else socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port))
                for ip in answer]
    return getaddrinfo


@pytest.fixture(autouse=True)
def dns(monkeypatch):
    monkeypatch.setattr(sf.socket, "getaddrinfo", fake_dns({
        "jobs.example.com": [PUBLIC],
        "v6.example.com": ["2606:2800:220:1:248:1893:25c8:1946"],
        "inside.example.com": ["10.0.0.5"],
        "half.example.com": [PUBLIC, "192.168.1.10"],
        "mapped.example.com": ["::ffff:127.0.0.1"],
        "metadata.google.internal": ["169.254.169.254"],
        **{ip: [ip] for ip in ("10.1.2.3", "10.0.0.5", "172.16.0.1", "192.168.1.1", "127.0.0.1", "169.254.169.254",
                               "::1", "::ffff:127.0.0.1", "0.0.0.0", "224.0.0.1", PUBLIC)},
    }))


@pytest.mark.parametrize("url", [
    "http://10.1.2.3/", "http://172.16.0.1/", "http://192.168.1.1/", "http://127.0.0.1/",
    "http://169.254.169.254/latest/meta-data", "http://localhost/", "http://LOCALHOST./", "http://[::1]/",
    "http://[::ffff:127.0.0.1]/", "http://0.0.0.0/", "http://224.0.0.1/", "http://metadata.google.internal/",
    "http://api.localhost/", "http://printer.local/",
    "file:///etc/passwd", "ftp://jobs.example.com/x", "gopher://jobs.example.com/",
    "http://inside.example.com/job",         # a public-looking name resolving to a private address
    "http://half.example.com/job",           # one private answer is enough
    "http://mapped.example.com/job",         # IPv4-mapped loopback
    "http://jobs.example.com:6379/", "http://user:pw@jobs.example.com/",
])
def test_blocked(url):
    with pytest.raises(sf.BlockedLink):
        sf.check(url)


@pytest.mark.parametrize("url", ["https://jobs.example.com/role/1", "http://jobs.example.com/",
                                 "https://JOBS.example.com./a", "https://v6.example.com/", f"http://{PUBLIC}/"])
def test_public_addresses_are_allowed(url):
    host, port, ip = sf.check(url)
    assert ip in (PUBLIC, "2606:2800:220:1:248:1893:25c8:1946")


def test_a_name_that_does_not_resolve_cannot_be_read():
    with pytest.raises(sf.UnreadableLink):
        sf.check("https://nosuchhost.example.com/")


def page(html="<html><title>Job</title><p>Python</p></html>", status=200, headers=None):
    return httpx.Response(status, headers={"content-type": "text/html; charset=utf-8", **(headers or {})},
                          content=html.encode())


def test_connects_to_the_checked_address_with_the_name_as_host_and_sni():
    seen = []

    def handler(request):
        seen.append(request)
        return page()

    final, body = sf.fetch_page("https://jobs.example.com/role/1?x=1", transport=httpx.MockTransport(handler))
    assert final == "https://jobs.example.com/role/1?x=1" and "Python" in body
    request = seen[0]
    assert request.url.host == PUBLIC and request.url.path == "/role/1" and request.url.query == b"x=1"
    assert request.headers["host"] == "jobs.example.com"
    assert request.extensions["sni_hostname"] == "jobs.example.com"


def test_dns_is_asked_once_per_hop_so_a_rebind_cannot_slip_in(monkeypatch):
    # First answer public, every later one private: a second lookup at connect
    # time would reach 127.0.0.1. Pinning means there is no second lookup.
    answers, calls, seen = iter([[PUBLIC]]), [], []
    monkeypatch.setattr(sf.socket, "getaddrinfo",
                        fake_dns({"rebind.example.com": lambda: next(answers, ["127.0.0.1"])}, calls))
    sf.fetch_page("http://rebind.example.com/", transport=httpx.MockTransport(lambda r: seen.append(r) or page()))
    assert calls == ["rebind.example.com"]
    assert [r.url.host for r in seen] == [PUBLIC]


def test_a_redirect_to_a_private_address_is_refused_before_it_is_followed():
    seen = []

    def handler(request):
        seen.append(request.url.host)
        return httpx.Response(302, headers={"location": "http://10.0.0.5/admin"})

    with pytest.raises(sf.BlockedLink):
        sf.fetch_page("https://jobs.example.com/apply", transport=httpx.MockTransport(handler))
    assert seen == [PUBLIC]


def test_a_redirect_to_a_name_that_resolves_privately_is_refused():
    transport = httpx.MockTransport(lambda r: httpx.Response(301, headers={"location": "http://inside.example.com/"}))
    with pytest.raises(sf.BlockedLink):
        sf.fetch_page("https://jobs.example.com/apply", transport=transport)


def test_a_relative_redirect_is_followed_and_rechecked():
    def handler(request):
        if request.url.path == "/old":
            return httpx.Response(302, headers={"location": "/new"})
        return page()

    final, _ = sf.fetch_page("https://jobs.example.com/old", transport=httpx.MockTransport(handler))
    assert final == "https://jobs.example.com/new"


def test_at_most_three_redirects():
    hops = []

    def handler(request):
        hops.append(request.url.path)
        return httpx.Response(302, headers={"location": f"/hop{len(hops)}"})

    with pytest.raises(sf.UnreadableLink):
        sf.fetch_page("https://jobs.example.com/start", transport=httpx.MockTransport(handler))
    assert len(hops) == sf.MAX_REDIRECTS + 1


def test_the_body_is_cut_at_the_cap():
    big = "<p>" + "a" * (sf.MAX_BYTES * 2) + "</p>"
    _, body = sf.fetch_page("https://jobs.example.com/", transport=httpx.MockTransport(lambda r: page(big)))
    assert len(body) == sf.MAX_BYTES


@pytest.mark.parametrize("response", [
    httpx.Response(404, content=b"gone"),
    httpx.Response(200, headers={"content-type": "application/pdf"}, content=b"%PDF"),
])
def test_an_error_or_a_non_page_cannot_be_read(response):
    with pytest.raises(sf.UnreadableLink):
        sf.fetch_page("https://jobs.example.com/", transport=httpx.MockTransport(lambda r: response))


def test_a_network_failure_cannot_be_read():
    def handler(request):
        raise httpx.ConnectTimeout("slow")

    with pytest.raises(sf.UnreadableLink):
        sf.fetch_page("https://jobs.example.com/", transport=httpx.MockTransport(handler))


def test_limits():
    assert sf.TIMEOUT <= 10 and sf.MAX_BYTES <= 2_000_000 and sf.MAX_REDIRECTS <= 3
