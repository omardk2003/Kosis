# ADR-0003: Time model, timezone history, week start
Status: Accepted · 2026-11-11 · Detail: architecture §4.2, §5

## Decision
- A day is a local date in the profile timezone. The domain uses epoch-day integers with no date library.
- **One clock authority:** the database computes `(lo, hi) = private.server_today(user, now)` from the timezone events in the last 24 h. Without a recent timezone change, `lo = hi`.
  - Upper bounds use `lo`.
  - Lower bounds use `hi − 7`.
  - An entry is on time only if `d = hi` (owner decision D2).
- Timezones are validated against `pg_timezone_names`, excluding `posix/*` and `right/*`.
- Week start is chosen at onboarding and **immutable in MVP**.

## Consequences
- For 24 h after a timezone change, entries for the previous date are honestly marked "logged later".
- A golden test vector file checks that JS (`Intl`) and Postgres agree.
