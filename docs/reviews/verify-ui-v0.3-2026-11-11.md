# Verification: UI review v0.2 blocking findings against v0.3

Reviewer: `ui-ux-designer` · 2026-11-11 · Scope: design-system.md v0.3, product-spec.md v0.3 (AC-D1, AC-L4/L5, AC-P1–P3)

**Skill check:** I tried to invoke `design-taste-frontend` just now. The result was `Unknown skill: design-taste-frontend`, so it is **not available**. I did not install it. The install steps are in design-system §0 and need owner approval. This check used design-system.md as the source of truth.

## Findings 1–6

| # | Status | Evidence |
|---|---|---|
| 1 | RESOLVED | DS §2 `--border-strong` is light `#8F897E` and dark `#6E6960`, **exactly the values I proposed**. The missed cell is fill + 1 px edge, and the token is used for inputs, OTP, and pickers. |
| 2 | PARTIALLY | The DS §7 table covers all 9 states and matches AC-P3. **But** the DS §2 shape list still says "diagonal hatch = paused or archived", which brings back the ambiguity the table removes. |
| 3 | RESOLVED | DS §6/§7 and AC-P2 now match: 0% gets a 2 px stub, "no plan" gets an en-dash, "never look alike". Weeks with late entries get a ring marker. |
| 4 | RESOLVED | DS §4/§6 and AC-P1/P3: charts are non-interactive, the week list has 44 px rows, and the goal picker is Daily / Per week plus a 44 px stepper. |
| 5 | RESOLVED | AC-D1 and DS §4 agree on the docked action, its DOM/focus position, and the five-item order. Only the primary button uses an accent fill. |
| 6 | RESOLVED | AC-L4/L5 and DS §6: a 7-row, 44 px list. Days with a minimum entry stay enabled with "Replace minimum with full". Disabled rows use `aria-disabled`, stay focusable, and show the reason inline. |

## New blocking issues

**N1 (blocking, one-line fix).** The DS §2 line "diagonal hatch = paused or archived" contradicts the DS §7 table, where archived means no cells plus a row label. A frontend reading §2 would draw archived days as hatched, so paused and archived would look identical again. **Fix:** change the line to "diagonal hatch = paused; archived = no cells after the archive date". I own design-system.md, but this task restricts me to writing this report, so the fix is deferred to the next design-system edit.

There are no other new blocking issues.
