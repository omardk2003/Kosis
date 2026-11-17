# Plan: Step 1, walking skeleton (Phase 0, items 1, 3 and 4)

Owner: `lead-architect` · Status: **implemented in Phase 0** · 2026-11-11

> **Owner decision (2026-11-11):** the work continues on the existing branch `claude/project-setup` / PR #1 instead of a new branch. D1–D6 are approved, and so is Taste option A. Deviations from this plan:
> - The service worker is a hand-written `public/sw.js` with no `tsc` step (ADR-0008).
> - i18n uses next-intl with EN/DA (ADR-0009).
> - Turnstile is wired through Supabase Auth's built-in CAPTCHA (ADR-0006).
> - The baseline security migration (no domain tables) is included.

## 1. Prerequisites (owner)
**Block step 1:**
- O1. Approve Phase 0 and this plan (the CLAUDE.md gate otherwise forbids code).
- O2. Approve ADR-0001, 0007 and 0008 (§5) and the dependency list (§4).
- O3. **D6** (language). The sign-in copy is the first UI string. English, externalized.
- O4. Vercel check (§3): confirm which environment scopes hold Supabase variables.

**Do not block step 1:** D1 and D2 (schema, Phase 1), D3 (staging; blocks preview *auth* and any migration only), D4 and D5 (before launch; local uses Mailpit and no CAPTCHA).

## 2. Branch & PR
Recommended: owner merges PR #1; step 1 branches from `main` as `claude/step1-walking-skeleton`, one PR, owner merges. Trade-off: waits on the owner, but the diff is code only. Fallback: stack on `claude/project-setup`, retarget later.

## 3. Vercel deployment control
- `vercel.json`: `"regions": ["dub1"]` and `"git": { "deploymentEnabled": false }` until the owner opts in. Then flip the step branch only (`{"claude/step1-walking-skeleton": true}`). `main` stays off until Phase 5.
- **Owner checks in the dashboard (needs verification, no Vercel MCP):** the Vercel–Supabase marketplace integration syncs keys into *all* scopes by default. Remove any "Kosis Project" variables from Preview and Development. Production-only, or none.
- Until D3, Preview has **no** Supabase variables; the guard shows "not configured", which still meets the Phase 0 exit "blank app deploys to preview".
- Runtime guard (`src/server/env.ts`): throws if `VERCEL_ENV !== 'production'` and the URL matches the production ref.

## 4. Dependencies (exact versions, `npm ci`, lockfile committed, Node 22 via `.nvmrc` + `engines`)
Runtime:
- `next`: the framework (ADR-0001). *Needs verification:* current major. If it is 16, the file is `proxy.ts`, otherwise `middleware.ts`. Also whether it uses the Node runtime.
- `react`, `react-dom`: Next peers.
- `@supabase/ssr`: cookie sessions on the server.
- `@supabase/supabase-js`: Auth client, server-only. *Verify `getClaims`.*
- `server-only`: build fails if server code leaks to the client.

Dev:
- `typescript`, `@types/{node,react,react-dom}`: strict typing.
- `tailwindcss`, `@tailwindcss/postcss`: styling. *Verify v4 CSS-first config.*
- `eslint`, `eslint-config-next`: lint (flat config). `prettier`: formatting.
- `vitest`: unit tests.
- `@playwright/test`, `@axe-core/playwright`: smoke test and axe.
- `supabase`: CLI pinned for the local stack. Must match the CI version.

No zod, fast-check or Testing Library until Phase 1.

## 5. ADRs first (T0)
- **0001:** stack, the pinned Next version and session-file name, the CSP text, `getClaims`, and `sw.ts` compiled via `tsc -p tsconfig.sw.json` to a git-ignored `public/sw.js`.
- **0007:** environments, the env guard, Vercel scoping, and the production-migration workflow (stub only).
- **0008:** a shell-only service worker, a cache allowlist, and a purge on sign-out.

## 6. Tasks
**Wave 0:**
- **T0 lead-architect:** `docs/adr/0001-stack.md`, `0007-environments.md`, `0008-service-worker.md`. Then the owner approves (O2).

**Wave 1 (parallel):**
- **T1 ui-ux-designer:** `src/styles/tokens.css`, `docs/screens/sign-in.md`, `docs/screens/today-placeholder.md`.
- **T2 behavioral-product-specialist:** `content/copy/en/auth.json` (sign-in, code, sign-out, errors with identical responses), `content/copy/en/email-otp.md`.
- **T3 lead-architect:** `package.json`, `package-lock.json`, `.nvmrc`, `tsconfig.json`, `tsconfig.sw.json`, `next.config.ts` (security headers, CSP), `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.env.example`, `vercel.json`.

**Wave 2 (parallel, after T1–T3). Contract:** `sendOtp(fd) → {ok:true} | {ok:false; reason:'invalid'|'rate_limited'|'unavailable'}`, `verifyOtp(fd) → same | 'bad_code'`, `signOut() → redirect`.
- **T4 backend-engineer:**
  - `supabase/config.toml`: 6 digits, ≤600 s, 60 s between sends, low rate limits, CAPTCHA slot off locally, Mailpit.
  - `supabase/templates/otp.html`, using `{{ .Token }}` and the T2 copy.
  - `src/server/env.ts` + `env.test.ts`.
  - `src/server/supabase/server.ts`, `src/server/auth/actions.ts`.
  - `proxy.ts` or `middleware.ts`.
  - **No migrations.**
- **T5 frontend-engineer:**
  - `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/sign-in/page.tsx`, `src/app/(app)/today/page.tsx` (placeholder plus sign-out), `src/app/offline/page.tsx`, `src/app/manifest.ts`.
  - `src/features/auth/ui/**`, `src/components/sw-register.tsx`, `src/sw.ts`.
  - `src/styles/globals.css`, `public/icons/**`.
- **T6 qa-testing-engineer:**
  - `vitest.config.ts`, `playwright.config.ts` (360×640 Chromium).
  - `tests/setup/assert-local-env.ts`, `tests/copy-lint.test.ts` (stub: banned words across `content/**`).
  - `tests/perf/check-bundle.mjs` (≤110 KB gzip).
  - `e2e/smoke.spec.ts` (shell, manifest, SW registered, axe), `e2e/auth.spec.ts`, `e2e/helpers/mailpit.ts`.

**Wave 3:**
- **T7 lead-architect:** `.github/workflows/ci.yml` (typecheck, lint, copy-lint, unit, `supabase start`, Playwright, bundle) and the CLAUDE.md "Commands" section. Integrate and get CI green.

**Docker fallback:** GitHub runners have Docker, so CI runs auth E2E on local Supabase. Without local Docker, `e2e/auth.spec.ts` skips with a stated reason and CI is the gate; never a remote project.

## 7. Definition of done
1. CI green: typecheck, lint, copy-lint, unit, smoke at 360×640, auth E2E, bundle ≤110 KB gzip.
2. Auth E2E against local Supabase: send, wrong code, right code → Today, sign-out → `/today` redirects to sign-in, and identical copy for an unknown email.
3. Installable: valid manifest and icons. The SW caches only the allowlisted static assets and the offline shell. After sign-out, Cache Storage is empty of HTML and RSC.
4. The env guard is unit-tested. Tests abort on a non-local URL.
5. `supabase/migrations/` is empty, and nothing touched "Kosis Project" (owner confirms there are no new logs or migrations).
6. `.env.example` has names only. `vercel.json` has dub1 and deployments disabled.
7. No `any`, no browser Supabase client; sign-in has loading/error/success states; 44 px targets.

## 8. Review gates
- security-performance-reviewer: auth, env guard, CSP, SW, dependencies, bundle (`docs/reviews/security-step1-*.md`). Must PASS.
- ui-ux-designer: sign-in and Today placeholder against the screen specs and tokens.
- behavioral-product-specialist: all copy, including the email.
- qa-testing-engineer: verifies the DoD. lead-architect: final sign-off; owner merges.

## 9. Risks (→ mitigation)
- Next major/`proxy.ts` differ from docs → ADR-0001 pins before T3.
- Preview env leakage → O4 + guard.
- No local Docker → CI gates auth.
- Baseline >110 KB → measure early in T5, escalate.
- `config.toml` key drift → pin CLI, verify in T4.
- SW caches personal data → allowlist, E2E check, security review.
