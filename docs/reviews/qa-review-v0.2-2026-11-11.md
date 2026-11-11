# QA review of spec set v0.2 (testability), 2026-11-11

**Verdict: APPROVE WITH CHANGES.** The honesty suite is strong. The blockers below are a clock seam, a few ambiguous rules and phasing conflicts.

## Findings

1. **BLOCKING. testing-strategy §3, architecture §4.3 (clock control).** A "test-only `now()` override" cannot work. `pg_catalog.now()` can't be shadowed under `search_path=''`, and `logged_at`/`created_at` use `default now()`. Boundary tests (H13, H14, AC-H3, AC-W5) would otherwise depend on the real clock and flake near midnight.
   Fix: put logic in internal functions in a non-exposed schema, e.g. `private.log_completion(p_now timestamptz, ...)`. Public RPCs are thin wrappers that pass `now()`. Pass `logged_at` explicitly. Tests call the internal functions. No GUC and no test code in the production path. Add a shared golden-vector file of (instant, tz → date) run by both Vitest (`Intl`) and pgTAP, to catch tzdata or implementation drift. Pin tzdata.

2. **BLOCKING. product-spec §7.1/§7.4 vs AC-A1 (weekly "needs today").** `remaining_needed` and `remaining_days_including_today` are undefined for:
   - a partial creation week (N or pro-rated?)
   - a mid-week pause
   - a pending goal change
   - week start Sun vs Mon

   Fix: define `remaining_needed = max(0, target_this_week − distinct_done)`, with `target_this_week` = the §7.1 planned value. Define `remaining_days` = active days from today to week end. Fixtures: last day of week (1 day left, 1 needed → candidate; 0 needed → not), the same on a Sunday week start, creation on Thursday, paused Wednesday.

3. **BLOCKING. product-spec §3/§7.2 (pause or archive after completing today).** Today's entry then sits on a non-active day and is silently excluded from "completed". That is a stat-honesty hole. Fix: spec decision. Either count entries on any day for the numerator, or block pause/archive on a day with an entry. Add an H-test either way.

4. **BLOCKING. architecture §4.3 `replace_with_full`, AC-L5.** Four problems:
   - No advisory lock, so a race with `log_completion` can produce two entries.
   - No window or status check, so an old entry could be replaced.
   - "`source` recomputed against now" turns an on-time entry into "late".
   - It doesn't say what happens when called on a `full` entry.

   Fix: keep the original `source`, or specify the behavior. Take the same lock. Require `variant = 'minimum'` and the entry not voided. Re-run the H14 window check. Add a concurrency test (two transactions) to H6.

5. **BLOCKING. testing-strategy §6 vs mvp-roadmap.** Phase 3 exit lists E2E 4, but the recovery card is Phase 4. Flow 2 mixes Phase 2 (undo-as-void on Today) with Phase 3 (Progress). Flows 5 and 6 also span Phases 2 and 3.
   Fix: split 2a/2b, 4a (late log, Phase 3)/4b (recovery, Phase 4), 5, 6. Roadmap Phase 3 exit becomes "2b, 4a, 5, 6". Move offline cached-shell checks from flow 10 to Phase 5. Add a **core-loop smoke** (create habit → Today → Action Mode → done → Progress → late log → reflection), required at Phase 4 exit. QA's acceptance criteria demand it, and no flow covers it today.

6. **BLOCKING. testing-strategy §7 (traceability).** The table is a placeholder. Several ACs have no planned test (see draft rows below). Seed it now with one row per AC, so Phase 5's "every AC traced" is checkable.

7. **NON-BLOCKING. §4 H2/H1 vs `delete_habit`.** H2 says no RPC deletes entries, but the `delete_habit` cascade does (AC-H6). Fix: H2 "except via `delete_habit` and account-deletion cascade". Test that the cascade removes entries, voids and dismissals, and only the caller's rows. Dismissals keyed by `habit_id:date` have no FK, so check for orphans. Add a catalog-driven **H17**:
   - every `public` table has RLS enabled and no write grants
   - every function has `EXECUTE` revoked from `anon`/`public`
   - every `SECURITY DEFINER` function has `search_path=''`

   This is future-proof against new tables.

8. **NON-BLOCKING. Reflection window (AC-W5, §4.3).** Add fixtures:
   - `week_start+13` accepted, `+14` rejected
   - a non-week-start date rejected
   - a future week rejected
   - `feeling` of 0 or 6 rejected
   - text over 1000 characters rejected
   - "edited <date>" shown only when content changes after creation (undefined today; use `updated_at > created_at` plus a changed-content flag)
   - E2E 8 uses Playwright `clock` for the 7-day lock

9. **NON-BLOCKING. OTP (AC-O1/O5, architecture §7).** No test exists for any of these:
   - rate limit (local `config.toml` value; assert a 429 maps to a calm message)
   - wrong or expired code
   - identical UI response for registered and unregistered emails
   - account deletion refused without a fresh OTP

   Add them to flows 1 and 12, plus a DB/server test.

10. **NON-BLOCKING. Creation-week goal correction (AC-H3).** Add fixtures:
    - created on week start (full week)
    - created on the last day
    - correct twice (the newest `seq` wins)
    - change on day 8, which gives `effective_from` = next week start
    - two changes in one week, where the second supersedes the pending version
    - `change_goal` on a paused or archived habit (undefined; spec it)

11. **NON-BLOCKING. Time fixtures (§5).** The westward move (UTC+10 → UTC−7) makes `today` go backwards. An entry for "tomorrow" then exists, and `created_on` may be after today. State the expected result. Add:
    - Pacific/Apia 2011-12-30 (a real skipped date)
    - Asia/Kolkata and Asia/Kathmandu (non-hour offsets)
    - America/Havana (a DST gap at 00:00)
    - Lord Howe (a 30-minute DST step)
    - an `Intl` "24:00" `hourCycle` guard
    - a week-start-Sunday leap-year case
    - an undo at 23:59 with `occurred_on` kept

12. **NON-BLOCKING. Other coverage gaps.**
    - **Banned-word lint (spec §9, AC-R6).** Run it over `content/` and the UI strings.
    - **AC-P4 trend.** Test the boundaries: 3 weeks of plan vs 2, and a difference of 2/3/4 points.
    - **AC-P5.** An independent reference implementation computes the stats from the raw log (property test).
    - **AC-A4.** "Not now" is "not stored", but the skip's persistence across reload is undefined. Specify it, and assert that DB row counts are unchanged in flow 3.
    - **Viewports.** AC-X1 says 360 px but the matrix has no 360 viewport. Add 360×640.
    - **`dismiss`.** Has no key length or format check. Add one and test it.
    - **`reorder_habits`.** Rules for partial or duplicate id lists are undefined.

## Draft traceability rows (ACs with no planned test)

| AC | Test | Status |
|---|---|---|
| AC-O3 | e2e/tz-prompt.spec (a mismatched `timezoneId` shows the prompt and never switches silently); `domain/time` | ☐ |
| AC-H2 | db/habit-details.sql (whitelist, `created_on` immutable); component test | ☐ |
| AC-H7 | db/reorder.sql; e2e flow 13 "reorder changes the primary action" | ☐ |
| AC-L4 | component test for the date picker (5 disabled reasons) | ☐ |
| AC-Q1/Q2 | content/sources.test (every quote is in SOURCES.md); domain `quoteForDay` determinism; default off | ☐ |
| AC-R6, §9 | tests/copy-lint.test | ☐ |
| AC-X1 | e2e at 360×640 plus a manifest check | ☐ |
| AC-X3 | server test: the export contains voids, versions and events; CSV escaping | ☐ |
| AC-X4/X5 | e2e flows 10 and 11 (Phase 5 for the offline shell) | ☐ |
| AC-P3 | component test, one case per cell shape; axe label "not done" | ☐ |
| AC-W1/W4 | e2e on the last day and the first open of a week; the link to the goal change | ☐ |
