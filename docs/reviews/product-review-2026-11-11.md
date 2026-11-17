# Product & behavioral review: spec set v0.1

Reviewer: `behavioral-product-specialist` · 2026-11-11 · Scope: CLAUDE.md and all docs/.

## Verdict: APPROVE WITH CHANGES

The principles are sound and ethical. §7 is not yet implementable without guessing. Findings 1–7 must be resolved before Phase 1 begins. The §7.3 worked example arithmetic is correct: A = 6/7 (Sun missed; the late Fri entry counts), B = 2/3, 8/10 = 80%.

## Findings (by severity)

**1. CRITICAL: Action Mode pressures weekly habits daily (spec AC-A1, AC-D1, AC-D2).** A 3-per-week habit stays "not yet satisfied" every day until it reaches 3. It keeps taking the primary action, and "All done for today" never appears. That defeats the "any days" promise. Also, `sort_order` is a total order, so tiebreaks 2 and 3 can never fire, and the reason "2 more this week, 3 days left" can never show.
*Change AC-A1 to:* "Candidates are active habits not completed today that are either (a) due today (`daily`/`specific_days`) or (b) `weekly_count` with remaining needed ≥ remaining days including today ('needs today'). Rank: (a) and (b) by user order. Other incomplete weekly habits appear under 'Optional today' and never become the primary action." *AC-D1:* "All done for today" shows when no candidate remains.

**2. CRITICAL: Today and the current week are miscounted (§7.1, AC-P1/P2).** `min(today, …)` counts today as an opportunity before it is over, so every morning shows a pending day as a miss. The current week also mixes daily habits (counted) with `weekly_count` habits (excluded). With only weekly habits, the current week reads "no plan".
*Replace the last §7.1 bullet with:* "Today counts as an opportunity only if completed. The current week is never shown as a %. It displays 'In progress · X of Y so far' and is excluded from bars, the trend, and Recovery evaluation until it ends."

**3. HIGH: Multiple entries per day inflate weekly_count (§7.2, AC-L5).** `min(entries_in_week, N)` lets three taps on Monday satisfy "3 per week". A double tap (list + Action Mode) does the same.
*Change:* "`weekly_count`: `min(distinct active days with ≥ 1 entry, N)`." Tapping an already-done habit offers "Remove today's entry" (void). It never adds a second entry.

**4. HIGH: Pro-rating with floor inflates stats, and mid-week versions are undefined (§7.1, AC-H3).** Floor shrinks the denominator. For N = 3 with 4 active days, `floor(1.71) = 1`, so one workout shows 100%. That breaks "never inflate". A switch to or from `weekly_count` "starting today" splits a week across two targets, and no rule covers it.
*Change:* "pro-rated target = `ceil(N × active_days / 7)` (always ≤ active_days)." *Add:* "Changes to or from `weekly_count` take effect at the next week start. 'Starting today' is offered for `daily`/`specific_days` only." Add worked example 2: N = 3, created Thursday, 1 completion → target 2 → "50% · 1 of 2 (partial week)".

**5. HIGH: Pause/archive can hide misses (AC-H4, AC-H5, AC-R3.4).** The spec does not say whether pause or archive can be backdated. Unarchiving leaves the archived gap undefined.
*Add AC-H8:* "Pause, archive and their reversals take effect on today's local date or later. They never take effect on a past date. Days before that keep their opportunities. Paused or archived days generate none and render as 'paused'/'archived' in the heatmap, not as missed. Archived habits' past weeks remain in overall consistency."

**6. HIGH: Recovery triggers are too eager and can stack (AC-R1, AC-R2, AC-R5).** (b) fires on a 2-of-3 week, a good week labeled "slipped". The mid-week "can no longer reach target" trigger tells users the week is lost, which is the what-the-hell effect the product exists to prevent. Several lapsing habits produce a wall of cards.
*Change AC-R1(b) to:* "the last completed week had 0 completions, or two consecutive completed weeks were below target." Drop the mid-week trigger. *Add:* "At most one recovery card shows on Today. A lapse ends at the next completion (including a late log), and its card disappears quietly. `lapseKey` = habit + first missed date. Dismissals persist server-side." There is no table for dismissals yet; hand this to `lead-architect`.

**7. HIGH: week_start change is undefined and contradicts other docs (architecture §4/§5, AC-W5).** A single `profiles.week_start` cannot "apply from next week" while past weeks are still computed with the old start. AC-W5 says "ISO week" but the table keys on `week_start`.
*Change:* version week start like schedules. The period between the old start and the next new start is one partial "bridge" week, pro-rated per finding 4. AC-W5: replace "ISO week" with "user week (keyed by its start date)". Handoff to `lead-architect`.

**8. MEDIUM: The minimum variant is shown as a half and is not disclosed in totals (AC-P3, §7.3).** A half shape implies half credit while stats count it as full. That is a mixed message and a quiet guilt cue.
*Change:* use a distinct "small filled dot" marker labelled "minimum". Totals show "8 of 10 planned · 1 logged later · 2 minimum". If minimum and full entries fall on the same day, the day displays as full.

**9. MEDIUM: Late-log edge cases (§4.4).** Late logs within 7 days can change closed weeks after the reflection showed its summary. *Add:* "The reflection summary is computed live and notes 'updated by later logs'." The date picker disables dates outside active ranges and says why. A log on an unscheduled day is recorded as "extra" and doesn't change %, and the user is told before saving. The glossary (§3) omits `variant`.

**10. MEDIUM: The trend is undefined (AC-P4, §7.4).** "Up from 58% to 71% over the last 4 weeks" names no compared windows, and "≥ 3 weeks of data" doesn't fit a 4-week window.
*Change:* "Compare the 4 most recent completed weeks with the 4 before. Show only when both windows have ≥ 3 planned weeks. Copy: 'up from A% to B%', 'down from A% to B%', or 'about the same as before (B%)'. No arrows in red/green."

**11. MEDIUM: Success metrics reward nagging (§8).** "% recovery cards followed by a completion" improves as you show more cards. *Add guardrails:* recovery dismiss rate, % users disabling Recovery, and quotes-disabled rate. A guardrail regression blocks a "win".

**12. MEDIUM: Missing acceptance criteria.** Empty, error and missed-day variants for Recovery, Reflection and Progress. Heatmap states for "today, not yet" and "paused/archived". An account-deletion AC (it is in the architecture, missing from the spec). Proposed answers for the rest: the implementation intention shows in Action Mode; "Not now" is never stored (the skipped habit moves to the end for the rest of the day); the timer value is not stored; the 1–5 rating is never charted.

**13. LOW: Copy.** Use "I did it, just didn't log it" instead of "I actually did it", which sounds defensive. For a daily lapse use "<Habit> slipped the last few days", because "this week" is wrong when the lapse spans weeks. Ban "streak", "don't lose", "catch up" and "just 1 more". The screen-reader label for a missed day should be "not done".

**14. LOW: Testing gaps (testing-strategy §4).** Add these to the honesty suite: today is pending, not missed; weekly_count counts distinct days; pause/archive can't take effect on a past date; ceil pro-rating plus worked example 2; the week-start bridge week; the Recovery trigger matrix, including auto-resolve.

**15. Scope cuts for MVP.** Cut `specific_days` (it adds Recovery and pro-rating branches, and "3 per week" covers most cases). Cut daily quotes; if kept, off by default. Cut the Action Mode timer. Keep Pause (finding 5), because without it vacations become false misses or force an archive.

## Recommended defaults for §10

1. PWA.
2. Cloud sign-in (magic link) is required. Server-assigned `logged_at` is the honesty anchor, and local-first can't guarantee it.
3. Cut `specific_days`.
4. No streaks in MVP. Revisit "weeks on target" after validation.
5. Pause: yes, effective today or later only (finding 5).
6. 7 days back (today−7…today−1). It is simple and predictable.
7. Cut. If kept, off by default, original or public-domain only.
8. Yes: JSON export of everything plus CSV of entries.
9. No reminders.
10. English only. Week start from the locale (Mon fallback), changeable, versioned (finding 7).
11. Owner input needed. Default: no brand assets until provided.

## New open questions (with default)

12. Should weekly_count count distinct days? Default: yes.
13. Recovery card limit? Default: one at a time on Today.
14. Is "DISCIPLINE" the final name? Default: keep, test it with the target users.
15. Soft cap on active habits? Default: no cap. Show a neutral note at more than 5: "Fewer habits tend to stick better."
16. Keep the 1–5 feeling rating? Default: yes, optional and never charted.
