# D4: Transactional email provider for Auth OTP: comparison

Owner: `lead-architect` · Status: **recommendation, owner to confirm before Phase 5** · 2026-11-11

**Scope:** one-time sign-in codes and account-deletion codes, sent by Supabase Auth over custom SMTP.

**Expected volume (MVP):** well under 10,000 emails per month.

**Not needed yet.** Local development uses the Supabase CLI's built-in mail catcher (Mailpit), and staging can use Supabase's built-in sender while volumes stay tiny. Custom SMTP becomes **required before production launch**, because Supabase's built-in sender is rate-limited and not meant for production.

**Pricing caveat.** Prices come from web search results dated 2026, mostly third-party comparisons. The vendors' own pricing pages could not be fetched from this session, because its network allowlist blocked them. **Verify on each vendor's site before signing up.**

## Criteria
1. Data processing in the EU, with an EU-headquartered company preferred (GDPR, no transfer mechanism needed).
2. SMTP support, which Supabase custom SMTP requires. An API is optional.
3. Deliverability and authentication: SPF, DKIM and DMARC on our own domain.
4. Cost at less than 10k per month, and the free tier.
5. A signed data processing agreement (DPA), plus suppression and bounce handling.

## Options
| Provider | HQ / hosting | SMTP | Free tier* | Paid entry* | Notes |
|---|---|---|---|---|---|
| **Scaleway Transactional Email (TEM)** | France / EU (FR) | Yes (STARTTLS) | 300 emails/month | ~€0.25 per 1,000 after that, no monthly fee (Essential). The Scale plan is ~€80/month with a dedicated IP | ISO 27001. Infrastructure-style, so the cheapest at low volume. A default quota of 10k/month that can be raised. Fewer deliverability tools than marketing-oriented providers |
| **Brevo** (formerly Sendinblue) | France / EU | Yes | ~300 emails/day | ~$9/month | EU-built and GDPR-focused. Marketing and transactional in one account, so more surface area than we need |
| **Mailjet** (Sinch group) | France origin / EU-hosted | Yes | ~6,000/month (200/day) | ~$9/month | ISO 27001. A generous free tier. Part of a large non-EU group, so check the group DPA |
| **MailPace** | UK company / EU-hosted | Yes | none | ~$10/month for 10k | Transactional-only, privacy-focused, a small vendor |
| Amazon SES (eu-west-1 or eu-central-1) | US company / EU region | Yes | (AWS free tier varies) | ~$0.10 per 1,000 | The cheapest at scale, but a US parent (SCCs needed), more setup (IAM, sandbox exit), and a new AWS account |
| Postmark | US / US | Yes | 100/month | ~$15/month | Excellent deliverability, but not EU-hosted |
| Resend | US / (no EU region confirmed) | Yes | 3,000/month | ~$20/month | Easiest Supabase setup, but no EU hosting confirmed |

\* Unverified. Confirm on the vendor site.

## Recommendation
**Primary: Scaleway TEM.**
- It's EU-headquartered and EU-hosted.
- It's transactional-only, so it has the smallest data surface.
- It's the cheapest at our volume, likely €0–3/month.
- It supports SMTP for Supabase, and it's ISO 27001 certified.

**Fallback: Mailjet or Brevo.** Use one of these if Scaleway's deliverability to major inboxes (Gmail, Outlook) proves weak in the staging test.

## Setup (Phase 5, not now)
1. Verify the sending domain (for example `auth.<our-domain>`) with SPF, DKIM and DMARC (`p=quarantine`).
2. Create SMTP credentials and store them **only** in the Supabase dashboard (Auth → SMTP), never in the repo or in Vercel.
3. Set the sender name to "DISCIPLINE". The templates come from `content/copy/email-otp.md` (EN/DA).
4. Run a deliverability test on staging (Gmail, Outlook, iCloud). Sign the DPA and add the provider to the privacy policy's list of subprocessors.

## Sources
- [eualternative.eu: transactional email](https://eualternative.eu/categories/transactional-email/)
- [european-alternatives.eu: Scaleway TEM](https://european-alternatives.eu/product/scaleway-transactional-email)
- [Scaleway TEM product page](https://www.scaleway.com/fr/transactional-email-tem/)
- [Scaleway TEM capabilities and limits](https://scaleway.com/en/docs/transactional-email/reference-content/tem-capabilities-and-limits)
- [ahasend: best European email APIs 2026](https://ahasend.com/blog/best-european-email-apis-2026.md)
- [codenote: Supabase Auth custom SMTP comparison](https://codenote.net/en/posts/supabase-auth-custom-smtp-comparison/)
- [Supabase discussion #29370: default email provider changes](https://github.com/orgs/supabase/discussions/29370)
