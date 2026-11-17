# Screen: Today (placeholder, walking skeleton)

Owner: `ui-ux-designer` · Status: **v0.1, draft for step 1** · 2026-11-11
Sources: product-spec AC-O4, AC-D1, AC-X4 · architecture §7.1, §7.3 · design-system v0.4 §4, §6, §8, §11
Replaced by `docs/screens/today.md` when Phase 1 builds the real Today. This placeholder exists only
to prove sign-in, session, sign-out, offline shell, and the token pipeline end to end.

## 1. Purpose
Confirm "you're in" after sign-in, and let the person sign out. Nothing else. It shows **no personal
data**: no email (masked or otherwise), no name, no avatar. Only the neutral "signed in" line.

## 2. Single primary action
**None in the filled sense, on purpose.** The docked primary-action slot is reserved for
"Start: <habit>" (AC-D1). Putting "Sign out" there would teach people that the accent button signs
them out. So:
- The only action, **Sign out** (`today.signOut`), is a **secondary** (outline) button in page flow.
- No `--accent` fill appears on this screen.

## 3. Copy keys
Owned by `behavioral-product-specialist`; keys from `content/messages/en.json`.

| Use | Key |
|---|---|
| App name (header) | `common.appName` |
| Page heading | `today.title` |
| Signed-in line | `today.signedIn` |
| Placeholder body | `today.placeholder` |
| Sign out | `today.signOut` |
| Offline banner | `common.offlineBanner` (see sign-in C1) |
| Offline reason for disabled sign-out | `signIn.errors.offline` is sign-in specific; **request C5** `common.needsConnection` ("You're offline. This needs a connection.", design-system §8) |
| Sign-out failed | **request C6** `today.signOutFailed` |
| Language switch | `common.languageLabel`, `common.languageEnglish`, `common.languageDanish` |
| Skip link | `common.skipToContent` |

## 4. Components
- **App header:** app name left (`--font-display`, `--text-lg`), language switch right. Same component as sign-in.
- **Offline banner** (design-system §6): first thing in `<main>`, not sticky, `role="status"`.
- **Page heading** `<h1>`: `today.title`, `--font-display`, `--text-xl`.
- **Signed-in line:** `today.signedIn`, `--text-md`, `--text-muted`, with a 16 px check glyph (`aria-hidden`) in `--text-muted`. Not accent: it's a fact, not a success celebration.
- **Placeholder body:** `today.placeholder`, `--text-md`, `--text`, max `--measure`.
- **Sign-out button:** secondary style: 48 px (`--control-height`), 1 px `--border-strong` outline, `--text` label, `--radius-control`, auto width with 24 px side padding (full width at 360).
- **Status line** (`role="status"`) under the button for "signing out" and failures.

No bottom navigation yet (Progress and Habits don't exist). No docked area.

## 5. Layout

### 360 px
```
┌────────────────────────────────┐
│ DISCIPLINE            Dansk    │  header 56 px, gutter 16
├────────────────────────────────┤
│ [offline banner, when offline] │
│                                │  32 px
│ Today                          │  h1
│ ✓ You're signed in.            │  muted, 8 px below h1
│                                │  24 px
│ Your habits will appear here   │  body
│ soon. Nothing to do yet.       │
│                                │  48 px
│ ┌────────────────────────────┐ │
│ │         Sign out           │ │  48 px secondary, full width
│ └────────────────────────────┘ │
│ status line                    │
└────────────────────────────────┘
```
- Content top-aligned, single column, `--gutter` both sides.
- Sign out sits **in flow** below the content, not docked. The docked slot stays empty and absent.

### 768 px
- Column `max-width: var(--content-max)` (640 px), centered; header full width, 24 px gutters.
- Sign out returns to auto width, left-aligned with the text column.

### 1280 px
- Same as 768. No sidebar, no empty dashboard frame or fake widgets (rule: never invent data).

## 6. States

| # | State | What the person sees | Focus / announce |
|---|---|---|---|
| T0 | **Loading** | Server-rendered after the session check; the page arrives complete. On client navigation, a skeleton of h1 + two lines only if it takes > 300 ms. No spinner. | — |
| T1 | **Success** (default, also the "empty" state) | Heading, signed-in line, placeholder body, Sign out. The placeholder body *is* the empty state: one sentence of context; there is no habit action yet. | After sign-in, focus lands on the `<h1>` (programmatic, `tabindex="-1"`). |
| T2 | **Not signed in / session expired** | Server redirect to sign-in (sign-in S15). Never shows Today content. | — |
| T3 | **Signing out** | Button label unchanged, `aria-busy="true"`, repeat presses ignored; status "Signing out" only if > 300 ms (key: reuse `common.loading` until product supplies one). | Status announces. |
| T4 | **Signed out** | Redirect to sign-in. Before redirect, the app clears Cache Storage per architecture §7.3. Sign-in shows C2. | Focus on sign-in `<h1>`. |
| T5 | **Error: sign-out failed** (online) | Status line C6 + the same button acts as retry. The person stays on Today. | Status announces; focus stays on the button. |
| T6 | **Offline** (session open) | Offline banner. Content stays visible. Sign out is `aria-disabled`, still focusable, with C5 shown inline under it. Re-enables on reconnect. | Banner announces once per transition. |
| T7 | **Offline, cold start** | Served by the offline shell (`src/app/offline/page.tsx`): header, `offline.title` as h1, `offline.body`. No Today content, no sign-out (no session data on device). | — |
| T8 | **Error: page failed to load** (online) | Shell with `common.retry` button and a plain-language line (request C7 `today.loadFailed` if product wants one; otherwise `signIn.errors.unavailable`-style wording). | Focus to the retry button. |

Missed-day state: not applicable (no habits yet).

## 7. Interactions
- Sign out: single press → T3 → T4. No confirmation dialog (it is reversible: sign in again).
- Language switch: same behavior as sign-in §8; reloads strings in place, keeps the page, and is not rendered until Danish ships (D6).
- Motion: none beyond button press feedback (`--press-scale`). No entrance animation.

## 8. Language switch location
Header, top right, identical to sign-in so it is found in the same place on every screen. When real
Today ships with bottom navigation, the switch moves to **Settings** (design-system §10) and leaves the
header, keeping the Today header free for the date and the primary action. This placeholder keeps it
in the header because Settings doesn't exist yet.

## 9. Accessibility notes
- Skip link first; one `<h1>`; landmarks: `<header>`, `<main>`.
- All targets ≥ 44×44 px at 360 px (sign-out 48 px; language switch padded to 44 px).
- Disabled sign-out uses `aria-disabled` (stays focusable) with the reason as visible text, linked by `aria-describedby`. No tooltip-only reasons.
- The check glyph next to "signed in" is decorative; the text carries the meaning.
- No personal data in the DOM, page title, or `aria-*` (page title: `today.title` · `common.appName`).
- Contrast per design-system §2 in both themes; `--text-muted` on `--bg` ≥ 4.5:1.
- Reflows at 320 px and 200 % zoom without horizontal scroll; honors reduced motion (nothing moves anyway).

## 10. Open items
- **E2 (lead-architect):** sign-out offline. Session cookies are httpOnly and server-cleared, so this spec disables sign-out offline (T6). If the architecture wants a "clear local caches now, finish server sign-out on reconnect" path for shared devices, the spec will change.
- **C5–C7 (product):** copy keys in §3 and §6.
- **C1 (product):** the offline banner wording (see sign-in §10).
- **D6 (owner):** Danish. The switch is hidden until strings exist.
