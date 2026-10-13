"""
Hosts whose robots.txt asks for a pause between requests (Crawl-delay).

Lever's API hosts ask for one second (checked 2026-10-13, both answer
`Crawl-delay: 1`). The collector reads boards on many threads, so without
this it could ask Lever for several boards at once. Every request to a host
here waits its turn: one at a time, each starting at least `delay` seconds
after the previous one ended. Hosts not listed are never held back.

Remote OK and Jobweb Kenya also publish a Crawl-delay, but each is read with
one request a run, so they need no pacing.
"""
import threading
import time
from urllib.parse import urlsplit

DELAYS = {"api.lever.co": 1.0, "api.eu.lever.co": 1.0}


class Pacer:
    def __init__(self, delays, clock=time.monotonic, sleep=time.sleep):
        self.delays, self.clock, self.sleep = delays, clock, sleep
        self.locks = {host: threading.Lock() for host in delays}
        self.last = {}

    def call(self, url, fetch):
        """fetch(url), after waiting out the host's delay if it has one."""
        host = urlsplit(url).hostname
        if host not in self.delays:
            return fetch(url)
        with self.locks[host]:
            if host in self.last:
                wait = self.last[host] + self.delays[host] - self.clock()
                if wait > 0:
                    self.sleep(wait)
            try:
                return fetch(url)
            finally:
                self.last[host] = self.clock()


PACER = Pacer(DELAYS)
