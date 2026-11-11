# UI/UX review: spec set v0.2

Reviewer: `ui-ux-designer` · 2026-11-11 · Scope: design-system.md v0.2 against product-spec.md v0.2

The `design-taste-frontend` skill is not installed, so this review used design-system.md as the source of truth. The install steps are in design-system §0 and need owner approval.

## Verdict: APPROVE WITH CHANGES

Fix findings 1 to 6 before any screen spec in `docs/screens/` is finalized.

### Contrast (WCAG relative luminance, computed)
| Pair | Light | Dark |
|---|---|---|
| text / bg, surface | 15.8, 17.2 | 15.5, 14.1 |
| text-muted / bg, surface | 6.3, 6.9 | 7.3, 6.7 |
| accent-contrast / accent | 7.5 | 7.5 |
| accent / bg | 6.9 | 8.2 |
| **late** / bg, surface | 4.6, 5.0 | 9.2, 8.4 |
| **missed** / bg, surface | **1.36, 1.48** | **1.56, 1.42** |
| border / bg | ~1.2 | ~1.3 |
| focus / bg | 4.3 | 8.9 |

## Findings

**1. BLOCKING: `--missed` fails WCAG 1.4.11.** *DS §2.* The doc says graphics are ≥ 3:1, but `--missed` is about 1.4:1, so "not done" cells can't be perceived. `--border` is also too faint for input outlines.
**Fix:** Add `--border-strong`: light `#8F897E` (3.19 on bg, 3.47 on surface) and dark `#6E6960` (3.38, 3.09). A missed cell is the `--missed` fill plus a 1 px `--border-strong` edge. Use `--border-strong` for every input, OTP, and picker outline. `--border` stays decorative only.

**2. BLOCKING: The heatmap encodings don't match the spec's states.** *DS §2/§6 vs PS AC-P3.* The DS defines 6 encodings for 8 states plus the weekly no-mark case:
- Paused and archived look the same.
- "Not active yet" and "late + minimum" have no encoding.
- Ring, dashed outline, and missed edge are all outlines, so they blur together below about 24 px.

**Fix:** Add a state table to DS §7. Layout: 12 rows (weeks) × 7 columns, with "X of N" at the end of each row. Minimum cell size is 28 px.

| State | Encoding |
|---|---|
| Done | Square, `--accent` fill |
| Late | Ochre *circular* ring, 2 px stroke, 60 % of the cell, no fill |
| Minimum | `--accent` dot, ≥ 6 px |
| Late + minimum | Ring with the dot inside |
| Not done | Fill plus edge, from finding 1 |
| Today, pending | Dashed square, 1.5 px, `--text-muted` |
| Paused | 45° hatch, 2 px lines at a 5 px pitch |
| Archived | No cells after the archive date, row label "Archived <date>" |
| Not active yet / weekly no entry | Blank, no edge |

Every encoding must have a matching text label in the table alternative.

**3. BLOCKING: A 0 % bar and "no plan" look the same.** *DS §7, PS AC-P2.* With a zero-based axis, both render as empty space. That breaks the honesty rule.
**Fix:**
- 0 % is a 2 px `--border-strong` stub on the baseline.
- "No plan" has no stub. It shows an en-dash under the axis and "No plan" in the table.
- Weeks with late entries get an ochre ring marker above the bar.

**4. BLOCKING: Touch targets are under 44 px at 360 px.** *DS §6.*
- Bars are about 25 px wide.
- Heatmap cells are 28 to 34 px.
- The goal picker has 8 segments, about 41 px each.

**Fix:**
- Bars and cells are not interactive. Below them, a week list with 44 px rows ("Week of 2 Nov · 80 % · 8 of 10 planned · 1 logged later") gives the details and doubles as the table alternative.
- The goal picker becomes a two-segment choice, Daily / Per week, plus a − N + stepper with 44 px buttons.

**5. BLOCKING: Where the primary action goes on Today is contradictory.** *PS AC-D1 says "the top". DS §4 says the lower half.* The order of the inline cards is also undefined.
**Fix:** On mobile, "Start: <habit>" docks above the bottom nav. In DOM and focus order it comes right after the heading. The Today order is:
1. Offline banner
2. Timezone prompt
3. One inline card (recovery, otherwise reflection)
4. Sections
5. Quote under the primary action

Row checks use a neutral outline until done. Only the primary button uses an `--accent` fill.

**6. BLOCKING: The late-log picker contradicts itself.** *AC-L4 disables days that are "already completed", but AC-L5 allows replacing a minimum entry.*
**Fix:**
- Show a list of 7 day rows at 44 px instead of a calendar.
- Days with a minimum entry stay enabled and offer "Replace minimum with full".
- Disabled rows use `aria-disabled`, stay focusable, and show the reason inline, not as a tooltip.

**7. NON-BLOCKING: Some states are missing.** *DS §8, §10.*
- **Sign-in:** wrong code, expired code, resend cooldown, rate-limited. Use non-enumerating copy: "If this email can sign in, we've sent a code."
- **Onboarding:** timezone detection fails.
- **Settings:** export preparing / ready / error, and the delete-account code step.
- **Offline:** Start, Resume, "Log a past day", and the settings toggles are disabled with the reason, and the screen shows "Last updated <time>".

**8. NON-BLOCKING: Action Mode has no button hierarchy.** *DS §6.*
**Fix:** Done is the filled button. "Do the minimum" is an outline button. "Not now" is a text button. When the user arrives from recovery ("Do the minimum now"), the minimum is the filled button. Done shows the same undo toast.

**9. NON-BLOCKING: The undo toast is a timed interaction.** *DS §6.*
**Fix:** Pause the timer on hover and focus. Announce with `aria-live="polite"` and don't move focus. Place the toast above the nav without covering the primary action. "Remove today's entry" stays the untimed alternative.

**10. NON-BLOCKING: Spec copy uses a banned word.** *PS AC-H6 says "what will be lost".*
**Fix:** "This permanently deletes <habit> and its N entries. Archiving keeps them."

**11. NON-BLOCKING: The focus ring has low contrast on the accent.** It's 1.6:1 on the light accent.
**Fix:** Use a 2 px ring with a 2 px `--bg` offset.

**12. NON-BLOCKING: The onboarding quote opt-in would add a third question.** *AC-Q2.*
**Fix:** Offer it in Settings only. Settings shows the week start as read-only, with a reason.

**13. NON-BLOCKING: The current-week chip looks tappable.**
**Fix:** Make it a non-interactive pill: `--text-muted` text with a `--border-strong` edge and no fill.

**14. NON-BLOCKING: The OTP field should be a single input.** Use one input with `inputmode="numeric"` and `maxlength="6"`, styled to look segmented. Six separate boxes make paste and screen readers worse.

The guilt-free language is good. There's no red, recovery copy is calm, and "not done" is neutral.
