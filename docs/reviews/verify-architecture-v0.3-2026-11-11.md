# Verification: architecture v0.3 against review v0.2 (B1–B6)

Reviewer: `lead-architect` · 2026-11-11 · **Verdict: APPROVE WITH CHANGES** (V1–V3 must be fixed before the first migration)

| # | Status | Evidence |
|---|---|---|
| B1 | RESOLVED | arch §4.2 and §4.3 `set_habit_status` (pause/archive = today+1, resume = today); spec AC-H4/H5/H8; testing H18. Stale comment at §4.1 `habit_status_events.effective_on` ("always = local today") needs fixing. |
| B2 | PARTIALLY | §4.2 `server_today` closes pre-logging, but see V1. |
| B3 | RESOLVED | §4.1 `unique (id, user_id)` and composite FK on `completion_voids`; §4.3 `void_completion` accepts only `undo`/`correction` within today−7. |
| B4 | RESOLVED | §4.2 shared `private.entry_lock_key`; §4.3 `replace_with_full` checks owner, non-voided, minimum, window and active status, and runs in one transaction. |
| B5 | PARTIALLY | Design is right (§4.3, testing H17), but the grants SQL is defective (V2). Deviating to the `p_now` clock is accepted, and it's better than `app_now()`. |
| B6 | RESOLVED | §4.4 widens the window and has the DB return `today`; §6 lists every requested function. Blocked in practice by V3. |

## New blocking findings

**V1. `server_today` min still lets users evade "late"** (§4.2, §4.3 pseudo-code). My B2 fix was wrong. At 01:00 UTC on D+1, a user can switch to UTC−12, where min(today) = D, and log D as `on_time`. Repeated switching gives a permanent window extension of about 12 h. Using the min also stretches the lower bound back by a day. *Fix:* `server_today` returns `lo` (min) and `hi` (max). Upper bounds use `lo`, lower bounds (`− 7`) use `hi`, and `source = on_time` only if `d = hi`. `get_today` returns `lo`. If no event rows exist, fall back to `profiles.timezone` (today a NULL fails closed). Same D2 trade-off.

**V2. The grants SQL fails or does nothing** (§4.3 grants block).
- `revoke all on all tables, functions, sequences in schema public` is a syntax error. Write one statement per object type.
- Postgres can't revoke the global PUBLIC EXECUTE default per schema, so the function line is a no-op. Add `alter default privileges for role postgres revoke execute on functions from public;` with no `in schema`, and use `for role postgres` on every line.

**V3. INVOKER reads can't reach `private`** (§4.3 and §4.4). `get_today`/`get_progress` run as `authenticated`, which has no USAGE on `private`. As a result, `server_today` and the `p_now` injection fail. *Fix:* grant `usage on schema private` and `execute` on the INVOKER read helpers only to `authenticated`, keep `private` out of the exposed schemas, and extend H17 to check that no `private` DEFINER function is executable by `authenticated`.

Note: ADRs 0002/0003/0006 don't exist yet. They're needed before Phase 1.
