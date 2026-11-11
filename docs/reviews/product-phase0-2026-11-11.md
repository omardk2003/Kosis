# Product & copy review: Phase 0 (2026-11-11)

Reviewer: `behavioral-product-specialist` · **Verdict: APPROVE WITH CHANGES**

## Fixed in this review (content/messages, keys unchanged)
- `signIn.errors.badCode` (EN and DA): Supabase reports wrong and expired codes the same way (`mapVerifyError`). The old text, "Check it and try again", sent people with an expired code back to retype a code that could never work. The new text: "That code didn't work. It may be mistyped or expired. Check it, or send a new code."
- `signIn.codeSentNeutral`: an email can't sign in. Reworded to "If this email can be used to sign in…". It stays non-enumerating.
- DA: changed "kode på 6 cifre" to the more natural "6-cifret kode" (three keys).

The Danish is natural and uses du-form throughout. There are no banned words in either language (no fejl*/mislykke*/brudt/mistet/doven/burde/indhente/stime equivalents) and no exclamation marks.

## Findings

1. **BLOCKING: §10.2 Q5 contradicts D1.** Q5 still says Pause is "effective today only", but D1 (approved) says it takes effect tomorrow. I'll correct it in the spec (v0.3.1). The owner must not confirm the stale text.
2. **NON-BLOCKING: §10 "Still open" lists Q16 (sign-in method).** Phase 0 already ships email OTP, so the note "Phase 0 doesn't depend on them" isn't true for Q16. I'll move Q16 to decided (it follows from AC-O1), pending owner confirmation.
3. **NON-BLOCKING: `signIn.sessionEnded` is never shown.** Nothing sets `?ended=1` (`src/proxy.ts` redirects to plain `/sign-in`), so someone whose session expired gets no explanation. Handoff to backend/frontend: set the param when a session cookie existed but is no longer valid.
4. **NON-BLOCKING: unused keys.** `signIn.errors.expiredCode` can't be reached (Supabase can't tell expired from wrong codes), and `common.retry` has no Phase 0 surface. Keep both for later phases.
5. **NON-BLOCKING: misused key.** The sign-out button shows `common.loading` ("Loading…") while pending. It should say "Signing out…" / "Logger ud…". A new key needs a handoff to the frontend.
6. **NON-BLOCKING: hard-coded English.** `src/app/manifest.ts` has a hard-coded `description`. That's acceptable for a single static manifest, but record it as an AC-X6 exception. There is no other user-facing hard-coded text in `src/app`, `src/components` or `src/features/auth/ui`.
7. **NON-BLOCKING: email copy drift.** The bilingual subject in `supabase/config.toml` ("Your DISCIPLINE sign-in code / Din kode til DISCIPLINE") isn't in `content/copy/email-otp.md`, and the doc's DA subject differs from it. The body text matches word for word. I'll add the combined subject to the copy doc. Also:
   - `otp.html` has no `<meta charset="utf-8">`. That's a risk for æ/ø/å in some clients.
   - The copy says "expires in 10 minutes", which matches `otp_expiry = 600`. The AC-O5 deletion code (5 minutes) needs its own template. It must not reuse this one.
8. **NON-BLOCKING: `docs/architecture.md` §337** quotes the old `codeSentNeutral` wording. The lead-architect should reference the message key instead.
9. **NON-BLOCKING: misleading to the owner (`docs/decisions/email-provider-comparison.md`).**
   - (a) "Staging can use Supabase's built-in sender" leaves out that the built-in sender **only delivers to the project's team members' addresses** and is limited to a few emails per hour. Outside testers can't sign in on staging without custom SMTP.
   - (b) "Cheapest at our volume" for Scaleway ignores that the stated Mailjet and Brevo free tiers would cost €0 below about 6–9k per month. The real case for Scaleway is EU ownership and transactional-only scope, not price.
   - (c) "Part of a large non-EU group" for Mailjet is wrong. Sinch is Swedish (EU).

   Owner: lead-architect.

## Flow vs spec
- **AC-O1 met.** Email plus 6-digit OTP. `shouldCreateUser: true` and the mapping of user-specific send errors to success keep sign-in non-enumerating. The 60 s per-address limit applies whether or not the email is registered.
- **AC-O4 met.** Sign-out goes through a server action, then the "You're signed out." status, then a cache purge. Offline, it's blocked and the reason is shown.
- **AC-X6 met**, apart from #6. Locale order is cookie, then Accept-Language, then EN. `html lang` is set. Turnstile is localized. The OTP email exists in both languages.

Sources (for #9): [Supabase SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase discussion #29370](https://github.com/orgs/supabase/discussions/29370).
