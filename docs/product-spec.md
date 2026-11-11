# DISCIPLINE — Product Specification (MVP)

Owner: `behavioral-product-specialist` · Status: **v0.3, reviewed, pending owner approval** · 2026-11-11
Product name: **DISCIPLINE** (repository: `Kosis`)

> "Less planning. More doing. Less pressure. More progress."

### Changelog
- **v0.3:** Resolves all blocking findings of the v0.2 reviews (see `docs/reviews/v0.2-consolidated-2026-11-11.md`):
  - Pause and archive take effect tomorrow.
  - A timezone change uses a conservative "today".
  - Voids and replacements are limited to the 7-day window.
  - Recovery skips no-plan weeks and has a stable lapse key.
  - "Needs today" is defined.
  - The late-log picker is a day list.
  - 0% and "no plan" are distinct.
  - Offline stores no personal data on the device.
  - Integer arithmetic.
  - Copy fixes.
- **v0.2:** Adds the owner decisions (§10.1). Incorporates `docs/reviews/product-review-2026-11-11.md` (findings 1–15) and `docs/reviews/architecture-review-2026-11-11.md` (findings 6, 7, 11). The main changes:
  - Action Mode only promotes habits that need today.
  - Today is "pending", not missed.
  - The current week is never a %.
  - `weekly_count` counts distinct days.
  - Pro-rating rounds up.
  - Goal changes start next week.
  - Pause and archive are never backdated.
  - Recovery triggers are calmer, with one card at a time.
  - Undo is committed immediately and creates a void.
  - The trend is defined precisely.
  - Guardrail metrics are added.
  - `specific_days` and the Action Mode timer are cut (proposed).
- **v0.1:** Initial draft.

## 1. Problem & audience

Most habit apps optimize for planning (elaborate setups, fixed-time reminders) and for perfection (streaks). Users drop off after the first miss. A broken streak feels like lost progress, so they quit: the "what-the-hell effect". People with irregular schedules can't use fixed-time habits at all.

**Primary user:** an adult with an irregular schedule who wants to do a few things more consistently (exercise, reading, study, focused work). They have quit habit apps before after missing days.

**Jobs to be done**
1. "When I open the app, tell me the one thing to do now, and let me start immediately."
2. "When I miss days, help me get back on track without making me feel like I failed."
3. "Show me whether I'm actually getting more consistent over weeks, not just today."
4. "If I did it but forgot to log it, let me record it honestly."
5. "My habits and progress are the same on my phone and my laptop."

## 2. Principles → product rules

| Principle | Rule in product |
|---|---|
| Progress > perfect streaks | The headline metric is **weekly consistency %** over completed weeks. No streaks in MVP. |
| Never silently rewrite history | The completion log is append-only. Goal changes take effect from a future week start. Pause and archive take effect from **tomorrow**. "Undo" creates a retained void record. A completed week's evaluation changes only through (a) a late log, (b) a void (undo or correction), or (c) a minimum→full replacement, each within today − 7 … today and each visible, or (d) deleting a habit, which the user confirms explicitly. |
| Never fake stats | Every number has a formula (§7). Round percentages **down** and targets **up**. Always show the denominator ("8 of 10"). Show late and minimum counts. No demo data in real accounts. |
| Less planning | A habit needs only a name and a goal. No time, reminder, or category is required. |
| Less pressure | No red failure states, no guilt copy, no notifications. Quotes and recovery tips are optional. The current week is never judged while it's in progress. |
| No needless gamification | No points, XP, levels, badges, leaderboards, streaks, or confetti. |

## 3. Core concepts (glossary)

- **Account:** required. Supabase Auth with email one-time code. Data syncs across devices.
- **Local day:** a calendar date in the user's profile timezone. "Today" is the local date at the moment of the request.
- **Week:** 7 local days starting on the user's **week start** (ISO weekday 1 = Mon … 7 = Sun). It's chosen at onboarding, defaulting to the locale (Monday fallback), and fixed in MVP (§10 Q10).
- **Completed week:** a week whose last day is before today. Only completed weeks get a consistency %.
- **Habit:** name, optional minimum version (e.g. "1 push-up"), optional note, color, user order, optional implementation intention ("After ___, I will ___").
- **Habit status:** `active` · `paused` · `archived`. Pause and archive take effect **tomorrow**. Resume and unarchive take effect today. No change ever takes effect on a past date. Deletion is separate (AC-H6).
- **Goal (goal version):** MVP goal types:
  - `daily`: every active day.
  - `weekly_count` N (1–7): N distinct days per week, on any days.
  - *(`specific_days` is deferred post-MVP. See §10 Q3.)*
  Each goal version has an `effective_from` local date. The newest version in effect on a date governs that date.
- **Completion entry:** a record that the habit was done on a day.
  - `occurred_on` is the local date it happened.
  - `logged_at` is a server timestamp.
  - `source` is `on_time` or `late`, and the server derives it.
  - `variant` is `full` or `minimum`.
  - `note` is optional.
  - At most **one non-voided entry per habit per day**.
- **Void:** a separate, insert-only record that cancels an entry, with a timestamp and reason. The user can void with reason `undo` or `correction`. The system voids with `replaced`. Voids are allowed only for entries with `occurred_on` in today − 7 … today. Voided entries are excluded from stats but retained in history (under "Show removed entries") and in the export.
- **Late log:** an entry whose `occurred_on` is before "today" at the time it's logged. It's allowed for **today − 7 … today − 1** and always labeled "logged later".
- **Today (server):** the local date in the profile timezone. If the timezone changed in the last 24 h:
  - you can log only up to the **earliest** local date under any timezone in effect during that period
  - the 7-day window counts back from the **latest** such date
  - an entry counts as on time only for the latest date

  So switching timezones can't avoid the late label, log a day early, or widen the window.
- **Active day:** a day on or after the habit's creation date on which its status is `active`.
- **Planned / completed:** the denominator and numerator per habit per week (§7).

## 4. MVP features & acceptance criteria

### 4.0 Account & onboarding
- **AC-O1** Sign-in uses Supabase Auth with **email + 6-digit one-time code**. This works inside an installed PWA, whereas magic links on iOS open the browser instead of the app. The UI never says whether an email is registered (no account enumeration).
- **AC-O2** First sign-in runs onboarding in **≤ 2 steps**:
  1. Confirm the timezone (detected via `Intl`) and the week start (from the locale).
  2. Create the first habit (name + goal, default "3 times per week").
- **AC-O3** If the device timezone later differs from the profile timezone, show a quiet prompt: "Your device is on <tz>. Switch?" Never switch silently. A switch applies from that moment. Existing entries keep their dates. For 24 h after a switch, entries for the date that just ended may be labeled "logged later" (see "Today (server)"). *(Owner approval D2.)*
- **AC-O4** Sign-out, plus session persistence across app restarts.
- **AC-O5** The user can delete their account in Settings, after re-confirming with a one-time code sent to their own email (valid 5 minutes). This permanently deletes all their data. The confirmation suggests exporting first. Afterwards the user is signed out, and the app's caches on the device are cleared.

### 4.1 Habit management
- **AC-H1** The user can create a habit with only a name and a goal, in ≤ 2 screens, with no time field.
- **AC-H2** Editing name, minimum version, note, color, or implementation intention is cosmetic. It applies everywhere, including history. This is deliberate: it isn't historical data.
- **AC-H3** Goal changes take effect **from the start of next week**. The current week and all past weeks keep their goal.
  - *Given* 2 completions this week under "3 per week", *when* the goal changes to "4 per week", *then* this week is evaluated against 3 and next week against 4. The habit detail shows "Goal changes to 4 per week from Mon 16 Nov."
  - **Exception:** during the habit's **creation week**, before any week has been evaluated, the goal can be corrected from the creation date.
- **AC-H4** **Archive** takes effect **tomorrow**. It hides the habit from Today right away. Today remains a planned day and keeps any entry, and new planned days stop from tomorrow. Past weeks stay in history and in overall consistency. Archived habits appear in Progress under "Archived", and the user can unarchive them (effective today). Archived days render as "archived", not missed.
- **AC-H5** **Pause** *(proposed in scope)* takes effect **tomorrow** and works like archive, but the habit stays visible on Today. On the day of pausing it shows "Pauses from tomorrow · Undo". After that it shows "Paused · Resume". Resume takes effect today. Paused days generate no planned days and render as "paused".
- **AC-H6** **Delete** permanently removes the habit and all its entries. Confirmation copy: "This permanently deletes <habit> and its N entries. Past weekly percentages will be recalculated without it. Archiving keeps them." It's the only user-initiated destructive path for habit data.
- **AC-H7** The user can reorder habits. The order is the priority for Action Mode.
- **AC-H8** No status change can take effect on a past date. Pause and archive take effect from **tomorrow** (*owner approval D1*), so pausing late in the evening can't erase an undone day and never hides an entry already logged. Resume and unarchive take effect today.
- **AC-H9** A goal change on a paused or archived habit is allowed and follows AC-H3.

### 4.2 Daily dashboard ("Today")
- **AC-D1** Today has **one primary action**, "Start: <habit>", from the Action Mode selection (§4.3). On mobile it docks above the bottom navigation. In DOM and focus order it comes right after the page heading. If there's no candidate, that position shows "All done for today." calmly, with no confetti, and optional habits are listed below.
  Order on the page:
  1. Offline banner
  2. Timezone prompt
  3. At most **one** inline card (recovery, otherwise reflection)
  4. Sections
  5. Quote under the primary action
- **AC-D2** Sections:
  - **Due today:** `daily` habits not done today, and `weekly_count` habits that *need today* (§4.3).
  - **Optional today:** other incomplete weekly habits, each with "1 of 3 this week".
  - **Done today**
  - **Paused**
- **AC-D3** A one-tap complete is **committed immediately**, with an optimistic UI. An undo toast (5 s, paused on hover or focus) creates a `void` with reason `undo`. Tapping a habit already done today offers "Remove today's entry" (void, reason `undo`). It never adds a second entry. If the save fails, the row reverts and shows "Couldn't save. Try again."
- **AC-D4** States:
  - loading: skeleton
  - empty: no habits → "Create your first habit"
  - error: message + retry, with cached data shown if available
  - offline: quiet banner, completion disabled with the reason
  - success
- **AC-D5** The optional daily quote is one quiet line below the primary action. It's dismissible for the day, never a modal or notification, and off by default. The user enables it in Settings (§4.8).

### 4.3 Action Mode
Goal: from opening the app to doing the thing in under 5 seconds.
- **AC-A1** **Candidates** are habits that are active today and not completed today, and that are either:
  - (a) `daily`, or
  - (b) `weekly_count` and *need today*: `remaining_needed ≥ 1` and `remaining_needed ≥ remaining_days`.

  Definitions:
  - `planned_this_week` = §7.1, computed with the active days of the whole week, assuming the current status and any already-scheduled pause or archive.
  - `remaining_needed = max(0, planned_this_week − distinct days done this week)`.
  - `remaining_days` = active days from today through the last day of the week, inclusive.

  Candidates are ranked by user order. Other incomplete weekly habits are "Optional today" and never become the primary action.
- **AC-A2** The reason shows in small text:
  - "Due today"
  - "2 more this week, 2 days left"
  - When `remaining_needed > remaining_days`, so the target can't be reached: "Last chance this week · 1 of 3 so far" on the last day, or "1 of 3 so far this week" otherwise. Copy never announces that the week is lost.
- **AC-A3** Start opens a focused full-screen view with the habit name, the implementation intention if set, the minimum version if set, and three actions:
  - **Done** (filled)
  - **Do the minimum** (outline; only when a minimum version is defined; filled when the view is opened from Recovery)
  - **Not now** (text button)

  No timer in MVP *(proposed cut)*.
- **AC-A4** "Not now" shows the next candidate. The skipped habit moves to the end of the list for the rest of the local day. The skip lives only in this device's session state. Nothing is stored on the server and nothing counts as a miss. A reload resets the skips.
- **AC-A5** "Done" records an `on_time`, `full` entry for today and returns to Today with a short confirmation: "Logged. Nice work." "Do the minimum" records `variant = minimum` and confirms "Logged the minimum. That counts." The user decides what counts, and reports disclose it (§7.5).

### 4.4 Late completion logging
- **AC-L1** The user can record a completion for a date in **today − 7 … today − 1** from a habit's history or from Today ("Log a past day").
- **AC-L2** The entry stores the chosen `occurred_on`. The server assigns `logged_at`, and `source = late` is derived. The client can't set either.
- **AC-L3** Late entries count toward the week they occurred in, including a completed week. That week's numbers update and show "includes 1 logged later". Late entries are always visibly marked.
- **AC-L4** The picker is a list of the 7 days today − 1 … today − 7, each row 44 px. A day is disabled, with the reason shown inline (`aria-disabled`, still focusable), when it is:
  - before the habit's creation date
  - on a paused or archived day
  - already completed with a `full` entry

  A day with a `minimum` entry stays enabled and offers "Replace minimum with full" (AC-L5).
- **AC-L5** A second entry for a day that already has one is rejected. The user can replace a `minimum` entry with a `full` one only for days in today − 7 … today, and only on a day when the habit was active. The old entry is voided with reason `replaced`, and the new entry is `late` if its day is before today. Both happen together or not at all.

### 4.5 Recovery Mode
Purpose: shrink the gap between a lapse and the next action. It's optional and never blocking.
- **AC-R1 Triggers.** A habit that is active today has a lapse when either:
  - (a) `daily`: it has ≥ 2 active days before today, and neither of the last 2 has an entry, or
  - (b) `weekly_count`: the last completed week **with planned > 0** had 0 completions, or the last two completed weeks with planned > 0 were both below planned. Weeks with no plan, such as paused weeks, are skipped. They neither count nor break a run.

  There is no mid-week trigger. A `weekly_count` habit with no completed week that has a plan never lapses.
- **AC-R2** At most **one** recovery card shows on Today: the lapsing habit highest in the user's order. It's an inline card with **Show options** and **Dismiss**. No badges and no red.
- **AC-R3** Options (pick any, or none):
  1. **"I did it, just didn't log it"** → late log (§4.4), honestly marked.
  2. **"Do the minimum now"** → Action Mode with the minimum version.
  3. **"Adjust the goal"** → new goal from next week (AC-H3). History is untouched.
  4. **"Pause this habit"** → takes effect tomorrow (AC-H5).
  5. **"Plan the next one"** → implementation intention prompt, saved on the habit.
- **AC-R4** Recovery never hides a miss. Missed days stay in history and stats.
- **AC-R5** `lapse_key` is the habit plus the first missed date of the run (daily), or the start of the first qualifying week of the run (weekly). The key stays the same while the lapse continues. A lapse **ends** when a non-voided entry exists with `occurred_on` ≥ that date, including a late log, and its card disappears quietly. Dismissals are stored server-side per `lapse_key`, so a dismissed lapse never reappears. The user can turn Recovery off in Settings.
- **AC-R6** Copy is shame-free:
  - daily: "<Habit> slipped the last few days. Want to get back on track?"
  - weekly with 0 completions: "<Habit> was quiet last week. Want to get back on track?"
  - weekly below target: "<Habit> has been harder to fit in lately. Want to get back on track?"
- **AC-R7** States: no card when there's no lapse, so there's no empty state. If saving a dismissal fails, the card hides locally and the save is retried.

### 4.6 Progress
- **AC-P1** The primary graph shows **weekly consistency %** for the last **12 completed weeks** as bars, with a zero-based axis. The bars are not interactive. Below them, a **week list** (44 px rows) gives the details and doubles as the accessible table: "Week of 2 Nov · 80% · 8 of 10 planned · 1 logged later · 2 minimum". The current week shows as a non-interactive chip, "In progress · 3 done so far", never as a %. Per-habit rows show "X of Y".
- **AC-P2** Weeks with no planned days render as "no plan": no bar, an en-dash under the axis, and "No plan" in the list. A 0% week renders a visible baseline stub. The two never look alike.
- **AC-P3** The per-habit 12-week heatmap is non-interactive and uses the shape-coded cells in design-system §7. The cell states are derived by the domain layer, never the UI:
  - done
  - done, logged later (ring)
  - minimum (dot)
  - logged later + minimum (ring with dot)
  - not done (neutral empty, never red; screen-reader label "not done")
  - today, pending
  - paused
  - archived
  - not active yet
  - weekly habits: days without an entry show no "not done" mark; their weekly X of N is shown per row
- **AC-P4** The trend sentence compares the **4 most recent completed weeks** with the **4 before them**. It shows only when both windows contain ≥ 3 weeks with a plan. Copy:
  - "Up from A% to B%."
  - "Down from A% to B%."
  - "About the same as before (B%)." (for |B − A| < 3 points)

  No red/green arrows. Otherwise it shows "Not enough data yet."
- **AC-P5** Every displayed number can be reproduced from the raw log with the §7 formulas.
- **AC-P6** States: loading skeleton; empty ("Your progress will appear after your first week."); error + retry.

### 4.7 Weekly reflection
- **AC-W1** On the last day of the user's week, or the first open of a new week, a non-blocking card offers "Reflect on your week" (≤ 60 s). It's dismissible, and the dismissal is stored.
- **AC-W2** It shows a factual summary per habit: "done X of Y", including late and minimum counts. The summary is **computed live**. It notes "updated by later logs" when any counted entry or void for that week has a `logged_at`/`voided_at` after the reflection's `created_at`. On the last day of the week the summary uses the in-progress rules (§7.4) and says "so far".
- **AC-W3** Optional prompts: *What went well? What got in the way? One adjustment for next week?* Plus an optional 1–5 "How did this week feel?", which is never charted.
- **AC-W4** "One adjustment" can link directly to a goal change (from next week).
- **AC-W5** Reflections are keyed by the **user week start date**. They can be edited until 7 days after the week ends, then become read-only. An edited reflection shows "edited <date>".
- **AC-W6** Past reflections are viewable in Progress. States: empty ("No reflections yet"), error + retry.

### 4.8 Daily quote (optional)
- **AC-Q1** Quotes come from a curated local list of **original or public-domain** quotes. Each has an attribution, and its source or license is recorded in `content/quotes/SOURCES.md`.
- **AC-Q2** The quote is deterministic per local day, needs no network, appears at most once per day, and is dismissible. It's **off by default**, and the user enables it in Settings only *(proposed, confirm)*. The feature ships with **zero quotes** until `content/quotes/SOURCES.md` lists vetted entries.

### 4.9 Cross-cutting
- **AC-X1** Mobile-first: fully usable at 360 px, one-handed, with the primary action in the thumb zone. The PWA is installable.
- **AC-X2** Every screen defines loading, empty, error, success, and offline states (design-system §8).
- **AC-X3** **Data export:** JSON of everything (habits, goal versions, status events, timezone history, entries, voids, reflections, settings), plus a CSV of entries. The export is complete, never truncated. CSV cells starting with `= + - @` are escaped.
- **AC-X4** Offline in MVP is **read-only**. The service worker caches only the static app shell. **No personal data is persisted on the device.** Data already loaded in the open session stays visible with "Last updated <time>". A cold start while offline shows the shell plus "You're offline. Connect to see your habits." Writes need a connection, and the UI says so.
- **AC-X6** **Languages:** English (default) and Danish.
  - The locale comes from the user's choice (a cookie, and later the profile), then `Accept-Language`, then English.
  - All UI strings live in `content/messages/{en,da}.json` with identical keys. No hard-coded user-facing text.
  - Dates and numbers are formatted by locale through `Intl`.
  - The banned-word rule (§9) applies to both languages.
  - The OTP email exists in both languages.
- **AC-X5** Sync: changes appear on another signed-in device on its next load or focus. Real-time push is not required.

## 5. Out of scope for MVP
Native apps (planned later; the domain layer is kept portable), social features and sharing, leaderboards, AI coaching, reminders and push notifications, `specific_days` goals, the Action Mode timer, streaks, wearables, goal units (minutes, reps), sub-habits, paid tiers, offline writes, and a week-start change after onboarding.

## 6. Non-functional
- WCAG 2.2 AA.
- Works on a mid-range Android phone on 4G.
- Optimistic interaction feedback in < 100 ms.
- Data stored in the EU (Supabase eu-west-1).
- GDPR: export, deletion, a privacy policy, and no third-party trackers.

## 7. Metric definitions (authoritative)

All computations use local dates in the profile timezone and **non-voided** entries only. For each date they use the goal version and status in effect on that date. Percentages round **down**. **Integer arithmetic only:** `floor((100·c) / p)` and `ceil((N·a) / 7)` as integer division, never floating point.

### 7.1 Planned days per habit per completed week
- `active_days` = days in the week that are on or after `created_on` and on which status is `active`.
- `daily`: **planned** = `active_days`.
- `weekly_count` N: **planned** = `ceil(N × active_days / 7)`. This equals N for a full week, is always ≤ `active_days` because N ≤ 7, and is 0 if `active_days` = 0.
- A week is governed by one goal version, because goal changes start at a week start (AC-H3). For creation-week corrections, the version in effect on the creation date governs that week.

### 7.2 Completed per habit per completed week
- `daily`: active days with an entry.
- `weekly_count`: `min(distinct active days with an entry, planned)`. Extra days are shown ("4 of 3") but never push % above 100.
- Entries with `variant = minimum` count as complete. Late entries count toward the week of their `occurred_on`.

### 7.3 Weekly consistency % (completed weeks only)
`floor(100 × Σ completed / Σ planned)` across habits that have `planned > 0` that week. If Σ planned = 0, the week is "no plan".

**Worked example 1.** The week runs Mon–Sun.
- Habit A is daily. It was done Mon–Thu and Sat. Fri was logged late on Sun, and Sun was missed. Result: 6/7.
- Habit B is 3 per week and was done twice. Result: 2/3.
- Consistency is floor(100 × 8/10) = **80%**, displayed as "80% · 8 of 10 planned · 1 logged later".

**Worked example 2 (partial week, round-up target).** Habit C is 3 per week, created Thursday, so `active_days` = 4 and planned = ceil(3 × 4/7) = ceil(1.71) = 2. It was done once. Result: **50%**, "1 of 2 (partial week)". With a floor, it would show 1 of 1 = 100%, which is inflated.

**Worked example 3 (rounding down).** 2 of 3 gives floor(66.67) = **66%**, never 67%.

### 7.4 Current week (in progress)
Never shown as a %, and excluded from bars, the trend, and Recovery.
- Aggregate display: "In progress · X done so far". Per-habit display: "X of Y so far".
- `daily`: Y = active days before today, plus today only if today is done.
- `weekly_count`: Y = the week's planned target (it's a progress toward the target, not a judgment).

### 7.5 Disclosure counts
Every aggregate shows `late` (entries with `source = late`) and `minimum` (entries with `variant = minimum`) counts whenever they're greater than 0. Only entries that count toward `completed` are included in those counts.

### 7.6 Trend
`pct(window) = floor(100 × Σ completed / Σ planned)` over the 4 most recent completed weeks (B) compared with the 4 before them (A). The display rules are in AC-P4.

## 8. Success metrics (privacy-preserving, opt-in, first-party)
- Week-4 retention of users with ≥ 1 lapse (target ≥ 40%).
- % of lapses followed by a completion within 48 h.
- Median time from app open to first completion (target < 10 s).
- **Guardrails.** A regression in any of these blocks a "win":
  - recovery dismiss rate
  - % of users disabling Recovery
  - % of users disabling quotes
  - % of users deleting their account in week 1

## 9. Content & tone
Calm, direct, kind, brief. Second person, sentence case. No exclamation marks in system copy, except quotes.

**Banned in UI copy:** *fail, failed, broke, broken, lost, lazy, should have, streak, don't lose, catch up, just 1 more.*

## 10. Decisions & open questions

### 10.1 Owner decisions (2026-11-11)
| # | Decision |
|---|---|
| Q1 | **Platform:** a mobile-first PWA. Native iOS/Android may come later, so the domain layer stays framework-free. |
| Q2 | **Accounts:** Supabase Auth from launch. An account is required, and data syncs across devices. |
| Q6 | **Late logging:** up to 7 days late (today − 7 … today − 1). Both the actual date and the registration timestamp are preserved. Historical statistics never change silently. |
| — | **Name:** the product is DISCIPLINE. `Kosis` is the repository name. |

### 10.2 Proposed defaults (owner: confirm or change)
| # | Question | Proposed default |
|---|---|---|
| Q3 | Include `specific_days` goals? | **Cut from MVP.** "N per week" covers most cases. |
| Q4 | Streaks? | **None in MVP.** |
| Q5 | Pause? | **Yes**, effective today only. |
| Q7 | Daily quote? | **In scope, off by default.** Original or public-domain only. |
| Q8 | Data export? | **Yes:** JSON plus CSV of entries. |
| Q9 | Reminders? | **None in MVP.** |
| Q10 | Language and week start? | **Decided (D6):** English (default) and Danish from the first release, through a real i18n system. Week start comes from the locale (Monday in DK) and is fixed after onboarding in MVP. |
| Q11 | Brand assets? | None until provided. The design-system direction applies. |
| Q12 | Should `weekly_count` count distinct days? | **Yes** (§7.2). |
| Q13 | Recovery cards? | One at a time. |
| Q14 | Soft cap on habits? | Hard technical limit of 50. A neutral note at more than 5 active habits: "Starting with fewer habits can make each one easier to keep." |
| Q15 | Keep the feeling rating? | Yes, optional and never charted. |
| Q16 | Sign-in method? | Email one-time code. Apple and Google sign-in come post-MVP. |

### 10.3 Decisions from the v0.2 review (owner-approved 2026-11-11)
| ID | Decision | Status |
|---|---|---|
| D1 | Pause and archive take effect tomorrow | **Approved** (AC-H4/H5/H8) |
| D2 | Conservative "today" for 24 h after a timezone change | **Approved** (§3, AC-O3) |
| D3 | Staging environment | **Approved:** a separate Supabase staging project. Production is never touched. Runbook in `docs/runbooks/staging-setup.md` |
| D4 | Production email provider for OTP | **Approved approach:** a secure, affordable, EU-hosted provider, chosen after comparison (`docs/decisions/email-provider-comparison.md`, recommending Scaleway TEM). Not required for local development |
| D5 | CAPTCHA on OTP send | **Approved:** Cloudflare Turnstile, verified server-side by Supabase Auth (ADR-0006), plus rate limits |
| D6 | Language | **Approved:** EN (default) + DA through an i18n system from the start (ADR-0009) |

**Still open:** the remaining proposed defaults in §10.2 (Q3 specific_days, Q4 streaks, Q5 Pause, Q7 quotes, Q8 export, Q9 reminders, Q11 brand, Q13–Q16). Phase 0 doesn't depend on them. They must be confirmed before Phase 1.
