"""Lever asks for one second between requests (GitHub issue #9). Offline: the clock and HTTP are faked."""
import threading
import time

from src.jobpool import crawl_delay, sources


class Clock:
    """Moves only when a request runs or the pacer sleeps."""

    def __init__(self):
        self.now, self.slept = 0.0, []

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.slept.append(seconds)
        self.now += seconds


def fake_http(clock, log, seconds=0.3):
    lock = threading.Lock()

    def read(url):
        with lock:
            start = clock.now
            clock.now += seconds
            log.append((url, start, clock.now))
        return []
    return read


def paced(monkeypatch):
    clock, log = Clock(), []
    monkeypatch.setattr(sources, "PACER", crawl_delay.Pacer(crawl_delay.DELAYS, clock, clock.sleep))
    monkeypatch.setattr(sources, "_read_json", fake_http(clock, log))
    return clock, log


def test_lever_requests_start_a_second_after_the_last_one_ended(monkeypatch):
    clock, log = paced(monkeypatch)
    threads = [threading.Thread(target=sources.lever, args=(f"co{i}",)) for i in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    lever = sorted((start, end) for url, start, end in log if "api.lever.co" in url)
    assert len(lever) == 6
    gaps = [b[0] - a[1] for a, b in zip(lever, lever[1:])]
    assert min(gaps) >= 1.0


def test_other_sources_are_never_held_back(monkeypatch):
    clock, log = paced(monkeypatch)
    sources.lever("copia")
    for slug in ("stripe", "acme", "plaid"):
        sources._json(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs")
        sources._json(f"https://api.ashbyhq.com/posting-api/job-board/{slug}")
    assert clock.slept == []


def test_a_pasted_lever_link_waits_its_turn_too(monkeypatch):
    # extract.py reads one Lever posting through sources._json.
    clock, log = paced(monkeypatch)
    sources._json("https://api.eu.lever.co/v0/postings/acme/1")
    sources._json("https://api.eu.lever.co/v0/postings/acme/2")
    assert log[1][1] - log[0][2] >= 1.0


def test_lever_boards_run_on_one_worker_of_their_own(monkeypatch):
    # Waiting Lever boards must not sit on the shared pool's threads.
    running, most = [0], [0]
    lock = threading.Lock()

    def board(slug):
        with lock:
            running[0] += 1
            most[0] = max(most[0], running[0])
        time.sleep(0.05)
        with lock:
            running[0] -= 1
        return []
    monkeypatch.setattr(sources, "AGGREGATORS", [])
    monkeypatch.setattr(sources, "KENYAN_BOARDS", {})
    monkeypatch.setattr(sources, "load_boards", lambda: [("lever", f"co{i}") for i in range(6)])
    monkeypatch.setitem(sources.ATS, "lever", board)
    names = {name for name, _, _ in sources.fetch_all(24)}
    assert names == {f"lever:co{i}" for i in range(6)}
    assert most[0] == 1
