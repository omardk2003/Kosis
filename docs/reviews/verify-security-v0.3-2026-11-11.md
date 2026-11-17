# Security verification: spec v0.3 against v0.2 blockers

Reviewer: security-performance-reviewer · 2026-11-11 · Design-level only, no code or live systems inspected.

**Verdict: PASS.** All five blockers are resolved in the spec. Two depend on pending owner decisions, and v0.3 is correct whichever option is chosen.

| ID | Status | Evidence |
|---|---|---|
| H1 | RESOLVED | arch §4.3 has `alter default privileges` revokes for tables, functions and sequences, explicit per-object grants, and logic in a non-exposed `private` schema. Every write RPC guards `auth.uid()` and the profile. Read RPCs are INVOKER. A CI catalog test re-asserts the grants (testing H17). |
| H2 | RESOLVED PENDING OWNER DECISION (D4 SMTP, D5 CAPTCHA) | §7.1 pins expiry ≤ 600 s, ≥ 60 s between sends, `shouldCreateUser: true`, an identical response for known and unknown emails, and a `{{ .Token }}` template. CAPTCHA and custom SMTP are required, only the provider is open. The per-hour caps have no numbers and are deferred to ADR-0006. That is acceptable, but the numbers must be set before Phase 1 auth work. |
| H3 | RESOLVED | §7.3 and AC-X4 limit the SW to static assets and the shell. No personal data is persisted. Sign-out and account deletion purge Cache Storage. |
| H4 | RESOLVED PENDING OWNER DECISION (D3 staging) | §9 scopes production keys to Vercel Production only, adds a `src/server/env.ts` runtime guard and a protected GitHub Environment, and limits MCP use to schema and advisors. Both staging options satisfy the rules. |
| H5 | RESOLVED | §4.3 takes the id from `getUser()` only, sends an OTP to the user's own email with a 5-minute window, keeps the service-role client in one `server-only` module, and makes the action rate limited and idempotent. RPCs reject callers without a profile. |

## New issues introduced by v0.3

None blocking.

- **Needs verification (non-blocking):** §4.4 says `get_today()` is SECURITY INVOKER and uses `server_today`, which lives in `private`. The `authenticated` role has no USAGE on `private` (§4.3), so the call may fail with a permission error. Fix options: a DEFINER read helper that filters on `auth.uid()`, or granting USAGE on `private` plus EXECUTE on that one function only. Owner: backend-engineer, with a test in the H17 suite.
- Still deferred and non-blocking: the CSP text, the GDPR basis and DPAs, and the numeric rate limits.
