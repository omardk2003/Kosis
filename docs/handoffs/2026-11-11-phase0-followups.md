# Phase 0: follow-ups from the reviews (non-blocking)

Compiled by the orchestrator · 2026-11-11. All **blocking** findings from the four Phase 0 reviews are fixed on PR #1. The non-blocking items below are tracked for Phase 1 or launch.

| # | Item | Source | Owner | When |
|---|---|---|---|---|
| 1 | Enable Turnstile (test keys) in the staging dashboard, and real keys in production | security M1 | owner + lead-architect | staging setup / Phase 5 |
| 2 | App-level OTP rate limiter, because Supabase sees Vercel egress IPs | security M2 | backend-engineer | before launch |
| 3 | Default-privilege revokes cover only `postgres`. Add `supabase_admin` if migrations ever run as that role | security M3 | backend-engineer | Phase 1 |
| 4 | Production guard: also compare the full host, plus any custom domain | security L1 | backend-engineer | Phase 1 |
| 5 | Proxy redirects should keep the CSP and `Cache-Control: no-store` headers | security L2 | backend-engineer | Phase 1 |
| 6 | Pin GitHub Actions by commit SHA | security L4 | lead-architect | Phase 1 |
| 7 | Show `signIn.sessionEnded` when a session cookie existed but was invalid (`?ended=1`) | product 3 | backend/frontend | Phase 1 |
| 8 | Separate the account-deletion OTP template (5-minute code) | product 7 | backend + product | Phase 5 |
| 9 | Shared `AppHeader` (app name + language switch). Show only the other language as a text button | UI 9, 10 | ui-ux → frontend | Phase 2 |
| 10 | Home `/`: redirect to `/today`, or spec a real entry screen | UI 13 | ui-ux + product | Phase 2 |
| 11 | Offline page copy repeats "offline"; top-align the page | UI 15 | product + frontend | Phase 2 |
| 12 | Form-error info glyph, and `{seconds}` with a non-breaking space | UI 5, 6 | frontend + product | Phase 2 |
| 13 | `check-bundle.mjs`: fail fast if its port is already in use (a stale server gave a false ENOENT) | orchestrator | qa-testing-engineer | Phase 1 |
| 14 | Manifest `description` is fixed English (AC-X6 exception), and so is the bilingual `global-error.tsx` | product 6 | — (documented) | — |
| 15 | Q16 (sign-in method) is effectively decided by AC-O1. Owner to confirm with the other §10.2 defaults | product 2 | owner | before Phase 1 |

**Bundle correction:** the earlier figures (186/190 KB, and an "empty app" of 170 KB) included Next's `noModule` polyfill, which modern browsers skip. Correct figures: empty app ≈ 132 KB, scaffold 136.0 KB (`/`) and 140.3 KB (`/sign-in`), under the original **150 KB** budget. The proposed decision D7 is withdrawn.
