# DISCIPLINE — Product Specification (MVP)

Owner: `behavioral-product-specialist` · Status: **Draft v0.1, pending review** · 2026-11-11

> "Less planning. More doing. Less pressure. More progress."

## 1. Problem & audience

Most habit apps optimize for planning (elaborate setups, reminders at fixed times) and
for perfection (streaks). Users drop off after the first miss: a broken streak feels like
lost progress, so they quit, which is the "what-the-hell effect". People with irregular
schedules can't use fixed-time habits at all.

**Primary user:** an adult with an irregular schedule who wants to do a few things more
consistently (exercise, reading, study, focused work) and has quit habit apps before
after missing days.

**Jobs to be done**
1. "When I open the app, tell me the one thing to do now, and let me start immediately."
2. "When I miss days, help me get back on track without making me feel like I failed."
3. "Show me whether I'm actually getting more consistent over weeks, not just today."
4. "If I did it but forgot to log it, let me record it honestly."

## 2. Principles → product rules

| Principle | Rule in product |
|---|---|
| Progress > perfect streaks | Headline metric is **consistency %** over a rolling window. Streaks are not shown in the MVP (see §10 Q4). |
| Never silently rewrite history | Completion log is append-only. Schedule edits apply from an effective date. "Undo" creates a visible void record. |
| Never fake stats | Every number has a formula (§7). Round **down**. Show the denominator ("9 of 12"). No demo data in real accounts. |
| Less planning | A habit needs only a name and a goal. No time, no reminder, no category is required. |
| Less pressure | No red failure states, no guilt copy, no notification nagging. Quotes and recovery tips are optional. |
| No needless gamification | No points, XP, levels, badges, leaderboards, or confetti. |

## 3. Core concepts (glossary)

- **Habit:** something the user wants to do repeatedly. Fields: name, optional "minimum
  version" (e.g. "1 push-up"), optional note, color/icon, priority order, status.
- **Habit status:** `active` · `paused` · `archived`. Deletion is a separate, explicit,
  confirmed action (§4.1).
- **Goal (schedule version):** how often. MVP goal types:
  - `daily`: every day.
  - `weekly_count`: N times per week on any days (e.g. 3 workouts/week).
  - `specific_days`: on chosen weekdays (e.g. Mon/Wed/Fri). *(Candidate to cut. See §10 Q3.)*
  Each version has `effective_from` (local date). Editing a goal creates a new version.
- **Completion entry:** one record that the habit was done. It has `occurred_on` (local
  date it happened), `logged_at` (server timestamp of entry), `source`
  (`on_time` | `late`), optional `note`, and optional `voided_at` + `void_reason`.
- **Late log:** an entry where `occurred_on` < the local date of `logged_at`. It's always
  labeled "logged later" in the UI.
- **Opportunity:** a unit of expected work used as a denominator (§7).
- **Week:** the user's chosen week start (default Monday, locale-aware), in their timezone.

## 4. MVP features & acceptance criteria

### 4.1 Habit management
- **AC-H1** The user can create a habit with only a name and a goal (default: `weekly_count` 3).
  Creating it takes ≤ 2 screens and has no required time field.
- **AC-H2** Editing the name, minimum version, or color applies everywhere (cosmetic, not
  historical).
- **AC-H3** Editing the goal asks "Starting today or starting next week?" and creates a new
  schedule version. Given 2 completions logged this week under goal 3/week, when the goal
  changes to 4/week starting next week, then this week is still evaluated against 3.
- **AC-H4** **Archive** hides the habit from the dashboard and stops new opportunities.
  History stays visible in Progress under "Archived". It can be unarchived.
- **AC-H5** **Pause** (optional for MVP, see §10 Q5) stops opportunities from the pause date
  without counting as missed.
- **AC-H6** **Delete** permanently removes the habit and its entries after a confirmation
  that states what will be lost and suggests archive instead. This is the only
  destructive path, and it's user-initiated, explicit, and irreversible.
- **AC-H7** The user can reorder habits. Order sets priority for Action Mode.

### 4.2 Daily dashboard ("Today")
- **AC-D1** The top of the screen shows **one primary action**: a large "Start: <habit>"
  button (from the Action Mode selection, §4.3). If everything is done, it shows a calm
  completion state ("All done for today.") with no confetti.
- **AC-D2** Below that, a list of today's relevant habits: due today (`daily`,
  `specific_days`) and weekly-goal habits that are still incomplete this week, each with
  weekly progress ("2 of 3 this week").
- **AC-D3** One-tap complete per habit, with an undo toast (5 s). Undo within the toast
  window removes the pending entry before commit. After commit, undo creates a void record.
- **AC-D4** States: loading (skeleton), empty (no habits → "Create your first habit"
  inline), error (message + retry, cached data shown if available), success.
- **AC-D5** The optional daily quote appears as one quiet line below the primary action.
  It's dismissible for the day and can be disabled in settings. It's never a modal or
  notification.

### 4.3 Action Mode
Goal: go from opening the app to doing the thing in under 5 seconds.
- **AC-A1** Selection rule (deterministic, explainable). Among active habits not yet
  satisfied for today/this week, rank by:
  1. user priority order (AC-H7);
  2. then weekly-goal pressure = remaining needed ÷ remaining days in week (higher first);
  3. then least recently completed.
  The reason is shown in small text ("Top of your list" / "2 more this week, 3 days left").
- **AC-A2** Tapping Start opens a focused full-screen view: habit name, minimum version,
  optional timer (count-up, no required duration), and two actions: **Done** and **Not
  now**.
- **AC-A3** "Not now" moves to the next candidate without penalty and without recording a
  miss.
- **AC-A4** "Done" records an `on_time` entry for today and returns to the dashboard with a
  short, calm confirmation.
- **AC-A5** "Do the minimum version" is offered when one is defined. It counts as a
  completion (the user decides what counts). The entry stores `variant: minimum` for honest
  reporting.

### 4.4 Late completion logging
- **AC-L1** From a habit's history or the dashboard ("Log a past day"), the user can record
  a completion for a past date up to **7 days** back (see §10 Q6).
- **AC-L2** The entry stores `occurred_on` = the chosen date and `logged_at` = server now,
  with `source = late`. The client can't set `logged_at`.
- **AC-L3** Late entries count toward the period they occurred in. They're shown with a
  distinct marker (hollow dot / "logged later") in history and the graph.
- **AC-L4** Logging a date before the habit's creation date, or in the future, is rejected
  with an explanation.
- **AC-L5** A day already completed for a `daily` habit can't be double-counted. Multiple
  entries are allowed but count once per day for daily goals (see §7).

### 4.5 Recovery Mode
Purpose: shrink the gap between a miss and the next action. It's optional and never
blocking.
- **AC-R1 Trigger:** a habit enters "needs recovery" when (a) a `daily`/`specific_days`
  habit has missed its last 2 opportunities, or (b) a `weekly_count` habit ended the
  previous week below target, or can no longer reach target this week.
- **AC-R2** The dashboard shows a gentle inline card ("Workout slipped this week. Want to
  get back on track?") with **Show options** and **Dismiss**. No badge counts, no red.
- **AC-R3** Options (the user picks any, or none):
  1. **"I actually did it"** → late log (§4.4), honestly marked.
  2. **"Do the minimum now"** → Action Mode with the minimum version.
  3. **"Adjust the goal"** → new schedule version from today/next week (history untouched).
  4. **"Pause this habit"** (if Pause ships).
  5. **"Plan the next one"** → optional implementation-intention prompt ("After ___, I will
     ___") saved on the habit.
- **AC-R4** Recovery never hides the miss: the missed opportunities stay in history and
  stats.
- **AC-R5** Dismissed recovery cards don't reappear for the same lapse. Recovery can be
  disabled globally.
- **AC-R6** Copy is reviewed for shame-free tone ("slipped", "get back on track"; never
  "failed", "broke", "lost").

### 4.6 Progress
- **AC-P1** The primary graph shows **weekly consistency %** for the last 12 weeks (§7.2),
  as bars with a zero-based y-axis and an explicit denominator on tap ("9 of 12 planned").
- **AC-P2** Weeks with no active habits render as "no plan" (gap), not 0%.
- **AC-P3** Per-habit view: a calendar heatmap of the last 12 weeks. Done (filled), late
  log (hollow/ring), minimum version (half), missed (neutral empty, never red), not
  scheduled (no mark).
- **AC-P4** A secondary, non-judgmental trend line: "Your consistency is up from 58% to
  71% over the last 4 weeks." This only appears with ≥ 3 weeks of data. Otherwise it says
  "Not enough data yet."
- **AC-P5** Every displayed number is reproducible from the raw log by the formulas in §7.

### 4.7 Weekly reflection
- **AC-W1** On the user's last day of the week (or the first app open of the new week), a
  non-blocking card offers "Reflect on your week" (≤ 60 seconds).
- **AC-W2** It shows a factual summary: per habit, done X of Y, including late logs.
- **AC-W3** Three short prompts, all optional: *What went well? What got in the way? One
  adjustment for next week?* Plus a 1–5 self-rating "How did this week feel?"
- **AC-W4** "One adjustment" can link directly to editing a goal (new version next week).
- **AC-W5** Reflections are saved per ISO week, editable for 7 days, then read-only (with an
  edit timestamp if edited).
- **AC-W6** Past reflections are viewable in Progress.

### 4.8 Daily motivational quote
- **AC-Q1** It comes from a curated local list of original or public-domain quotes, each
  with an attribution and a recorded source/license.
- **AC-Q2** It's deterministic per day (no network needed), shown once, dismissible, and
  can be disabled. It's off-by-default vs on-by-default per §10 Q7.

### 4.9 Cross-cutting
- **AC-X1** Mobile-first: fully usable at 360 px wide, one-handed. The primary action is in
  the thumb zone.
- **AC-X2** Every screen defines loading, empty, error, and success states (see
  design-system §8).
- **AC-X3** Data export (JSON/CSV) of habits, schedule versions, entries, and reflections.
  *(Recommended for MVP for trust. See §10 Q8.)*

## 5. Out of scope for MVP
Social/sharing, leaderboards, AI coaching, reminders/push notifications (see §10 Q9),
wearable integrations, multiple goal units (minutes, reps), sub-habits, and paid tiers.

## 6. Non-functional
WCAG 2.2 AA. Works on a mid-range Android on 4G. Interaction feedback < 100 ms (optimistic).
Personal data minimized.

## 7. Metric definitions (authoritative)

All computations use the schedule version in effect on each date, the user's timezone,
and **non-voided** entries only. Results are rounded **down** to the nearest whole percent.

### 7.1 Opportunities per habit per week
- `daily`: one per active day in the week (days from `max(created_on, effective_from)` to
  `min(today, archived_on, week_end)`, excluding paused days).
- `specific_days`: one per scheduled weekday in that active range.
- `weekly_count` N: **N**, pro-rated for partial weeks: `floor(N × active_days / 7)` with
  a minimum of 1 if active_days > 0. *(Pro-rating rule pending review.)*
- The current, unfinished week counts only **elapsed** opportunities for daily/specific
  days. For weekly_count, the current week is shown as "in progress" (X of N) and excluded
  from the consistency % until the week ends.

### 7.2 Completed opportunities
- `daily` / `specific_days`: count of scheduled days with ≥ 1 entry (a day counts once).
- `weekly_count`: `min(entries_in_week, N)`. Extra completions are shown ("4 of 3 ✓") but
  don't inflate %.
- `variant: minimum` counts as complete. Late entries count toward the week they occurred in.

### 7.3 Weekly consistency %
`floor(100 × Σ completed / Σ opportunities)` across active habits. If Σ opportunities = 0,
the week is "no plan" (not 0%).

**Worked example.** Week Mon–Sun. Habit A: daily, done Mon–Thu and Sat (Fri logged late
on Sun) → 6/7. Habit B: weekly_count 3, done twice → 2/3. Consistency =
floor(100 × 8 / 10) = **80%**. Display: "80% · 8 of 10 planned · 1 logged later".

### 7.4 Rolling 4-week consistency (trend)
Same formula across the 4 most recent completed weeks.

## 8. Success metrics (product analytics, privacy-preserving, opt-in)
- Week-4 retention of users with ≥ 1 miss (target: ≥ 40%).
- % of recovery cards followed by a completion within 48 h.
- Median time from app open to first completion (target < 10 s).

## 9. Content & tone
Calm, direct, kind, brief. Second person. No exclamation marks in system copy except when
quoting. Banned words in UI: *fail, failed, broke, lost, lazy, should have*.

## 10. Open questions (need owner input)
1. **Platform:** responsive web/PWA only, or native iOS/Android apps for MVP?
2. **Accounts & sync:** is cloud sign-in required at launch, or local-first with optional
   sign-in later?
3. Ship `specific_days` in MVP, or only `daily` + `weekly_count`?
4. Show any streak at all (e.g. "weeks on target", which is forgiving), or none?
5. Is Pause in MVP?
6. Late-logging window: 7 days, current week + previous week, or unlimited?
7. Quotes: on or off by default? Do you have a preferred source or tone?
8. Data export in MVP?
9. Any reminders in MVP (single optional daily nudge), or none?
10. Language(s) and locale for launch; default week start.
11. Target users / any existing users or brand assets (name, logo, colors)?
