# Scan counter writes finish cleanly

Daily scan counters still write off the request path, so a database error never
changes an `/analyze` response. Counter failures now log only the affected
counter names and exception type; driver error text is omitted. The API waits
up to ten seconds for queued counter writes during normal lifespan shutdown.
Writes are not retried because a lost commit acknowledgement could duplicate an
atomic increment. A forced kill or a drain timeout can still leave a count
unwritten.

The PostHog browser events and API counters describe different stages and may
legitimately differ. See `docs/decisions/analytics.md` for the definitions.
