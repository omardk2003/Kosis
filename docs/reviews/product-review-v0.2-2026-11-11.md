# Product & behavioral review: spec set v0.2

Reviewer: `behavioral-product-specialist` · 2026-11-11 · Scope: CLAUDE.md, docs/*.md. Owner decisions in §10.1 are taken as given.

## Verdict: APPROVE WITH CHANGES

**v0.1 findings:** 1–5, 7, 8, 10, 11, 13, 14 and 15 are resolved. Finding 7 is resolved because week start is now fixed in MVP. Findings 6, 9 and 12 are partly resolved (see 1, 5 and 8 below).
**Worked examples recomputed:** (1) A = 5 on time + 1 late = 6/7, B = 2/3, floor(800/10) = 80%. (2) ceil(12/7) = 2, so 1/2 = 50%. (3) floor(200/3) = 66%. All three are correct.

## Findings

**1. BLOCKING: Recovery fires after a pause (spec AC-R1, AC-R5).** A habit paused all of last week has planned = 0 and 0 completions. After resuming, the user sees "was quiet last week", which punishes honest use of Pause. The spec also leaves undefined: a daily habit with fewer than 2 active days, the key for a lapse that runs on, and whether a late log for an older date ends a lapse.
*Replace AC-R1(b) with:* "`weekly_count`: the last completed week **with planned > 0** had 0 completions, or the last two completed weeks with planned > 0 were both below planned. Weeks with no plan are skipped. They don't count and they don't break a run."
*Append to AC-R1:* "(a) needs ≥ 2 active days before today. The 'no completed week' rule applies to `weekly_count` only."
*Replace the AC-R5 key sentence with:* "`lapse_key` = habit + the first missed date (daily), or the start of the first qualifying week in the current run (weekly). The key stays the same while the lapse continues. A lapse ends when an entry exists with `occurred_on` ≥ that date."

**2. BLOCKING: Pausing after completing today hides the entry (AC-H5, AC-H8, §7.2).** If today is done and the user then pauses, today becomes a paused day. §7.2 counts only active days, so a real completion silently drops out of the stats. The reverse case (pause, then complete) is rejected with no explanation.
*Add AC-H9:* "If today already has a non-voided entry, pause and archive take effect **tomorrow**. Confirmation: 'Paused from tomorrow. Today's entry stays.' If today is paused, logging today is disabled with 'Paused today. Resume to log it.'"
Handoff needed: architecture §4.3 `set_habit_status` currently accepts only today.

**3. BLOCKING: §2 lists only one exception, but two more operations change completed weeks (§2, AC-L5, AC-H6).** Replacing a minimum entry with a full one has no date window, which lets users edit outside the 7-day late window, and the spec doesn't define its `source`. Delete also recalculates past weeks.
*Replace in §2:* "No operation changes a completed week's evaluation except (a) a late log, (b) a minimum→full replacement, both within today − 7 … today and labeled, and (c) deleting a habit, which the user confirms explicitly."
*Append to AC-L5:* "Replacement is allowed only for today − 7 … today. The new entry is `late` if `occurred_on` < today."
*Append to AC-H6:* "The confirmation says 'Past weekly percentages will be recalculated without this habit.'"

**4. NON-BLOCKING: "Needs today" is underspecified (AC-A1, AC-A2).**
*Add:* "`remaining_needed` = max(0, planned − distinct days done this week), where planned is pro-rated and assumes today's status for the rest of the week. `remaining_days_including_today` counts today through the week's last day."
On the last day of the week, "2 more this week, 1 day left" announces that the week can't be won. That invites the what-the-hell effect. *Rule:* if `remaining_needed` > `remaining_days`, the reason reads "Last day of the week · 1 of 3 so far".

**5. NON-BLOCKING: The reflection judges the current week (AC-W1, AC-W2).** On the last day of the week, the summary uses §7.4 rules and shows "so far". *Define "updated by later logs" as:* "any counted entry or void for that week has `logged_at`/`voided_at` later than the reflection's `created_at`."

**6. NON-BLOCKING: Floating-point error (§7.1, §7.3).** 100 × (29/100) evaluates to 28.999…, which floors to 28. *Add to §7:* "Compute in integers: `floor((100·c) / p)`, `ceil((N·a) / 7)`." Extend H5 to cover this.

**7. NON-BLOCKING: The aggregate chip mixes meanings (AC-P1, §7.4).** For daily habits Y means "so far", but for weekly habits it means the full target. *Aggregate copy:* "In progress · 3 done so far". Per-habit rows keep "X of Y".

**8. NON-BLOCKING: Missing states and copy.**
- *AC-D3 add:* "If the save fails, the row reverts and shows 'Couldn't save. Try again.'"
- *AC-R6 add for below-target weeks:* "<Habit> has been harder to fit in lately. Want to get back on track?" ("quiet" is false when 1 of 3 was done.)
- *AC-A5 minimum:* "Logged the minimum. That counts."
- *Q14 note:* "Starting with fewer habits can make each one easier to keep." (The current text states an unsourced claim as fact.)

**9. NON-BLOCKING: Architecture contradiction (§4.4 `get_today`).** It returns "today's dismissals" and only this week's entries. Recovery needs 2 completed weeks of entries, versions and events, plus all open recovery dismissals. Handoff to `lead-architect`.

**10. NON-BLOCKING: Testing (testing-strategy §4).** Add these to H15: no lapse after a paused or no-plan week; the lapse key is stable across a run. Add H17: pause after today's entry takes effect tomorrow. Add H18: replacement outside the window is rejected, and inside the window it is marked `late`.

**11. NON-BLOCKING: §10.2 defaults.** These are sound. Q5 holds once finding 2 is applied. Q7: ship with zero quotes until `content/quotes/SOURCES.md` lists vetted entries. Q10: recommend English for MVP with externalized strings. A Danish banned-word list would be needed later.
