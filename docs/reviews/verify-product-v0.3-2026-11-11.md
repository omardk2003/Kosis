# Verification: product review v0.2 blocking findings against spec v0.3

Reviewer: `behavioral-product-specialist` · 2026-11-11 · Inputs: docs/product-spec.md v0.3, docs/architecture.md §4.3.

## Per-finding status

**PR-1 Recovery after pause: RESOLVED.** AC-R1(b) skips weeks with no plan, and they don't break a run. AC-R1(a) requires ≥ 2 active days. AC-R5 defines a stable `lapse_key` and ends a lapse on any non-voided entry (late logs included) with `occurred_on` ≥ the key date.

**PR-2 Pause hides today's entry: RESOLVED (via the accepted deviation).** AC-H4, AC-H5 and AC-H8 and arch §4.3 `set_habit_status` (`effective_on` = server today + 1) apply "always tomorrow". Today stays active, so an entry is never hidden and logging today is never blocked. My finding was a subset of this rule. I accept the deviation.

**PR-3 Undeclared history exceptions: RESOLVED.** §2 lists (a) late log, (b) void, (c) minimum→full replacement, all within today − 7 … today and visible, and (d) confirmed delete. AC-L5 adds the window and the active-day check, and sets `late` if the day is before today. Arch §4.3 `replace_with_full` matches. The AC-H6 copy is present.

## New blocking issue

**N1. AC-R3 option 4 contradicts AC-H5/AC-H8.** It reads "Pause this habit → effective today (AC-H5)", but AC-H5, AC-H8 and arch §4.3 say tomorrow. An engineer following AC-R3 would reopen the 23:59 exploit, or would hit an RPC rejection on the Recovery path.
*Fix (spec owner, one line):* "**Pause this habit** → takes effect tomorrow (AC-H5). The card confirms: 'Pauses from tomorrow. Today still counts if you get to it.'"

There are no other new blocking contradictions, guilt copy or honesty holes.

## Verdict
APPROVE WITH CHANGES. Apply N1, then this review is cleared.
