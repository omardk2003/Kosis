# DISCIPLINE — Testing Strategy

Owner: `qa-testing-engineer` · Status: **v0.3, reviewed, pending owner approval** · 2026-11-11

### Changelog
- **v0.3:** Resolves QA review blocking findings 1–6 and the related findings from the other reviews:
  - Clock control through `p_now` in `private.*` functions.
  - A catalog grant-drift test (H17).
  - New honesty tests H18–H21: pause tomorrow, replace and void window, timezone switch, lapse after a no-plan week.
  - E2E flows split by phase, plus a core-loop smoke flow.
  - A 360 px viewport.
  - A traceability table seeded for every acceptance criterion.
  - More fixtures.
- **v0.2:** DB-level tests, OTP auth E2E, and H11–H16.

## 1. Goals
1. Prove the numbers are **true** (the honesty suite).
2. Prove users can't bypass the rules, even by calling the database API directly.
3. Prove the core loop works on a phone.
4. Keep tests fast and deterministic so they run on every commit.

## 2. Test pyramid
| Layer | Tool | Scope | Target |
|---|---|---|---|
| Domain unit + property | Vitest + fast-check | `src/domain/**` | 100% branch coverage on `stats/` and `time/`. A property test compares results against an independent reference implementation (AC-P5) |
| Database | Local Supabase (CLI) + pgTAP | Tables, RLS, grants, RPCs, `private.*` | Every policy, grant, and RPC rule |
| Server actions | Vitest + local Supabase | `src/server/**` | Happy path, error mapping, env guard |
| Component | Vitest + Testing Library | Components in all their states | Every async component |
| E2E | Playwright | 360×640, 375×667, 412×915, 1280×800 | §6 |
| Accessibility | axe-core (Playwright), plus a manual keyboard and screen-reader pass | All screens | 0 serious/critical |
| Copy | `tests/copy-lint.test.ts` | `content/**` and UI strings | No banned words (spec §9) |
| Performance | Bundle check + Lighthouse CI (mobile, throttled) | Today, Progress | architecture §8 |

## 3. Determinism & safety rules
- **Clock injection:**
  - The domain never calls `Date.now()`. "Today" is a parameter, and in production it comes from the DB (`get_today`).
  - DB logic lives in `private.*(p_user, p_now, …)`. Public RPCs are thin wrappers that pass `auth.uid()` and `now()`. DB tests call the `private.*` functions directly, with chosen `p_now` values, as a test role on the **local** database.
  - **There is no clock override in any migration.** A CI check fails if a migration redefines `now()` or adds a test-only path.
- **Golden time vectors:** a shared file `tests/fixtures/time-vectors.json` holds `(instant, tz) → local date` cases. Both Vitest (`Intl`) and pgTAP run it, which catches drift between JS and Postgres tz data. The Node and Postgres versions are pinned.
- **E2E:**
  - Use Playwright `clock` + `timezoneId`.
  - Each test creates its own users through the local Supabase admin API.
  - OTP codes come from the local mail catcher (Inbucket/Mailpit).
- **Production is off-limits:** tests never connect to the production Supabase project. CI fails if `SUPABASE_URL` is not local during tests, and the runtime env guard is tested too.
- No snapshot tests of whole pages. No real network beyond local Supabase.

## 4. Honesty suite (must never regress)
| ID | Assertion | Layer |
|---|---|---|
| H1 | Insert, update, delete or truncate on any table **directly through PostgREST** as `anon` or `authenticated` is denied. Only RPCs write. | DB |
| H2 | No RPC updates or deletes `completion_entries`, **except the cascades from `delete_habit` and account deletion**. Those cascades remove only the caller's rows: entries, voids, versions, events, and orphan-free dismissals. Voiding inserts into `completion_voids`, and a second void fails. Voided entries are excluded from stats but returned in history and export. | DB + domain |
| H3 | `logged_at`, `logged_tz`, `source`, `created_on` and on-time `occurred_on` are server-derived. The RPC signatures don't accept client values for them. | DB |
| H4 | A goal change applies from next week's start. The current and past weeks are unchanged. Creation-week correction is the only exception, and the newest `seq` wins. | DB + domain |
| H5 | Consistency rounds down, using integer arithmetic. Property: `pct ≤ 100 × completed / planned`. Worked example 3 gives 66%, and 29/100 gives 29 (not 28). | Domain |
| H6 | `weekly_count` counts **distinct days**. A second entry on the same day is rejected, including a **concurrent** `log_completion` + `replace_with_full` race run as two transactions. Overflow never pushes % above 100. | DB + domain |
| H7 | A "no plan" week renders as a gap with a dash. A 0% week renders a stub. | Domain + UI |
| H8 | Late entries count toward their `occurred_on` week and are labeled in the UI. | Domain + UI |
| H9 | Worked example 1: exactly 80%, "8 of 10", "1 logged later". | Domain + UI |
| H10 | Archived and paused days generate no planned days. Their history is kept. | Domain |
| H11 | **Today is pending, not missed.** The current week is never a %. | Domain + UI |
| H12 | Planned days are pro-rated with **ceil**. Worked example 2 gives 1 of 2 = 50%. | Domain |
| H13 | No status change takes effect on a past date. | DB |
| H14 | Late window: today−7 accepted, today−8 rejected, future rejected, before `created_on` rejected, paused day rejected. | DB |
| H15 | Recovery trigger matrix: daily 2-missed (needs ≥ 2 active days); weekly 0-week; two below-target weeks; no-plan weeks skipped; nothing mid-week; lapse key stable across a run; auto-resolve on an entry ≥ the key date, including a late log; one card max; a dismissed lapse never returns. | Domain + UI |
| H16 | Cross-user: user B can't read or write any of user A's rows, including via RPC with A's ids. | DB |
| H17 | **Catalog drift:** every `public` table has RLS enabled and no write grants. No `public` function is executable by `anon`/`PUBLIC`. Every SECURITY DEFINER function has `search_path=''`. `private` isn't exposed. Default privileges are revoked. | DB |
| H18 | Pause/archive take effect **tomorrow**: today stays planned and keeps its entry, and pausing at 23:59 doesn't erase an undone day. Resume takes effect today. | DB + domain |
| H19 | Voids and `replace_with_full` only for `occurred_on ≥ today − 7`. Clients can't send reason `replaced`. Replacement requires a minimum, non-voided entry on an active day, and the new entry is `late` if the day is before today. | DB |
| H20 | **Timezone switch:** switching to UTC−12 and logging "yesterday" still yields `late`. Switching to UTC+14 can't log a day ahead. The conservative "today" lasts 24 h. | DB |
| H21 | Deleted account: a still-valid JWT can't call any RPC, because the profile guard rejects it. | DB |

## 5. Time-travel fixtures
- **DST:** spring-forward and fall-back (Europe/Copenhagen, America/New_York), America/Havana (DST gap at 00:00), Australia/Lord_Howe (30-minute step).
- **Odd offsets and skipped dates:** Asia/Kolkata and Asia/Kathmandu (non-hour offsets). Pacific/Apia 2011-12-30 (a skipped date).
- **Travel:** UTC+10 → UTC−7 mid-week (a repeated date; the conservative "today" applies). An eastward skip.
- **Midnight:** completions at 23:59:59 and 00:00:00 local. An `Intl` `hourCycle` "24:00" guard.
- **Calendar:** week start Mon vs Sun, Feb 29 with a Sunday week start.
- **Late window:** day 7 allowed, day 8 rejected. Before `created_on`, in the future, and on a paused day are all rejected.
- **Goals:**
  - created on the week start
  - created on the last day of the week
  - corrected twice in the creation week
  - changed on day 8
  - two changes in one later week, where the second supersedes the first
  - changed on a paused habit
- **"Needs today":**
  - last day with 1 needed (candidate)
  - last day with 0 needed (not a candidate)
  - the same with a Sunday week start
  - created on a Thursday
  - pause scheduled for tomorrow
  - target unreachable: copy check
- **Replace:** a minimum entry on day 7 (allowed) and day 8 (rejected). A full entry (rejected). A voided entry (rejected).
- **Undo:** undo just after midnight keeps the original `occurred_on`.
- **Reflections:**
  - `week_start+13` accepted, `+14` rejected
  - a date that isn't a week start rejected
  - a future week rejected
  - `feeling` 0 or 6 rejected
  - text over 1000 characters rejected
  - "updated by later logs" after a late log
- **Trend:** 3 vs 2 weeks with a plan, and differences of 2, 3, and 4 points.

## 6. E2E flows (the phase in which each becomes required)
| # | Flow | Phase |
|---|---|---|
| 1 | Sign-in with OTP (wrong code, expired code, resend cooldown, identical copy for an unknown email) → onboarding (timezone, week start, first habit "3 per week") → Today | 2 |
| 2a | Action Mode → Done → Today updates → undo creates a void → "Remove today's entry" | 2 |
| 2b | A completion appears in Progress with correct numbers | 3 |
| 3 | "Not now" cycles candidates. DB row counts are unchanged, and a reload resets the skips. | 2 |
| 4a | "Log a past day" → late entry labeled in history and Progress. Replace minimum with full. | 3 |
| 4b | Two missed days → one recovery card → "I did it, just didn't log it" → card disappears. Dismiss → never returns. | 4 |
| 5a | Edit goal → "Applies from <date>" shown | 2 |
| 5b | This week is unchanged in Progress after a goal change | 3 |
| 6a | Pause → "Pauses from tomorrow" → resume. Archive → hidden from Today. | 2 |
| 6b | An archived habit is visible in Progress → unarchive | 3 |
| 7 | Delete with confirmation → gone. Cancel keeps it. | 2 |
| 8 | Weekly reflection → saved → visible in Progress → read-only after the window | 4 |
| 9 | Quote enabled in Settings → shown once → dismissed for the day. Disabled → never shown. | 4 |
| 10 | Every screen under forced loading, empty, error (mock 500) and offline-while-open | 2–4 |
| 10b | Offline cold start shows the shell only. No personal data is in Cache Storage after sign-out. | 5 |
| 11 | Sign-out → protected routes redirect. A second device sees the same data after reload. | 2 |
| 12 | Export (JSON/CSV, complete, voids included, CSV escaped). Account deletion with a fresh code → all data gone → old session rejected. | 5 |
| 13 | Reorder habits → the primary action changes | 2 |
| **S** | **Core-loop smoke:** create habit → Today → Action Mode → Done → Progress → late log → weekly reflection | Required at the Phase 4 exit, then on every PR |

## 7. Traceability (seeded; updated during implementation)
| AC | Planned test(s) | Status |
|---|---|---|
| AC-O1 | e2e 1; server test for identical responses; config check on OTP limits | ☐ |
| AC-O2 | e2e 1 | ☐ |
| AC-O3 | e2e tz-prompt (a mismatched `timezoneId` → prompt, never a silent switch); H20 | ☐ |
| AC-O4 | e2e 11 | ☐ |
| AC-O5 | e2e 12; H21; server test (target id comes only from `getUser`) | ☐ |
| AC-H1 | e2e 1; db create_habit (50 cap) | ☐ |
| AC-H2 | db habit-details (column whitelist, `created_on` immutable); component test | ☐ |
| AC-H3 | H4; e2e 5a/5b | ☐ |
| AC-H4, AC-H5, AC-H8 | H10, H13, H18; e2e 6a/6b | ☐ |
| AC-H6 | H2; e2e 7 | ☐ |
| AC-H7 | db reorder (exact set); e2e 13 | ☐ |
| AC-H9 | db change_goal on a paused habit | ☐ |
| AC-D1–D5 | component tests (sections, order, states); e2e 2a, 10 | ☐ |
| AC-A1–A5 | domain todaySections fixtures; e2e 2a, 3 | ☐ |
| AC-L1–L5 | H14, H19; component test of the day list (disabled reasons); e2e 4a | ☐ |
| AC-R1–R7 | H15; copy-lint; e2e 4b | ☐ |
| AC-P1–P6 | H7, H9, H11, H12; domain heatmapCells and consistencySeries; component tests (one per cell shape, axe "not done"); e2e 2b, 5b, 6b | ☐ |
| AC-W1–W6 | db upsert_reflection window; domain summaryChangedSince; e2e 8 | ☐ |
| AC-Q1–Q2 | content/sources test (every quote is in SOURCES.md); domain quoteForDay determinism; default off; e2e 9 | ☐ |
| AC-X1 | e2e at 360×640; manifest check | ☐ |
| AC-X2 | e2e 10 | ☐ |
| AC-X3 | server export test (complete, paginated, voids, CSV escaping); e2e 12 | ☐ |
| AC-X4 | e2e 10, 10b; SW unit test (never caches authenticated responses) | ☐ |
| AC-X5 | e2e 11 | ☐ |
| §7 metrics | domain worked examples 1–3, H5, H12; reference-implementation property test | ☐ |
| §9 copy | tests/copy-lint | ☐ |

## 8. CI gates
1. typecheck
2. lint
3. copy-lint
4. domain unit/property
5. DB tests (local Supabase, including H17)
6. component tests
7. E2E (Chromium mobile + WebKit mobile)
8. axe
9. bundle budget
10. Lighthouse

Any failure blocks the merge. A flaky test is quarantined within 24 h and an issue is filed. Production migrations run in a separate workflow bound to the protected GitHub Environment "production", with owner approval, and never in the test pipeline.
