# Screen: Sign-in

Owner: `ui-ux-designer` · Status: **v0.1, draft for step 1 (walking skeleton)** · 2026-11-11
Sources: product-spec AC-O1, AC-O4, AC-X4 · architecture §7.1 · design-system v0.4 §4, §6, §8, §11.5

## 1. Purpose
Get a person from "I want in" to Today with an email and a 6-digit code. Works the same for a new
and a returning person, and never reveals which one they are (no account enumeration).

## 2. Single primary action
- **Email step:** "Send code" (`signIn.sendCode`).
- **Code step:** "Sign in" (`signIn.verify`).
- **Code step, expired:** "Send a new code" (`signIn.resend`) becomes the filled button; "Sign in" steps down to secondary.

Only one filled (`--accent`) button is visible at any time.

## 3. Copy keys
The copy text is owned by `behavioral-product-specialist`. This spec references **keys only**, from
`content/messages/en.json` (the step 1 plan names `content/copy/en/auth.json`; keys follow whichever
file product finalizes).

| Use | Key |
|---|---|
| App name (header) | `common.appName` |
| Page heading | `signIn.title` |
| Email label / hint | `signIn.emailLabel` / `signIn.emailHint` |
| Email submit / in progress | `signIn.sendCode` / `signIn.sending` |
| Neutral "code sent" status | `signIn.codeSentNeutral` |
| Code label | `signIn.codeLabel` |
| Code submit / in progress | `signIn.verify` / `signIn.verifying` |
| Resend / cooldown | `signIn.resend` / `signIn.resendIn` (`{seconds}`) |
| Change email | `signIn.useDifferentEmail` |
| Errors | `signIn.errors.invalidEmail`, `.badCode`, `.expiredCode`, `.rateLimited`, `.captchaFailed`, `.unavailable`, `.offline` |
| Offline banner | `common.offlineBanner` (see open item C1) |
| Language switch | `common.languageLabel`, `common.languageEnglish`, `common.languageDanish` |
| Skip link | `common.skipToContent` |

**Copy requests to product (not yet keyed):** C2 `signIn.signedOut` ("You're signed out.", shown after sign-out), C3 `signIn.sessionEnded` (after a session expired), C4 `signIn.captchaLabel` if the CAPTCHA widget needs a visible label.

**Non-enumeration rule (design side):** for any syntactically valid email, the UI goes to the code step
with `signIn.codeSentNeutral`. Rate-limit, unavailable, and CAPTCHA errors look and read identically
whether or not the email has an account. The screen never says "account", "new", "welcome back", or
"not found".

## 4. Components
- **App header** (not sticky on this screen): app name in `--font-display` `--text-lg`, left; language switch, right.
- **Page heading** `<h1>`: `signIn.title`, `--text-xl`, `--font-display`.
- **Email field:** visible `<label>` above, hint under the label (`--text-sm`, `--text-muted`), `<input type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false">`, 48 px (`--control-height`), 1 px `--border-strong`, `--radius-control`, 16 px text.
- **CAPTCHA slot** (D5: Turnstile or hCaptcha, not yet chosen). Managed/invisible mode preferred. If a visible widget is required, it sits between the field and the button, full column width, with its own reserved height so nothing jumps. Off locally (step 1 plan §1).
- **Primary button** (design-system §6): full column width, 56 px, `--accent` fill, `--accent-contrast` label.
- **OTP input** (design-system §6): a **single** `<input inputmode="numeric" maxlength="6" autocomplete="one-time-code" pattern="[0-9]*">`, styled as 6 segments, 48 px tall, `--text-xl` tabular numerals, letter-spaced. Paste of a 6-digit string fills it; spaces and dashes are stripped on paste.
- **Email echo** (code step): the email the person typed, `--text-md`, followed by a text button `signIn.useDifferentEmail`. Showing their own typed input is not enumeration.
- **Resend control:** text button, 44 px tall. During cooldown it is `aria-disabled="true"`, stays focusable, and shows `signIn.resendIn` inline next to it.
- **Status line:** one `<p role="status">` under the primary button for progress and the neutral sent message.
- **Field error:** design-system §8 form-error pattern (2 px `--text` border, info glyph, message under the field, `aria-describedby`). Never `--danger`.
- **Offline banner:** design-system §6, top of `<main>`, not sticky, `role="status"`.

No illustration, no photo, no split-screen marketing panel, no tagline block (design-system §11.12).

## 5. Layout

### 360 px (primary)
```
┌────────────────────────────────┐
│ DISCIPLINE            Dansk    │  header: 56 px, gutter 16
├────────────────────────────────┤
│ [offline banner, when offline] │
│                                │  32 px
│ Sign in                        │  h1
│                                │  24 px
│ Email                          │  label
│ We'll send you a 6-digit code… │  hint
│ ┌────────────────────────────┐ │
│ │ name@example.com           │ │  48 px input
│ └────────────────────────────┘ │
│ (error line, when present)     │
│                                │  24 px
│ ┌────────────────────────────┐ │
│ │        Send code           │ │  56 px primary
│ └────────────────────────────┘ │
│ status line                    │
└────────────────────────────────┘
```
- Single column, `--gutter` 16 px both sides, content top-aligned (not vertically centered) so the
  soft keyboard never pushes the button off screen.
- **The primary button sits directly under the field, in flow. It is not docked to the bottom** on this
  screen: a bottom-docked button hides behind the soft keyboard on many devices.
- Code step replaces the email block in place: email echo + "Use a different email", then the OTP
  input, then "Sign in", then the resend row.

### 768 px
- Same column, `max-width: var(--form-max)` (400 px), horizontally centered. Header spans full width
  with 24 px gutters. 64 px between header and h1.

### 1280 px
- Identical to 768 (400 px column, centered). Background `--bg` everywhere; no side panel, no
  illustration. The calm comes from the empty space.

## 6. States

| # | State | Trigger | What the person sees | Focus / announce |
|---|---|---|---|---|
| S0 | **Loading** (page) | First paint | Server-rendered; form is visible immediately. No skeleton, no spinner. | — |
| S1 | **Email step** (also the empty state) | Arrive unsigned-in | Empty email field, "Send code" enabled. | Focus stays on the document; no autofocus (avoids a surprise keyboard on mobile). |
| S2 | **Invalid email** | Submit with a malformed email | `signIn.errors.invalidEmail` under the field, field `aria-invalid`. Typed text kept. Checked **on submit only**, never while typing. | Focus moves to the field; the error is read via `aria-describedby`. |
| S3 | **Sending** | Valid submit | Button label `signIn.sending`, `aria-busy="true"`, repeat presses ignored. Status line shows "Sending" only if > 300 ms. | Status line announces. |
| S4 | **CAPTCHA failed** | Provider rejects | `signIn.errors.captchaFailed` under the button (status line), email kept, widget reset. Stay on email step. | Status line announces; focus returns to the primary button. |
| S5 | **Code step** | Send accepted, **for any valid email** | Email echo, OTP input (empty), "Sign in", resend row in cooldown (S9). Status `signIn.codeSentNeutral`. | Focus moves to the OTP input. Status line announces `codeSentNeutral`. |
| S6 | **Verifying** | Submit code | `signIn.verifying`, `aria-busy`, code kept. No auto-submit at 6 digits (WCAG 3.2.2); the person presses "Sign in" or Enter. | Status line announces. |
| S7 | **Wrong code** | Verify returns `bad_code` | `signIn.errors.badCode` under the OTP input; field `aria-invalid`; the typed code stays and is selected so typing replaces it. | Focus to the OTP input. |
| S8 | **Expired code** | Server reports the code expired | `signIn.errors.expiredCode` under the OTP input. "Send a new code" becomes the filled primary; "Sign in" becomes secondary. After a new send, the OTP field clears and S5 returns. | Focus to "Send a new code". |
| S9 | **Resend cooldown** | Within 60 s of the last send (architecture §7.1) | Resend is `aria-disabled` with `signIn.resendIn` beside it ("… in 45 s"). The number updates each second visually. | Not announced every second. Announced once when the cooldown starts (inside S5's message) and once when resend becomes available. |
| S10 | **Rate-limited** | Server returns `rate_limited` on send or verify | `signIn.errors.rateLimited` in the status line; inputs kept; buttons stay enabled (the server decides). Identical for known and unknown emails. | Status line announces; focus stays. |
| S11 | **Unavailable** | `unavailable` / network error while online | `signIn.errors.unavailable`; inputs kept; the person can retry with the same button. | Status line announces. |
| S12 | **Offline** | `navigator.onLine === false` or a failed request with no network | Offline banner at top of `<main>`. Primary button `aria-disabled`, with `signIn.errors.offline` shown inline under it. Fields stay editable. When back online, the banner and inline reason disappear and the button re-enables. | Banner `role="status"` announces once per transition. |
| S13 | **Success** | Verify `ok` | Status `signIn.verifying` remains until the redirect to Today (or onboarding, later). No toast, no "Welcome" interstitial. | Today's `<h1>` receives focus on arrival. |
| S14 | **Already signed in** | Visit `/sign-in` with a session | Server redirect to Today; the form never renders. | — |
| S15 | **Signed out / session ended** | Redirected from sign-out or an expired session | S1 plus a one-line neutral status above the form (C2 / C3, pending copy). | Status announced politely. |

Missed-day state: not applicable.

## 7. Interactions
- Enter in the email field submits the email step; Enter in the OTP field submits the code step.
- "Use a different email" returns to S1 with the previous email prefilled and selected. The resend cooldown still applies server-side.
- Language switch on either step keeps the current step, the typed email, and any typed code. It never resets the flow.
- Browser back from the code step goes to the email step, not out of the page.
- Motion: step change is an opacity cross-fade over `--duration-base` (purpose: show that the form changed in place). Under reduced motion, `--duration-fast` opacity only. No slide.
- Buttons: press feedback via `--press-scale`; hover darkening only on fine pointers.

## 8. Language switch
- Lives in the header, top right, on both steps. Shows the **other** language, written in that language: "Dansk" when the page is English, "English" when it is Danish. The element carries `lang="da"` or `lang="en"` so screen readers pronounce it correctly.
- It is a button (or a link with `hreflang`), at least 44×44 px, text style, `--text-sm`. `aria-describedby` points to a visually hidden `common.languageLabel` so the purpose is announced.
- **If Danish strings are not shipped yet (D6 / product-spec Q10 open), the switch is not rendered.** Never show a control that does nothing.

## 9. Accessibility notes
- One `<h1>`; a skip link (`common.skipToContent`) is the first focusable element.
- All targets ≥ 44×44 px at 360 px: inputs 48 px, primary 56 px, text buttons padded to 44 px.
- Labels are visible and programmatically tied (`<label for>`); the hint is in `aria-describedby` along with any error.
- The OTP field is one input, so screen readers read one field and paste/autofill (`one-time-code`) work.
- Errors are never color-only: 2 px border, glyph, and text, plus `aria-invalid`.
- One `role="status"` live region per step; errors are not duplicated in an `alert` and a status at once.
- Contrast: all text pairs from design-system §2 are ≥ 4.5:1 in both themes; the input edge (`--border-strong`) and focus ring are ≥ 3:1.
- Focus ring: `--focus-ring-width` with `--focus-ring-offset` in `--focus-ring-offset-color`; never animated.
- `lang` on `<html>` matches the active language.
- The resend countdown doesn't announce every tick (no live-region chatter).
- Respects `prefers-reduced-motion` and 200 % zoom / 320 px reflow without horizontal scroll.

## 10. Open items
- **C1 (product):** `common.offlineBanner` currently says "Changes will sync when you reconnect." MVP offline is read-only and has no offline writes (AC-X4, architecture §7.3). Please reword, e.g. along the lines of AC-X4's offline copy.
- **C2–C4 (product):** copy keys listed in §3.
- **E1 (lead-architect / backend):** the step 1 contract `verifyOtp → … | 'bad_code'` has no `expired` reason, and Supabase may report expired and invalid codes the same way. If they can't be told apart, S8 folds into S7 and the resend control should be visually adjacent to the error. Either add an `expired` reason or confirm the fold.
- **E2 (lead-architect):** sign-out while offline (see `today-placeholder.md` §10).
- **D5 (owner):** CAPTCHA provider. The layout reserves the slot either way.
- **D6 / Q10 (owner):** Danish. Controls whether the language switch renders.
