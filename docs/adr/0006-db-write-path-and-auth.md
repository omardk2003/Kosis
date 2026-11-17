# ADR-0006: DB-only write path, grants, OTP auth, Turnstile
Status: Accepted · 2026-11-11 · Detail: architecture §4.3, §7.1

## Decision
**Writes:**
- Clients have no table write grants. All writes go through `SECURITY DEFINER` wrappers (`search_path=''`) that call `private.*(p_user, p_now, …)`.
- Default privileges are revoked: `for role postgres`, plus the global PUBLIC EXECUTE revoke.
- Read RPCs are INVOKER.
- RLS is owner-only and select-only.
- The catalog drift test H17 guards all of this.

**Auth:** Supabase email OTP.
- 6 digits, `otp_expiry = 600` s, `max_frequency = 60s`.
- `shouldCreateUser: true`, so sign-in and sign-up behave the same.
- Identical responses for known and unknown emails. Error mapping lives in `src/server/auth/otp.ts`.
- Supabase reports expired and wrong codes the same way (`otp_expired`), so the UI shows one message with "Send a new code" beside it. Screen spec S8 folds into S7.

**CAPTCHA (D5): Cloudflare Turnstile** through Supabase Auth's built-in CAPTCHA support.
- The widget token goes in `signInWithOtp({ options: { captchaToken } })`, and **Supabase Auth verifies it server-side** with Cloudflare siteverify.
- Our code never calls siteverify itself, because tokens are single-use.
- **Production guard against test keys** (`src/server/env.ts` → `readTurnstileSiteKey`, added 2026-11-17):
  - When `VERCEL_ENV === "production"`, the site key must be present and must **not** match Cloudflare's test-key pattern (`[1-3]x` followed by twenty zeros and two letters, e.g. `1x00000000000000000000AA`). Otherwise sign-in fails closed.
  - The guard is called in two places: when the sign-in page renders (which then shows the error page), **and** in the `sendOtp` server action before any code is sent (which returns "unavailable"). A direct action call can't bypass it.
  - Preview (`VERCEL_ENV=preview`, staging) and local development (`VERCEL_ENV` unset) aren't affected, and may use test keys.
  - **Limit:** the code can't see the Turnstile **secret** stored in Supabase. The production project's CAPTCHA secret must be the real one; that's a launch-checklist item.
  - **Tests:** `tests/unit/turnstile-guard.test.ts` covers all five Cloudflare test keys, a missing key, a real key, preview and local.
- Local: CAPTCHA off. Staging: Cloudflare test keys. Production: real keys, with the secret only in the Supabase dashboard.

**Rate limits:** per-IP Supabase limits (`sign_in_sign_ups`, `token_verifications`), plus per-email frequency and Turnstile. Production values are pinned in the dashboard at launch (Phase 5).

**SMTP (D4):** an EU provider, recommended Scaleway TEM (`docs/decisions/email-provider-comparison.md`). It's not needed until launch.

## Consequences
- Supabase must be configured identically in staging and production. The runbook in `docs/runbooks/staging-setup.md` lists every setting.
