# Architecture review: specs v0.2

Reviewer: `lead-architect` · 2026-11-11 · Scope: CLAUDE.md, .claude/agents/*.md, docs/*.md

## Verdict: APPROVE WITH CHANGES

v0.1 findings: 1, 2, 4, 6, 9 and 12 are resolved. 5 is resolved: `change_goal` only produces non-decreasing `effective_from`, so "max seq with effective_from ≤ d" is sound. 8 is resolved by making `week_start` immutable, which is better than re-bucketing. 3, 7, 10 and 11 are only partly resolved (see B3, B5, N4, N5). Findings B1–B5 must be fixed in the architecture doc and ADRs 0002/0003/0006 before Phase 1 starts.

## Findings

**B1. BLOCKING: pause/resume inflates consistency** (spec AC-H4/H5/H8, §7.1; arch §4.3 `set_habit_status`).
Because pause takes effect today, a daily user can pause at 23:59 on any undone day and resume the next morning. That day stops being planned, so the user reaches 100% without doing the habit. The same move also strips an entry already logged today from the stats.
*Fix:* a status change that removes plan days (pause or archive) takes effect from **today + 1**. A change that adds them (resume or unarchive) takes effect today. Today stays planned and keeps its entry. The Today UI may still hide the habit right away. Hand off to `behavioral-product-specialist` to amend AC-H4/H5/H8. Add test H17. Trade-off: one more planned day after a pause.

**B2. BLOCKING: switching timezone evades the "late" label** (arch §4.3 `set_timezone`, §5).
A user can switch to UTC−12, log "yesterday" as `on_time`, then switch back. Switching to UTC+14 lets them pre-log a day that hasn't happened yet.
*Fix:* add an insert-only `profile_timezone_events(user_id, timezone, effective_at)` table and add `logged_tz` to `completion_entries`. In `log_completion`, `today := least(local today under every tz in effect during the last 24 h)`. Use that value for both the upper bound and `source`. Trade-off: real travellers may see an honest-but-conservative "late" label.

**B3. BLOCKING: voids can rewrite completed weeks** (arch §4.1 `completion_voids`, §4.3; spec §2).
- `void_completion` has no date window. Voiding a 6-month-old entry changes a completed week, which contradicts spec §2.
- The void's `user_id` is not tied to the entry's owner.
- Clients can pass `reason = 'replaced'`.

*Fix:*
- `completion_entries add unique (id, user_id)`.
- `completion_voids` FK `(entry_id, user_id) references completion_entries(id, user_id) on delete cascade`.
- `void_completion` accepts `undo|correction` only, and only when `occurred_on >= today − 7`.

**B4. BLOCKING: `replace_with_full` is under-specified** (arch §4.3).
*Fix:* it must
- require that the entry is owned, non-voided, `variant = 'minimum'` and `occurred_on >= today − 7`,
- check status (as in B1),
- take the **same** advisory-lock key as `log_completion` (define it once in `private.entry_lock_key(habit, d)`),
- run its void and insert in one transaction.

**B5. BLOCKING: grant model gaps** (arch §4.3, testing §3).
- Supabase's default privileges grant ALL (including TRUNCATE) and EXECUTE on every new object to `anon` and `authenticated`. A one-time `revoke` doesn't cover later migrations.
- Helper functions placed in `public` are callable via `/rpc`.
- A plpgsql `if not cond then raise` lets NULL through.
- The test "now() override" could ship to production.

*Fix:*
- `alter default privileges in schema public revoke all on tables, functions from public, anon, authenticated;`, then grant explicitly.
- Put helpers in a non-exposed `private` schema.
- Make read RPCs (`get_today`) `SECURITY INVOKER`.
- Write assertions as `if (cond) is not true`.
- Clock: `private.app_now()` returns `now()` in migrations and is overridden only in local `seed.sql`. CI asserts the production definition.

**B6. BLOCKING: the read contract can't feed the domain** (arch §4.4, §6).
`get_today` returns only this week's entries and "today's dismissals". Recovery AC-R1(b) needs the last 2 completed weeks. AC-R1(a) crosses the week boundary on Mondays. The AC-L4 picker needs today−7…today−1. Recovery dismissals are keyed by lapse, not by date.
*Fix:*
- Return entries and voids from `min(weekStart(today) − 14, today − 7)`, plus the versions and events, plus dismissals for the current lapse keys and the current reflection week, plus **`today` computed by the DB**. The domain uses only this `today` (one clock authority).
- Add to §6:
  - `effectiveEntries(entries, voids)`
  - `habitWeekSummary → {planned, completed, raw, late, minimum}` (covers "4 of 3" and AC-W2)
  - `currentWeekAggregate` (AC-P1 chip)
  - `heatmapCells` (AC-P3, so the UI never derives cell states)
  - `consistencySeries(…, 12)`
  - `todaySections → {primary, due, optional, done, paused, reason}` (AC-A2, AC-D2)
  - `summaryChangedSince(ts)` (AC-W2)
  - `lateLogEligibility(d)` (AC-L4)
- `currentWeekProgress` must take entries. Define `remaining_needed` as using `plannedForWeek` (pro-rated).

**N1. NON-BLOCKING: timezone validation** (arch §4.3, §5). `pg_timezone_names` accepts `posix/*`, `right/*` (leap seconds), `Factory` and `localtime`, which disagree with `Intl`. Validate against `pg_timezone_names` minus those prefixes, and only accept names with a `/` or `UTC`.

**N2. NON-BLOCKING: OTP risks** (arch §2, §7).
- Supabase's built-in SMTP is rate-limited and not meant for production. A custom EU SMTP provider is a new dependency and needs owner approval.
- The email template must use `{{ .Token }}`.
- Enable CAPTCHA against email-bombing.
- *Needs verification:* if `signInWithOtp` runs in a server action, Supabase's per-IP limits see Vercel's egress IPs.

**N3. NON-BLOCKING: stack risks** (arch §2, §8).
- *Needs verification:* `@serwist/next` requires webpack, and Next 16 builds with Turbopack and renames `middleware.ts` to `proxy.ts`. Pin the versions in ADR-0001, or hand-write `sw.ts` (the scope is small).
- Server actions run serially per client, so avoid `revalidatePath` on every tap.
- Caching personalized RSC/HTML offline needs a purge on sign-out and must never cache action responses.
- Set the `dub1` region in `vercel.json`.
- Run the session refresh in the Node runtime, not Edge, so each request doesn't take a cross-region `getUser()` round trip.

**N4. NON-BLOCKING: ownership** (CLAUDE.md protocol 1, agent files).
- `docs/handoffs/` is listed only for lead-architect, yet every agent must write to it. Make it create-only for all agents.
- backend-engineer's `description` still says `db/`.
- `vercel.json` has no owner. Give it to lead-architect.
- `supabase/templates/*` copy: backend writes it, product approves.
- The Serwist wrapper in `next.config.*` needs a lead-architect task.
- State the path for generated types (`src/server/db.types.ts`).

**N5. NON-BLOCKING: doc consistency.**
- Roadmap Phase 1 says "no UPDATE or DELETE path on history". Add "except `delete_habit` and account deletion".
- Roadmap Phase 1 still says "honesty suite at domain level". Use the layers from testing §4.
- Spec AC-D3: specify the void reason for "Remove today's entry" (`undo`).
- Spec §7.5: specify that late/minimum counts include only entries that count toward `completed`.
- `upsert_reflection` must validate `isodow(week_start) = profile.week_start`, and `updated_at` must be server-set.
- Cap the length of `dismiss` keys.
- Account deletion: call `deleteUser` without soft-delete, using `getUser()` (not `getSession()`).

## Required before Phase 1
- Owner approval of the B1 spec change, the B2 schema additions, the SMTP provider (N2) and Serwist (N3).
- Architecture v0.3 and ADRs 0002/0003/0006 must reflect B1–B6.
