# DISCIPLINE — Design System

Owner: `ui-ux-designer` · Status: **v0.4, pending owner approval** · 2026-11-11

### Changelog
- **v0.4:**
  - §0: the owner chose Taste Skill **option A (distill, don't install)**. The skill is intentionally not installed.
  - New §11: principles adapted from Taste Skill (MIT, attributed), with an explicit rejected list.
  - §4: adds the layout tokens now in `src/styles/tokens.css` (`--form-max` 400 px, `--control-height` 48 px, `--measure` 62ch).
  - §8: form-error pattern (no red; see §11.5).
  - First screen specs: `docs/screens/sign-in.md`, `docs/screens/today-placeholder.md`.
- **v0.3:** Resolves UI review blocking findings 1–6:
  - `--border-strong` token for 3:1 graphics contrast.
  - Full heatmap encoding table.
  - 0% vs "no plan" are distinct.
  - Non-interactive charts plus a 44 px week list.
  - The goal picker is a stepper.
  - Today's primary action is docked, with a defined page order.
  - The late-log picker is a day list.

  Also adds the non-blocking items: Action Mode button hierarchy, accessible undo toast, focus-ring offset, single OTP input, non-interactive chip, and missing states.
- **v0.2:** Aligned with product-spec v0.2:
  - The minimum marker is a small dot, not a half.
  - Heatmap states now include today pending, paused, and archived.
  - The current week is shown as a chip.
  - The late-log picker covers today−7…today−1.
  - The Action Mode timer is removed.
  - There's one recovery card at a time.
  - Sign-in and onboarding screens are added.
  - The quote is off by default.
  - `tokens.css` has a single owner.
  - The banned-word list is extended.

## 0. Required skill: `design-taste-frontend`

**Status: intentionally NOT installed.** Owner decision (2026-11-11): **option A, "distill, don't
install"**, from `docs/reviews/taste-skill-assessment-2026-11-11.md` §4.

This is a third-party, MIT-licensed skill from
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill). Version 2.5.1 targets marketing
sites, embeds a `Stop` hook that runs Node scripts and headless Chrome every turn, and ships
153 scripts. So its text was read once, read-only, at commit `f6b7657`, and the principles that fit
a calm habit app are written into **§11** in our own words. Nothing from the repo was installed,
executed, or copied into `.claude/skills/`.

- When an agent's instructions say "invoke `design-taste-frontend`", the call is expected to fail.
  Use **§11** as the substitute. No install instructions are kept here on purpose.
- Re-evaluating (option B, a text-only vendored copy, or C) needs a new owner decision and a fresh
  security review. Only the original repo counts; mirrors and forks under other names don't.
- If anything in §11 conflicts with §1–§10, **§1–§10 win**.

## 1. Design direction
**"Quiet instrument."** A well-made tool: warm paper-like neutrals, one confident accent,
generous whitespace, typographic hierarchy over boxes and borders. Calm doesn't mean bland.
Its distinctiveness comes from type, rhythm, and a single signature element (the consistency
bars), not from decoration.

Avoid: purple-gradient SaaS look, glassmorphism, emoji-as-UI, confetti, red failure
states, dense card grids, and "streak flame" imagery.

## 2. Color tokens
Use CSS custom properties. Light and dark themes are both first-class. Every text pair is
≥ 4.5:1, and UI/graphic elements are ≥ 3:1.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F7F5F0` | `#141413` | App background (warm paper / warm ink) |
| `--surface` | `#FFFFFF` | `#1E1D1B` | Raised surfaces |
| `--text` | `#1C1B19` | `#EDEBE6` | Primary text |
| `--text-muted` | `#5E5A53` | `#A8A39A` | Secondary text |
| `--border` | `#E4E0D8` | `#2E2C29` | Decorative hairlines only (≈1.2:1, never informative) |
| `--border-strong` | `#8F897E` | `#6E6960` | Informative edges: inputs, OTP, pickers, missed-cell edge, 0% bar stub, chip edge (≥ 3:1 on bg and surface) |
| `--accent` | `#2F5D50` | `#7FB8A4` | Primary action, "done" (deep green-teal) |
| `--accent-contrast` | `#FFFFFF` | `#0F1F1A` | Text on accent |
| `--late` | `#8A6A2E` | `#D3B37A` | "Logged later" marker (ochre), always paired with a hollow shape |
| `--missed` | `#D9D4CA` | `#3A3733` | Not-done fill: neutral, **never red**. Always paired with a 1 px `--border-strong` edge, because the fill alone is ~1.4:1 |
| `--danger` | `#9B2C2C` | `#F2A3A3` | Destructive actions only (delete) |
| `--focus` | `#1F6FEB` | `#79B8FF` | Focus ring: 2 px with a 2 px `--bg` offset, so it stays visible on `--accent` |

Status is never conveyed by color alone. Use shape too:
- filled = done
- ring = logged later
- small centered dot = minimum (not a half, which would imply half credit)
- empty neutral = not done
- dashed outline = today, pending
- diagonal hatch = paused (archived rows show no cells after the archive date; see the §7 table)

## 3. Typography
- **Display/headings:** a characterful serif or grotesk with open licensing, e.g. *Fraunces*
  (OFL) for the primary action and big numbers. **Body/UI:** *Inter* (OFL) or the system UI
  stack.
- Scale (rem, 16 px base): 0.8125 · 0.9375 · 1 · 1.25 · 1.5 · 2 · 2.75 (stat numerals).
- Tabular numerals for all stats. Line-height 1.5 body, 1.15 display.
- Self-host fonts with `font-display: swap`. Budget ≤ 2 font files on the critical path.

## 4. Spacing, layout, shape
- 4 px base grid. Spacing tokens: 4, 8, 12, 16, 24, 32, 48, 64.
- Mobile gutter 16 px, max content width 640 px (single column even on desktop for Today).
  Short forms (sign-in) use a 400 px column (`--form-max`). Running text is capped at 62ch (`--measure`).
- Text inputs and the OTP field are 48 px tall (`--control-height`), with 16 px text so iOS never zooms.
- Radii: 8 (controls), 14 (cards), 999 (pills). Elevation: hairline borders by default, one
  soft shadow level for the Action Mode sheet only.
- Thumb zone: on mobile, Today's primary action **docks above the bottom navigation**. In DOM and focus order it comes right after the page heading (spec AC-D1). Sticky bottom navigation with ≤ 3 tabs: **Today · Progress · Habits**.
- **Today page order:**
  1. Offline banner
  2. Timezone prompt
  3. At most one inline card (recovery, otherwise reflection)
  4. Sections (Due today, Optional today, Done today, Paused)
  5. Quote, under the primary action
- Only the primary button uses an `--accent` fill. Row checks use a neutral `--border-strong` outline until done.
- **Touch targets:** every interactive element is ≥ 44×44 px at 360 px width. Charts are not interactive. Details live in 44 px list rows.

## 5. Motion
- Durations 120 / 200 / 320 ms, using a standard ease-out curve.
- Completion: a check draws in plus a subtle 1.0 → 1.04 → 1.0 scale. No particles.
- `prefers-reduced-motion`: replace with opacity fades ≤ 120 ms.

## 6. Core components
- **Primary Action Button:** full width, 56 px tall, display font.
- **Habit Row:** name, weekly progress "2 of 3", and a one-tap check ≥ 44 px. A done row offers "Remove today's entry".
- **Today sections:** Due today, Optional today, Done today, Paused.
- **Undo Toast:** 5 s. The entry is already saved; undo creates a void. The timer pauses on hover and focus. It's announced with `aria-live="polite"`, doesn't move focus, and sits above the nav without covering the primary action. "Remove today's entry" is the untimed alternative.
- **Inline Card:** used for recovery (max one on screen), reflection, and quote. Dismissible, never modal.
- **Action Mode Sheet:** full screen. Shows the implementation intention and the minimum version. Button hierarchy:
  - **Done:** filled.
  - **Do the minimum:** outline. It becomes filled when opened from Recovery.
  - **Not now:** text button.

  **No timer in MVP.**
- **Consistency Bars:** 12 completed weeks, zero-based, **not interactive**. A 0% week shows a 2 px `--border-strong` stub on the baseline. A "no plan" week has no stub and shows an en-dash under the axis. Weeks with late entries get a small ochre ring marker above the bar.
- **Week List:** below the bars, 44 px rows: "Week of 2 Nov · 80% · 8 of 10 planned · 1 logged later · 2 minimum" or "Week of 26 Oct · No plan". It doubles as the accessible table alternative.
- **Current-week chip:** a non-interactive pill reading "In progress · 3 done so far", in `--text-muted` with a `--border-strong` edge and no fill.
- **Habit Heatmap:** 12×7 cells with shape-coded states.
- **Goal Picker:** two segments, **Daily / Per week**. Per week adds a **− N +** stepper (1–7) with 44 px buttons. When editing, it shows "Applies from <next week start>" (or "from <creation date>" during the creation week).
- **Late-log Day List:** 7 rows (yesterday … 7 days ago), 44 px each, instead of a calendar. A day with a minimum entry offers "Replace minimum with full". Disabled rows use `aria-disabled`, stay focusable, and show the reason inline, not in a tooltip.
- **OTP Input:** a **single** `<input inputmode="numeric" maxlength="6" autocomplete="one-time-code">`, styled to look segmented. Paste-friendly, and read as one field by screen readers.
- **Skeletons**, **Empty State**, **Error Banner**, **Offline Banner**.

## 7. Data visualization rules
- Zero-based y-axis.
- No smoothing or interpolation across "no plan" weeks; render a gap with an en-dash. 0% is never a gap: it gets the baseline stub.

**Heatmap encoding.** 12 rows (weeks) × 7 columns, with "X of N" at the end of each weekly row. Minimum cell size is 28 px, and cells are not interactive.

| State | Encoding | Text label (table alternative) |
|---|---|---|
| Done | Square, `--accent` fill | "done" |
| Logged later | Ochre **circular** ring, 2 px stroke, 60% of the cell, no fill | "done, logged later" |
| Minimum | `--accent` dot, ≥ 6 px | "minimum" |
| Logged later + minimum | Ochre ring with the dot inside | "minimum, logged later" |
| Not done | `--missed` fill + 1 px `--border-strong` edge | "not done" |
| Today, pending | Dashed square, 1.5 px, `--text-muted` | "today, not yet" |
| Paused | 45° hatch, 2 px lines at a 5 px pitch, `--text-muted` | "paused" |
| Archived | No cells after the archive date. Row label "Archived <date>" | "archived" |
| Not active yet / weekly day without entry | Blank, no edge | "—" |

- The current week is never a bar. It's shown as an "in progress" chip.
- Late logs and minimum entries are visibly distinct.
- Trend copy uses neutral color, with no red/green arrows.
- Every value is reachable as text for screen readers, via a table alternative. Missed cells are labeled "not done".

## 8. Required states (every screen)
| State | Pattern |
|---|---|
| Loading | Skeleton matching the final layout. Never a full-screen spinner > 300 ms |
| Empty | One sentence of context + one primary action |
| Error | Plain-language cause + Retry. Keep showing cached data when available |
| Success | Brief inline confirmation or toast. No modal |
| Offline | Quiet banner. Data already loaded stays visible with "Last updated <time>". Start, Resume, "Log a past day" and settings toggles are disabled with the reason ("You're offline. This needs a connection."). A cold start offline shows the shell plus "You're offline. Connect to see your habits." |

**Form errors** never use `--danger` (it's reserved for destructive actions) and never rely on color.
The pattern: the field gets a 2 px `--text` border and `aria-invalid="true"`. The message sits
directly under the field in `--text`, preceded by a 16 px "info" glyph (circle with "i", `aria-hidden`),
and is linked with `aria-describedby`. See §11.5.

**Screen-specific states:**
- **Sign-in:** wrong code, expired code, resend cooldown ("You can request a new code in 45 s"), rate-limited, CAPTCHA failed, service unavailable. Copy never reveals whether an email is registered. Full spec: `docs/screens/sign-in.md`.
- **Onboarding:** timezone detection failed. Show a searchable list.
- **Settings:** export preparing / ready / error. Delete account: the code step. Week start is shown read-only with the reason "Set during onboarding".

## 9. Voice & tone
Calm, direct, kind, brief. "Workout was quiet last week. Want to get back on track?" — not
"You failed your workout goal!" Banned in UI copy: *fail, failed, broke, broken, lost, lazy,
should have, streak, don't lose, catch up, just 1 more*. Sentence case everywhere.

## 10. Screens to spec (docs/screens/)
- sign-in (email → 6-digit code) — **specced** (`docs/screens/sign-in.md`)
- today-placeholder (walking skeleton only) — **specced** (`docs/screens/today-placeholder.md`)
- onboarding (≤ 2 steps: confirm timezone and week start, then first habit name + goal)
- today
- action-mode
- habit-create-edit
- habit-detail
- late-log
- recovery-card
- progress
- weekly-reflection
- settings (quotes, recovery, timezone, export, sign out, delete account)

**Token ownership:** `src/styles/tokens.css` is written only by `ui-ux-designer`. The frontend consumes it and requests changes via `docs/handoffs/`.

## 11. Principles adapted from Taste Skill

> Adapted from tasteskill by Leonxlnx (MIT), https://github.com/Leonxlnx/taste-skill, commit f6b7657.
> Copyright (c) 2026 Leonxlnx. Used under the MIT License. The wording below is our own paraphrase;
> no code, assets, or scripts from that repository are used.

The source is written for marketing websites. Only principles that hold for a calm, mobile-first
**app** are kept. Each one is mapped to what it means in DISCIPLINE. §1–§10 win on any conflict.

### 11.1 One system, one of each
**Principle.** A product looks deliberate when every screen draws from one small set: one button
family, one radius scale, one link style, one card recipe, one hairline. Boxes nest two levels at most.
**In DISCIPLINE.**
- `src/styles/tokens.css` is the only source of color, spacing, radius, type, and motion values.
  Components never hard-code a hex value or a pixel radius.
- Buttons: **primary** (accent fill), **secondary** (outline, `--border-strong`), **text**. No fourth style,
  no ghost, gradient, or shadowed buttons.
- Inline Cards never contain another card. A habit row is a row, not a card.

### 11.2 Exactly one filled control per view
**Principle.** One filled button marks the main action. Everything else steps down.
**In DISCIPLINE.** This reinforces the "one primary action" rule (§4, AC-D1). `--accent` fill appears
on one control per view. The Action Mode hierarchy (Done filled, minimum outline, Not now text) follows it.
The same action label never appears twice on one screen.

### 11.3 A neutral interface with one sparing accent
**Principle.** The UI stays overwhelmingly neutral. A single accent carries the main action, focus, and
state, and stays rare elsewhere. Ink is a warm near-black, never pure `#000`.
**In DISCIPLINE.** Already our direction (§1, §2). `--accent` is reserved for the primary action and
"done" marks. Emphasis comes from weight and size, not colored highlights behind words.

### 11.4 Readable type, quiet labels
**Principle.** Text people read is at least 16 px with a line height of 1.5 or more, and lines stay
around 60 characters. Muted color is for meta (dates, labels), not for sentences. Nothing is smaller
than 13 px. Sentence case; no tracked all-caps labels. A number never wraps away from its unit.
**In DISCIPLINE.**
- Body is `--text-md` (16 px) in `--text`. `--text-muted` only for meta like "2 of 3 this week".
- `--text-xs` (13 px) is the floor. `--measure` caps paragraphs at 62ch.
- Use non-breaking spaces inside values like "8 of 10" and "45 s" so they never split across lines.
- Tabular numerals for all stats (§3).

### 11.5 Forms that respect the person typing
**Principle.** Labels are visible and sit above their fields; a placeholder is never the label. Fields use
the right type and autocomplete. Validate on submit, not while typing. Each error sits under its field,
names what to fix, and is wired to the field programmatically. Focus moves to the first problem. One
status line announces progress. Success is shown only after the server confirms. Nothing typed is lost
on failure. Input text is 16 px.
**In DISCIPLINE.** This is the sign-in recipe (`docs/screens/sign-in.md`) and the default for every later
form (habit create/edit, reflection, delete confirmation). Errors follow the §8 form-error pattern,
never `--danger`.

### 11.6 Motion with a reason, and nothing that moves on its own
**Principle.** Each motion has a stated purpose. Animate transform and opacity only, never width, height,
or margin. Eases settle without overshoot or bounce. Nothing reveals, staggers, or parallaxes on scroll.
No carousels, auto-advancing elements, or rotating notices. Hover effects apply only to fine pointers,
and every hover state is also reachable by focus and tap. The focus ring never animates. Content is
complete at rest and under reduced motion.
**In DISCIPLINE.** Our motion list (§5) is already small: the completion check, sheet open/close, toast
in/out, press feedback (`--press-scale`). Every one of them must name its purpose in the screen spec.
`--ease-standard` has no overshoot. Under `prefers-reduced-motion`, scale tokens drop to 1.

### 11.7 Focus is always visible and never hidden
**Principle.** Keyboard focus shows instantly, in full, and is never covered by a fixed header or bar. Tab
order equals reading order; no positive `tabindex`. Every control has an accessible name.
**In DISCIPLINE.** The docked primary action and the bottom navigation must never cover a focused element
(WCAG 2.2 SC 2.4.11). Content gets bottom padding equal to the docked stack height, and focused items
scroll into view above it.

### 11.8 Fixed chrome stays still
**Principle.** A sticky bar looks the same at every scroll position: no shrinking, blurring, hiding, or
color flipping, and it never covers content.
**In DISCIPLINE.** The bottom navigation and the docked primary action are opaque `--bg` with a top
`--border` hairline, and never use glass or blur. They don't auto-hide on scroll.

### 11.9 Fast and stable by default
**Principle.** Small font budget, space reserved for everything that loads so the layout never jumps,
no intro screens or loaders that gate reading.
**In DISCIPLINE.** ≤ 2 font files on the critical path (§3). Skeletons match final layout (§8), so
layout shift stays under 0.1. No splash or "welcome" interstitial.

### 11.10 Plain, specific words
**Principle.** Say what a thing is in words a stranger gets in seconds. Buttons are a verb plus an
object; never "Learn more" or "Click here". Headings name things. The interface never talks about
itself ("Below you'll find…"). Facts replace adjectives. Watch for over-correction: a calm vocabulary
("quietly", "steady", "honest") can itself become a repeated tic.
**In DISCIPLINE.** Copy is owned by `behavioral-product-specialist` (§9, product-spec §9). Design flags
copy that breaks this in UI reviews; for example, avoid using "quiet" in many different strings.

### 11.11 Never invent
**Principle.** No invented reviews, quotes, customers, or figures.
**In DISCIPLINE.** This matches product rules 3 and 7: no demo data in real accounts, and quotes only with
recorded provenance. Empty states say what will appear, never show sample numbers.

### 11.12 Rejected, and why
| Taste Skill principle | Why it's rejected for DISCIPLINE |
|---|---|
| Hero sections, "one section per screen", a hard fact on the first screen | Marketing-page structure. An app screen leads with its primary action. |
| Real or stand-in photography, full-color third-party icons | No photography in the product; icons are monochrome line glyphs. Stock imagery adds noise and licensing risk (rule 7). |
| Shader/WebGL effects, big scenes, "dealt moments" | Decorative effects contradict the "quiet instrument" direction and the performance budget. |
| A mandatory hero entrance animation on load | Delays the < 5 s "open to doing" goal (§4.3). Today renders at rest. |
| Count-up numbers and looping card animations | Animating stats reads as gamified, and can briefly show wrong values. Numbers render final. |
| Mandatory hover lift on cards, photo zoom on hover | Mobile-first touch UI; rows and cards are not hover targets. Only button press feedback is kept. |
| Randomly "dealing" palettes, layouts, radii, and logo marks per page | We want one stable system across every screen, not variety. |
| Dark mode only for tech pages | Dark is first class here and follows the OS setting. |
| Navigation mega-menus, footers, phone action bar tied to hero scroll, share/OG rules | Website chrome. The app uses ≤ 3 bottom tabs. |
| Word-count budgets per screen | Website rule. Our copy rule is "brief" (§9), checked by review. |
| Automated checker/gate scripts and the `Stop` hook | Not installed (§0). Our checks are axe, Playwright, and copy-lint from `docs/testing-strategy.md`. |
| "No violet" as an absolute color rule | Not needed as a rule; our palette is fixed in §2 and has no violet. |
