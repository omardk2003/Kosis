# Runbook: Supabase staging project (D3)

Owner: `lead-architect` · Status: **staging project created (2026-11); Auth and Vercel Preview settings pending the owner** · updated 2026-11-17

**Production ("Kosis Project", ref `byzvifolcjdugbogvkpz`) is never touched by this runbook.**

## 1. The owner creates the project (Supabase dashboard)
1. Create a new project in the "Kosis" organization:
   - **Name:** `Kosis Staging`
   - **Region:** the project exists as **"Kosis staging"**, ref `zgzbpekrtmznofujjmre`, in **eu-north-1 (Stockholm)**. That's deliberate and fine for staging: it's in the EU. Previews run in Vercel `dub1`, which adds a little latency.
   - **Plan:** Free is fine
   - **Database password:** generate a strong one and store it in your password manager. Never paste it into chat or a commit.
2. **Send the staging project reference** (the `xxxx` in `https://xxxx.supabase.co`) to Claude. The ref isn't a secret. Do **not** send keys or passwords.

## 2. Auth settings (dashboard → Authentication), to mirror ADR-0006
| Setting | Value |
|---|---|
| Email provider | Enabled. Confirm email: **off** (OTP proves ownership) |
| Email OTP length / expiry | 6 digits / **600 s** |
| Minimum interval between emails | **60 s** |
| Site URL | the staging Vercel preview URL (set once previews are enabled) |
| Redirect URLs | leave **empty**. Sign-in uses a 6-digit code with no links or redirects. Never add `*.vercel.app` |
| Email templates (Magic link, Confirm signup) | paste `supabase/templates/otp.html`, subject "Your DISCIPLINE sign-in code / Din kode til DISCIPLINE" |
| Bot and abuse protection | CAPTCHA **on**, provider **Turnstile**, secret = Cloudflare **test secret** `1x0000000000000000000000000000000AA` (always passes) |
| Rate limits | sign-ins/sign-ups 30 per 5 min per IP; token verifications 30 per 5 min per IP |
| SMTP | built-in sender is fine for staging (low volume). Custom SMTP only for production (D4) |

## 3. Linking and migrations (Claude, after the ref is provided and the owner approves)
```bash
npx supabase link --project-ref <STAGING_REF>
```
```bash
npx supabase db push --dry-run
```
- `db push` runs only after the dry run has been reviewed **and** the owner has approved it in the conversation.
- From Phase 1, migrations go to staging through the GitHub Actions workflow bound to the protected GitHub Environment `staging`, which requires owner approval. Production uses a separate Environment, `production`.
- Before any `db push`, the CLI's linked ref is checked against the production ref, and the push is aborted if they match.

## 4. Vercel (owner, dashboard)
- **Preview** environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` = staging URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = staging publishable key
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = `1x00000000000000000000AA`
- **Production** environment variables: production values only, set at launch (Phase 5).
- **Check:** no "Kosis Project" variables exist in the Preview or Development scopes. The Vercel–Supabase integration may sync `SUPABASE_*` or `POSTGRES_*` variables into every scope. Identify each one's purpose before removing it. The app reads only the three `NEXT_PUBLIC_*` variables above, plus `VERCEL_ENV` and `NODE_ENV`, which are automatic.
- Deployments: `vercel.json` enables Git deployments **only** for `claude/project-setup`, as Preview. All other branches, including `main`, stay off (ADR-0007).
- **Deployment Protection:** turn on *Vercel Authentication* for Preview, so only team members can open it.
- **Preview domain:** use the stable branch alias (`<project>-git-claude-project-setup-<team>.vercel.app`) as the Site URL in staging Auth.

## 5. Verification checklist
- [ ] The staging ref differs from `byzvifolcjdugbogvkpz`.
- [ ] The Auth settings match the table above.
- [ ] Preview variables point to staging. Production variables are scoped to Production only.
- [ ] A test sign-in on a preview deployment receives the bilingual code email (the built-in sender only delivers to team members' addresses).
- [ ] Turnstile is shown, the code works, and DevTools shows the `sb-*` cookies as HttpOnly, Secure and SameSite=Lax.
- [ ] After sign-out, `/today` redirects to sign-in.
- [ ] The new user exists only in staging (Auth → Users). Production still has 0 users, 0 tables and 0 migrations.
