# DISCIPLINE — Testing Strategy

Owner: `qa-testing-engineer` · Status: **Draft v0.1** · 2026-11-11

## 1. Goals
1. Prove the numbers are **true** (the honesty suite).
2. Prove the core loop works on a phone.
3. Keep tests fast and deterministic so they run on every commit.

## 2. Test pyramid
| Layer | Tool | Scope | Target |
|---|---|---|---|
| Domain unit + property | Vitest + fast-check | `src/domain/**` | 100% branch on `stats/` and `time/` |
| Server/integration | Vitest + local Supabase (Docker) | server actions, RLS, triggers | Every policy and invariant |
| Component | Vitest + Testing Library | components and their 4 states | Every async component |
| E2E | Playwright | core flows at 375×667, 412×915, 1280×800 | Core loop + recovery + late log |
| Accessibility | axe-core (Playwright) + manual keyboard/screen-reader pass | all screens | 0 serious/critical |
| Performance | Lighthouse CI (mobile, throttled) | Today, Progress | Budgets in architecture §8 |

## 3. Determinism rules
- The clock and timezone are injected everywhere. There's no `Date.now()` in the domain.
- E2E uses Playwright `clock` + `timezoneId`. Test users and data are created per test.
- No real network beyond the local Supabase. No snapshot tests of whole pages.

## 4. Honesty suite (must never regress)
- H1: Inserting an entry never changes any other entry. There's no UPDATE/DELETE path (DB test
  as an authenticated user).
- H2: Voiding sets `voided_at` once. Voided entries are excluded from stats but returned in
  history.
- H3: `logged_at` and `source` ignore client-supplied values.
- H4: A goal change mid-week doesn't change past or current-week evaluation (spec AC-H3).
- H5: Consistency rounds down (property: `pct ≤ 100 × completed / planned`).
- H6: Weekly-count overflow never pushes % above 100. Daily double entries count once.
- H7: A "no plan" week renders a gap, not 0%.
- H8: Late entries count toward their `occurred_on` week and are labeled in the UI.
- H9: Spec §7.3 worked example → exactly 80%, "8 of 10", "1 logged later".
- H10: Archived habits stop generating opportunities and keep their history.

## 5. Time-travel fixtures
DST spring-forward/fall-back (America/New_York, Europe/Berlin) · a user moving
UTC+10 → UTC−7 mid-week · completion at 23:59:59 and 00:00:00 local · week start Mon vs Sun ·
Feb 29 · late log at the 7-day boundary (allowed) and day 8 (rejected) · log before
`created_on` (rejected) · future date (rejected).

## 6. Core E2E flows
1. Onboarding → first habit (name + "3 per week") → Today shows it as the primary action.
2. Action Mode → Done → Today updates, undo works, then Progress reflects it.
3. "Not now" cycles candidates without recording anything.
4. Miss 2 days → recovery card → "I actually did it" → late log is labeled.
5. Edit goal "starting next week" → this week is unchanged.
6. Archive → hidden from Today, visible in Progress → Unarchive.
7. Delete with confirmation → gone. Cancel keeps it.
8. Weekly reflection → saved → visible in Progress.
9. Quote dismiss → hidden for the day. Disable in settings → never shown.
10. Every screen under forced loading, empty, error (mock 500), and offline.

## 7. Traceability (filled during implementation)
| Spec AC | Test file(s) | Status |
|---|---|---|
| AC-H1 … AC-X3 | _tbd_ | ☐ |

## 8. CI gates
typecheck → lint → unit/property → integration (RLS) → E2E (Chromium mobile + WebKit
mobile) → axe → Lighthouse budgets. Any failure blocks the merge. Flaky tests are
quarantined within 24 h with an issue filed.
