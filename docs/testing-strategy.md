# DISCIPLINE — Testing Strategy

Owner: `qa-testing-engineer` · Status: **v0.2, in review** · 2026-11-11

### Changelog
- **v0.2:** Adds DB-level tests (RLS, grants, RPC rules, direct-write denial) and auth E2E with email OTP against local Supabase. Expands the honesty suite to H1–H16, each with an explicit layer. E2E flows are aligned with roadmap phases.

## 1. Goals
1. Prove the numbers are **true** (the honesty suite).
2. Prove users can't bypass the rules, even by calling the database API directly.
3. Prove the core loop works on a phone.
4. Keep tests fast and deterministic so they run on every commit.

## 2. Test pyramid
| Layer | Tool | Scope | Target |
|---|---|---|---|
| Domain unit + property | Vitest + fast-check | `src/domain/**` | 100% branch coverage on `stats/` and `time/` |
| Database | Local Supabase (CLI) + pgTAP or SQL tests run by Vitest | Tables, RLS, grants, RPCs | Every policy, grant, and RPC rule |
| Server actions | Vitest + local Supabase | `src/server/**` | Happy path + error mapping |
| Component | Vitest + Testing Library | Components in all their states | Every async component |
| E2E | Playwright | Flows at 375×667, 412×915, 1280×800 | §6 |
| Accessibility | axe-core (Playwright), plus a manual keyboard and screen-reader pass | All screens | 0 serious/critical |
| Performance | Bundle check + Lighthouse CI (mobile, throttled) | Today, Progress | architecture §8 |

## 3. Determinism & safety rules
- **Clock and timezone are injected everywhere.** The domain never calls `Date.now()`. DB tests control "now" by calling RPC internals through a test-only `now()` override in the **local** database, or by asserting relative dates.
- E2E uses Playwright `clock` + `timezoneId`. Each test creates its own users through the local Supabase admin API. OTP codes come from the local mail catcher (Inbucket/Mailpit).
- **Tests never connect to the production Supabase project.** CI fails if `SUPABASE_URL` points at a non-local host during tests.
- No snapshot tests of whole pages. No real network beyond local Supabase.

## 4. Honesty suite (must never regress)
| ID | Assertion | Layer |
|---|---|---|
| H1 | Insert, update, or delete on any table **directly through PostgREST** as `authenticated` is denied. Only RPCs write. | DB |
| H2 | No RPC updates or deletes `completion_entries`. Voiding inserts into `completion_voids`. A second void of the same entry fails. Voided entries are excluded from stats but returned in history and export. | DB + domain |
| H3 | `logged_at`, `source`, `created_on`, and on-time `occurred_on` are server-derived. Client values are impossible because the RPC signatures don't accept them. | DB |
| H4 | A goal change applies from next week start. The current and past weeks are unchanged (AC-H3). A creation-week correction is the only exception. | DB + domain |
| H5 | Consistency rounds down. Property: `pct ≤ 100 × completed / planned`. Worked example 3 gives 66%. | Domain |
| H6 | `weekly_count` counts **distinct days**. A second entry on the same day is rejected. Overflow never pushes % above 100. | DB + domain |
| H7 | A "no plan" week renders as a gap, not 0%. | Domain + UI |
| H8 | Late entries count toward their `occurred_on` week and are labeled in the UI. | Domain + UI |
| H9 | Worked example 1: exactly 80%, "8 of 10", "1 logged later". | Domain + UI |
| H10 | Archived and paused days generate no planned days. Their history is kept. | Domain |
| H11 | **Today is pending, not missed.** The current week is never a %. | Domain + UI |
| H12 | Planned days are pro-rated with **ceil**. Worked example 2 gives 1 of 2 = 50%. | Domain |
| H13 | Pause, archive, and their reversals can't take effect on a past date. | DB |
| H14 | Late window: today−7 accepted, today−8 rejected, future rejected, before `created_on` rejected, paused day rejected. | DB |
| H15 | Recovery trigger matrix: daily 2-missed; weekly 0-week; two below-target weeks; none mid-week; auto-resolve on any completion including a late log; one card max; a dismissed lapse never returns. | Domain + UI |
| H16 | Cross-user: user B can't read or write any of user A's rows, including via RPC with A's ids. | DB |

## 5. Time-travel fixtures
- DST spring-forward and fall-back (Europe/Copenhagen, America/New_York).
- A user moving UTC+10 → UTC−7 mid-week, and a skipped local date when travelling east.
- Completions at 23:59:59 and 00:00:00 local.
- Week start Mon vs Sun.
- Feb 29.
- Late log at the 7-day boundary (allowed) and day 8 (rejected).
- Log before `created_on`, in the future, or on a paused day (all rejected).
- Goal change in the creation week vs later.
- Undo committed just before midnight (must keep the original date).

## 6. E2E flows (phase where each becomes required)
| # | Flow | Phase |
|---|---|---|
| 1 | Sign-in with OTP → onboarding (timezone, week start, first habit "3 per week") → Today | 2 |
| 2 | Action Mode → Done → Today updates → undo creates a void → Progress reflects it | 3 |
| 3 | "Not now" cycles candidates without storing anything | 2 |
| 4 | Two missed days → recovery card → "I did it, just didn't log it" → late log labeled → card disappears | 4 (late log part: 3) |
| 5 | Edit goal → "from next week" shown → this week unchanged in Progress | 3 |
| 6 | Archive → hidden from Today → visible in Progress → unarchive | 3 |
| 7 | Delete with confirmation → gone. Cancel keeps it. | 2 |
| 8 | Weekly reflection → saved → visible in Progress → read-only after 7 days | 4 |
| 9 | Quote enable → shown once → dismiss → hidden for the day. Disable → never shown. | 4 |
| 10 | Every screen under forced loading, empty, error (mock 500), and offline | 2–4 |
| 11 | Sign-out → protected routes redirect. A second device sees the same data after reload. | 2 |
| 12 | Export downloads JSON/CSV with voids included. Account deletion removes all data. | 5 |

## 7. Traceability (filled during implementation)
| Spec AC | Test file(s) | Status |
|---|---|---|
| AC-O1 … AC-X5 | _tbd_ | ☐ |

## 8. CI gates
typecheck → lint → domain unit/property → DB tests (local Supabase) → component → E2E (Chromium mobile + WebKit mobile) → axe → bundle budget → Lighthouse.

Any failure blocks the merge. A flaky test is quarantined within 24 h and an issue is filed. Production migrations run in a separate, manually approved workflow and never in the test pipeline.
