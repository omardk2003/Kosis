# DISCIPLINE — Architecture

Owner: `lead-architect` · Status: **v0.3, reviewed, pending owner approval** · 2026-11-11

### Changelog
- **v0.3:** Resolves the blocking findings of the v0.2 reviews (`docs/reviews/v0.2-consolidated-2026-11-11.md`):
  - Default privileges are revoked. Helper functions move to the `private` schema.
  - Null-safe asserts and profile guards in every RPC.
  - Clock injection through `p_now`.
  - Pause and archive take effect tomorrow.
  - Timezone history and a conservative "today".
  - Voids are owner-bound, limited to the 7-day window, and accept only `undo`/`correction`.
  - `replace_with_full` is locked and checked.
  - Wider `get_today` read window and an expanded domain API.
  - Pinned OTP controls.
  - The service worker caches the static shell only. Serwist is dropped.
  - Environment separation and an account-deletion re-auth flow.
- **v0.2:** Adds the owner decisions: a PWA, Supabase Auth required, and a 7-day late window. Incorporates `docs/reviews/architecture-review-2026-11-11.md` findings 1–12:
  - The database is the only write path (SECURITY DEFINER RPCs). Clients have no table writes.
  - Drizzle is dropped in favour of `supabase-js` plus SQL migrations.
  - Voids live in their own insert-only table.
  - `habits` holds cosmetic fields only. Status comes from events.
  - Goal versions use `seq`, and the newest version wins.
  - Undo commits immediately.
  - Dismissals get a table.
  - The time model is completed.
  - Temporal and TanStack Query are dropped.
  - Agent ownership is made disjoint.
  - Environments are separated: local, staging, and production.
- **v0.1:** Initial draft.

## 1. Current state
- **Repository:** `omardk2003/Kosis` holds the docs and agent configuration only. There's no application code yet.
- **Supabase:** the existing project **"Kosis Project"** (eu-west-1, Postgres 17) is treated as **production**. As of 2026-11-11 it has no tables and no migrations. Agents must not run write SQL or apply migrations against it (§9).

## 2. Stack (v0.2: owner-approved in principle, details pending ADR-0001)

| Concern | Choice | Why |
|---|---|---|
| App type | **Mobile-first PWA**, installable, read-only offline | Owner decision. One codebase. Native apps can come later. |
| Framework | **Next.js (App Router) + React + TypeScript strict** | Server components and server actions, plus cookie sessions via `@supabase/ssr`. |
| Styling | **Tailwind CSS** + CSS custom-property tokens (`src/styles/tokens.css`) | Tokens map 1:1 to the design system. |
| Auth | **Supabase Auth, email OTP (6-digit code)** | Owner decision: accounts at launch. An OTP code works inside an installed iOS PWA, where magic links open Safari instead. |
| Database | **Supabase Postgres + RLS + SECURITY DEFINER RPCs** | The database enforces every invariant (§4.3). |
| DB access | **`supabase-js` with generated types**, called with the user's JWT. **No Drizzle.** | Every query runs as `authenticated`, so RLS always applies (review finding 2). |
| Migrations | **Plain SQL via the Supabase CLI** (`supabase/migrations/`) | Forward-only and reviewable. Applied to production only through CI. |
| Validation | **zod** in server actions (UX-level), with the **database as the authority** | Duplicate checks in the app only give friendlier errors. |
| Client data | **RSC + server actions + `useOptimistic`**. **No TanStack Query.** | One data approach, and a smaller bundle (finding 9). |
| Dates | **No date library.** Local dates are epoch-day integers. "Now → local date" uses `Intl.DateTimeFormat` with the profile timezone. | The domain only needs date-only arithmetic, so the Temporal polyfill's bundle cost isn't worth it. |
| Charts | **Hand-rolled SVG** | Two simple charts, with full control over honest rendering. |
| PWA | Web app manifest + **hand-written `src/sw.ts`** (no Serwist) | Caches only static, non-personal assets (the app shell). No personal data on the device. No offline writes in MVP. |
| Tests | Vitest, Testing Library, fast-check, Playwright, axe-core, pgTAP or SQL tests against a local Supabase | See testing-strategy.md. |
| Hosting | **Vercel, region `dub1`** (Dublin), set in `vercel.json`, co-located with Supabase eu-west-1. Session refresh runs in the Node runtime, not Edge. | Low latency and EU residency. |
| Email | **Custom EU SMTP provider** for Auth emails (*owner decision D4*) | Supabase's built-in SMTP is rate-limited and not meant for production. |

**Native later:** `src/domain` stays framework-free TypeScript with no DOM, Next, or Supabase imports. All rules live in the DB RPCs. A future Expo app reuses both.

## 3. Module layout & ownership
```
src/
  domain/              # pure TS: time, goals, stats, action, recovery          (backend-engineer)
    types.ts           # shared contract                                          (backend-engineer)
  server/              # server actions, supabase clients, zod schemas            (backend-engineer)
  app/                 # routes, layouts, manifest.ts                             (frontend-engineer)
  components/          # shared UI primitives                                     (frontend-engineer)
  features/<name>/ui/  # feature UI only; features/* contains nothing but ui/     (frontend-engineer)
  sw.ts                # service worker                                           (frontend-engineer)
  styles/tokens.css    # design tokens: SOLE writer                               (ui-ux-designer)
  styles/*.css         # other styles                                             (frontend-engineer)
middleware.ts          # Supabase session refresh, auth redirects (name per pinned Next version, ADR-0001) (backend-engineer)
supabase/              # config.toml, migrations/, templates/ (email copy approved by product), seed.sql (local only) (backend-engineer)
src/server/db.types.ts # generated Supabase types                                 (backend-engineer)
content/               # quotes + SOURCES.md, copy                                (behavioral-product-specialist)
tests/, e2e/           # + vitest/playwright configs                              (qa-testing-engineer)
package.json, tsconfig*, next.config.*, vercel.json, eslint/prettier, .github/workflows/**, .env.example
                       #                                                          (lead-architect)
docs/handoffs/         # create-only for every agent; each agent edits only its own handoff files
```
Dependency direction: `app → features → components`. Everything may import `domain`, and `domain` imports nothing outside itself. Only `src/server` imports the Supabase client. Migrations and RPCs require **lead-architect sign-off and a security-performance-reviewer PASS** before merge.

## 4. Data model (Postgres, schema `public`)

### 4.1 Tables
```sql
create table profiles (                       -- 1:1 with auth.users
  user_id        uuid primary key references auth.users(id) on delete cascade,
  timezone       text not null,                -- IANA; validated in RPC against pg_timezone_names
  week_start     smallint not null check (week_start between 1 and 7),  -- ISO: 1=Mon..7=Sun; fixed in MVP
  quotes_enabled   boolean not null default false,
  recovery_enabled boolean not null default true,
  onboarded_at   timestamptz,
  created_at     timestamptz not null default now());

create table profile_timezone_events (         -- insert-only timezone history (review AR-B2)
  id             bigint generated always as identity primary key,
  user_id        uuid not null references profiles(user_id) on delete cascade,
  timezone       text not null,
  effective_at   timestamptz not null);        -- = p_now at insert

create table habits (                          -- cosmetic fields only
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(user_id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  minimum_version text check (char_length(minimum_version) <= 120),
  note           text check (char_length(note) <= 500),
  color          text not null default 'accent',
  sort_order     int  not null,
  implementation_intention text check (char_length(implementation_intention) <= 200),
  created_on     date not null,                -- local date; set by create_habit, never updatable
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id));

create table habit_goal_versions (             -- insert-only
  id             uuid primary key default gen_random_uuid(),
  seq            bigint generated always as identity,
  habit_id       uuid not null, user_id uuid not null,
  goal_type      text not null check (goal_type in ('daily','weekly_count')),
  target_per_week smallint check (target_per_week between 1 and 7),
  effective_from date not null,
  created_at     timestamptz not null default now(),
  check ((goal_type = 'weekly_count') = (target_per_week is not null)),
  foreign key (habit_id, user_id) references habits(id, user_id) on delete cascade);

create table habit_status_events (             -- insert-only; status is derived, never stored on habits
  id             uuid primary key default gen_random_uuid(),
  seq            bigint generated always as identity,
  habit_id       uuid not null, user_id uuid not null,
  status         text not null check (status in ('active','paused','archived')),
  effective_on   date not null,                -- inclusive; always = local today at insert
  created_at     timestamptz not null default now(),
  foreign key (habit_id, user_id) references habits(id, user_id) on delete cascade);

create table completion_entries (              -- insert-only; NO update path exists
  id             uuid primary key default gen_random_uuid(),
  habit_id       uuid not null, user_id uuid not null,
  occurred_on    date not null,
  logged_at      timestamptz not null default now(),
  source         text not null check (source in ('on_time','late')),
  variant        text not null default 'full' check (variant in ('full','minimum')),
  note           text check (char_length(note) <= 500),
  logged_tz      text not null,                -- timezone used to derive "today" at insert
  unique (id, user_id),
  foreign key (habit_id, user_id) references habits(id, user_id) on delete cascade);

create table completion_voids (                -- insert-only; PK makes "void once" structural
  entry_id       uuid primary key,
  user_id        uuid not null,
  voided_at      timestamptz not null,
  reason         text not null check (reason in ('undo','correction','replaced')),
  foreign key (entry_id, user_id) references completion_entries(id, user_id) on delete cascade);

create table dismissals (                      -- recovery cards, reflection prompts, daily quote
  user_id        uuid not null references profiles(user_id) on delete cascade,
  kind           text not null check (kind in ('recovery','reflection','quote')),
  key            text not null check (char_length(key) <= 80),  -- '<habit_id>:<lapse_start>' or '<week_start>'
  dismissed_at   timestamptz not null default now(),
  primary key (user_id, kind, key));

create table weekly_reflections (              -- user-authored content, editable for 7 days
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(user_id) on delete cascade,
  week_start     date not null,
  went_well text, got_in_way text, adjustment text,   -- each ≤ 1000 chars (check)
  feeling        smallint check (feeling between 1 and 5),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, week_start));
```
All `created_at`, `logged_at`, `voided_at`, `effective_at` and `updated_at` values are written explicitly by the RPCs from `p_now` (§4.3). Column defaults exist only as a fallback.

**Indexes:**
- `completion_entries (user_id, occurred_on)`
- `completion_entries (habit_id, occurred_on desc)`
- `habit_goal_versions (habit_id, effective_from, seq desc)`
- `habit_status_events (habit_id, effective_on, seq desc)`
- `user_id` on every child table
- `habits (user_id, sort_order)`
- `profile_timezone_events (user_id, effective_at desc)`

### 4.2 Resolution rules
- **Goal on date d:** the row with `effective_from ≤ d`, ordered by `seq desc`, limit 1. The newest edit wins, so it also supersedes a pending version.
- **Status on date d:** the same rule over `habit_status_events` (`effective_on ≤ d`). With no event, the status is `active` from `created_on`. Pause and archive events have `effective_on = today + 1`. Resume and unarchive events have `effective_on = today`.
- **One entry per habit per day:** `log_completion` and `replace_with_full` both take `pg_advisory_xact_lock(private.entry_lock_key(habit_id, occurred_on))`. They then reject the write if a non-voided entry already exists. A partial unique index can't see the voids table.
- **Server "today"** — `private.server_today(user_id, p_now)`:
  ```
  min over every timezone tz whose interval overlaps (p_now − 24h, p_now] of (p_now at time zone tz)::date
  ```
  This uses `profile_timezone_events`. The function is used for every window check and for `source`, so a timezone switch can neither avoid the "late" label nor log a future day (AR-B2, *owner approval D2*).

### 4.3 Write path: the database is the only enforcement point (ADR-0006)
**Grants (first migration, and re-asserted by a CI test):**
```sql
alter default privileges in schema public revoke all on tables    from public, anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
revoke all on all tables, functions, sequences in schema public from public, anon, authenticated;
create schema private;  revoke all on schema private from public, anon, authenticated;  -- not exposed via the API
grant select on <each table> to authenticated;          -- explicit, table by table
grant execute on function public.<each rpc> to authenticated;  -- explicit, function by function
```
- RLS is enabled on **every** table with the policy `using (user_id = (select auth.uid()))`. The `anon` role has no access.
- **Structure:** each public RPC is a thin `SECURITY DEFINER` wrapper with `set search_path = ''`. It calls `private.<name>(auth.uid(), now(), …)`, where the logic lives and takes `p_user` and `p_now` as parameters. **No clock override exists anywhere.** Tests call the `private.*` functions directly with chosen `p_now` values against the local database only (QA-1).
- **Guards at the top of every write RPC:** `if auth.uid() is null then raise` and `if not exists(profile) then raise`. The second guard makes a deleted account's still-valid JWT useless.
- **Asserts are null-safe:** `if (cond) is not true then raise …`.
- **Every query inside a DEFINER function filters `user_id = p_user`.**
- **Read RPCs (`get_today`, `get_progress`) are `SECURITY INVOKER`**, so RLS applies to them.
- **Error messages** never echo user input.

**RPCs:**

| RPC | Rules enforced |
|---|---|
| `complete_onboarding(timezone, week_start)` | Valid tz. Runs once. `week_start` is immutable afterwards (MVP). Inserts the first timezone event. |
| `set_timezone(timezone)` | Valid tz. Inserts into `profile_timezone_events` (`effective_at = p_now`) and updates `profiles.timezone`. Entries keep their dates. |

A **valid tz** is a row in `pg_timezone_names` whose name is `UTC` or contains `/`, and doesn't start with `posix/` or `right/`. The list is cached in `private.valid_timezones`.
| `set_preferences(quotes_enabled, recovery_enabled)` | Owner only. |
| `create_habit(name, goal_type, target, minimum_version, note, color)` | `created_on` = local today, `sort_order` = max + 1. Inserts the first goal version (`effective_from = created_on`) and an `active` status event. |
| `update_habit_details(id, name, minimum_version, note, color, implementation_intention)` | Column whitelist only. `created_on` can never change. |
| `reorder_habits(ids uuid[])` | The ids must be exactly the caller's set of habits: no missing, extra or duplicate ids. |
| `create_habit` (addition) | Rejects the call if the caller already has 50 habits. |
| `change_goal(habit_id, goal_type, target)` | `effective_from` = next week start, **or** `created_on` if server today falls in the habit's creation week. Allowed in any status. |
| `set_habit_status(habit_id, status)` | `paused`/`archived`: `effective_on` = server today + 1. `active`: `effective_on` = server today. No other date is accepted (D1). |
| `log_completion(habit_id, occurred_on date default null, variant, note)` | See below. |
| `void_completion(entry_id, reason)` | `reason in ('undo','correction')` only. The entry must be owned, not voided, and have `occurred_on ≥ server today − 7`. Inserts into `completion_voids` with the composite FK. |
| `replace_with_full(entry_id)` | Takes the same lock as `log_completion`. The entry must be owned, not voided, have `variant = 'minimum'` and `occurred_on ≥ server today − 7`, and the habit must be active on that day. In one transaction it voids the entry (`replaced`) and inserts a `full` entry for the same day, with `source = late` if `occurred_on < server today`. |
| `dismiss(kind, key)` | Key ≤ 80 characters and must match its kind's format. Upsert, idempotent. |
| `upsert_reflection(week_start, ...)` | `isodow(week_start) = profile.week_start`. The week has started (`week_start ≤ server today`). Writes are allowed until `week_start + 13`. Text ≤ 1000 characters. `updated_at` is set by the server. |
| `delete_habit(habit_id)` | The only DELETE path. Owner only. Children cascade via FKs. |

`log_completion` pseudo-code:
```sql
-- public.log_completion → private.log_completion(p_user := auth.uid(), p_now := now(), ...)
today := private.server_today(p_user, p_now);   -- conservative across tz changes
d     := coalesce(p_occurred_on, today);        -- on-time path sends no date
assert (habit owned by p_user) is not true → raise;
assert (d between greatest(h.created_on, today - 7) and today) is not true → raise;
assert (private.status_on(habit, d) = 'active') is not true → raise;
perform pg_advisory_xact_lock(private.entry_lock_key(habit, d));
assert no non-voided entry for (habit, d);
insert ... source := case when d < today then 'late' else 'on_time' end,
           logged_at := p_now, logged_tz := profile.timezone;
```
- **Account deletion (SR-H5):**
  - The target user id comes **only** from the server-verified `auth.getUser()`. No client-supplied id or email is accepted.
  - The server sends an OTP to that user's own email, and it must be verified within **5 minutes**.
  - The action is rate limited and idempotent.
  - The service-role client is created in exactly one module (`src/server/admin.ts`, `import 'server-only'`) and calls `auth.admin.deleteUser(id)` as a hard delete. Everything cascades.
  - The client then signs out and purges the service-worker caches.
  - Still-valid JWTs are useless because every RPC requires a profile row.
  - Backup retention is documented in the privacy policy.
- **Export:** a server action, requiring a sign-in within the last 10 minutes, selects all of the user's rows under RLS. It **paginates explicitly**, so PostgREST `max_rows` can never silently truncate the export. It streams JSON/CSV, with CSV formula escaping.

### 4.4 Reads
- **Today:** `get_today()` (SECURITY INVOKER) returns:
  - **`today`, computed by the DB** with `server_today`. The domain uses only this value, so there's one clock authority.
  - the profile
  - habits with all their goal versions and status events
  - entries **and voids** from `min(weekStart(today) − 14, today − 7)` to today, which covers Recovery's two completed weeks and the late-log picker
  - `last_completed_on` per habit
  - all recovery dismissals for the habits' open lapse keys
  - the reflection dismissal for the previous week
- **Progress:** `get_progress()` (SECURITY INVOKER) returns 13 weeks plus the 8-week trend window of entries, voids, versions, and events in one bounded, indexed query.
- **Stats** are computed in `src/domain` on the server (RSC). The UI never computes stats.

## 5. Time model (ADR-0003)
- A local date is `YYYY-MM-DD`, held in the domain as an **epoch-day integer**. "Today" = `Intl.DateTimeFormat(…, { timeZone: profile.timezone })` on the server. In SQL it's `(now() at time zone tz)::date`.
- **Week of d:** `start = d − ((isoDow(d) − week_start + 7) mod 7)`.
- **week_start** is chosen at onboarding and immutable in MVP. A post-MVP change will be versioned with a pro-rated "bridge" week, so it never re-buckets history silently.
- **Timezone change:** forward-only and recorded in `profile_timezone_events`. Entries keep `occurred_on`. For 24 h after a change, server "today" is the earliest local date under any timezone in effect in that window (§4.2).
  - Travelling east can skip a local date. That day stays a planned day and can be late-logged.
  - Travelling west can repeat a date. The conservative "today" prevents logging a day ahead.
- **One clock authority:** the DB computes `today` and returns it in `get_today`. The domain never derives "today" itself.
- **Signup:** the timezone comes from the device (`Intl`) and is confirmed in onboarding. A later mismatch prompts the user and never switches silently.
- **Server time is the authority.** The client clock is never trusted for `occurred_on` or `logged_at`.

## 6. Domain API (contract sketch, `src/domain`)
```ts
type Day = number; // epoch day; `today` always comes from the DB (get_today)
effectiveEntries(entries, voids): Entry[]               // drops voided entries
weekStartOf(d: Day, weekStart: 1|2|3|4|5|6|7): Day
goalOn(versions, d): Goal | null           // effective_from ≤ d, max seq
statusOn(events, createdOn, d): Status
activeDays(habit, week): Day[]
plannedForWeek(habit, week): number        // spec §7.1 (ceil pro-rating)
completedForWeek(habit, entries, week): number            // spec §7.2
habitWeekSummary(habit, entries, week): { planned; completed; raw; late; minimum }  // "4 of 3", AC-W2
weeklyConsistency(habits, entries, week): { pct: number | null; completed; planned; late; minimum }
consistencySeries(habits, entries, today, 12): WeekPoint[]  // AC-P1/P2 (pct | 'no-plan')
currentWeekProgress(habit, entries, today): { done; soFar }  // spec §7.4
currentWeekAggregate(habits, entries, today): { done }       // AC-P1 chip
trend(series): { a: number; b: number; kind: 'up'|'down'|'same' } | null  // spec §7.6
heatmapCells(habit, entries, today, 12): CellState[][]    // AC-P3; the UI never derives cell states
todaySections(habits, entries, today, skippedToday): { primary; reason; due; optional; done; paused }  // AC-A1/A2, AC-D2
detectLapse(habit, entries, today): { lapseKey; kind; copyVariant } | null  // AC-R1/R5
summaryChangedSince(habit, entries, voids, week, ts): boolean  // AC-W2
lateLogEligibility(habit, entries, today): Array<{ day; state: 'ok'|'replace-minimum'|'disabled'; reason? }>  // AC-L4
// all percentage and pro-rating math uses integer arithmetic
```
All functions are pure and deterministic. `today` and `weekStart` are always passed in.

## 7. Security & privacy
### 7.1 Auth: Supabase email OTP (SR-H2)
Pinned in `supabase/config.toml` and the production dashboard, with values to verify against the current Supabase docs in ADR-0006:
- **OTP:** 6 digits, **expiry ≤ 600 s**, and at least **60 s** between sends to the same email.
- **Rate limits:** low per-hour caps on sends and verifies.
- **CAPTCHA** on the send step (*owner choice D5: Turnstile or hCaptcha*).
- **Custom SMTP** in production (*D4*). The email template uses `{{ .Token }}`, not a link.
- `signInWithOtp({ shouldCreateUser: true })` handles sign-in and sign-up the same way. The UI response is identical for known and unknown emails ("If this email can sign in, we've sent a code"), and rate-limit errors don't reveal whether an email is registered.
- The site URL and redirect allowlist are limited to the production domain and **team-scoped** preview patterns. No `*.vercel.app` wildcard.
- **Sessions:** only server-side Supabase clients, with cookies via `@supabase/ssr`. There's no browser Supabase client, so cookies can stay httpOnly.
  - The middleware refreshes the session with `getUser()`/`getClaims()`, never `getSession()`.
  - Authorization never relies on the middleware alone. Every server action and RPC re-checks.

### 7.2 Other
- **Authorization:** RLS select-only for owners. All writes go through RPCs (§4.3). `anon` has no grants.
- **Secrets:**
  - Client: `NEXT_PUBLIC_SUPABASE_URL` and the publishable (anon) key only.
  - Server-only: the service-role key, used only for account deletion.
  - `.env*` files are git-ignored. `.env.example` holds names only, no values.
- **Web:** a nonce-based CSP (policy text in ADR-0001), plus HSTS, `Referrer-Policy`, `Permissions-Policy` and `frame-ancestors 'none'`. No `dangerouslySetInnerHTML` on user content. Server actions use Next's origin checks and are rate limited.
- **Logging:** never log emails, notes, reflections or habit names. No error-reporting SaaS without a data processing agreement.
### 7.3 Service worker (SR-H3)
- Caches **only** static, versioned build assets and the offline shell page.
- **Never** caches authenticated HTML, RSC payloads, server-action responses or API responses.
- No personal data is written to Cache Storage, IndexedDB or localStorage in MVP.
- Sign-out and account deletion call `caches.keys()` → delete all, then unregister and re-register the worker.

### 7.4 Privacy
- **Privacy:**
  - EU data residency (eu-west-1, Vercel `dub1`).
  - The lawful basis, data processing agreements (Supabase, Vercel, SMTP), and backup retention are documented before launch (Phase 5).
  - No third-party trackers.
  - Analytics are opt-in and first-party, if any.
  - Export and account deletion are in MVP.
  - A privacy policy exists before launch.

## 8. Performance budgets
- Dashboard initial JS ≤ **150 KB gzip**. This is a **Phase 0 exit gate**, measured on the empty scaffold.
- LCP ≤ 2.0 s and INP ≤ 200 ms on a Moto G-class device over 4G.
- `supabase-js` and zod stay out of the client bundle. The client only calls server actions.
- Today needs one RPC round trip, plus the session check. Local JWT verification (`getClaims`) avoids a second network call to Auth, to be verified in ADR-0001. Progress needs one bounded query, and its route is code-split.
- Internal target: the scaffold's baseline JS is ≤ 110 KB gzip, leaving room under the 150 KB budget.
- Optimistic completion feedback in < 100 ms.

## 9. Environments & Supabase safety
| Env | Database | Purpose |
|---|---|---|
| Local | Supabase CLI (Docker) | Development, unit, integration, and E2E tests. Seeds are local only. |
| Preview/staging | Recommended: a separate free Supabase project "Kosis Staging" (eu-west-1), **created by the owner** (*D3*). Alternative: Supabase branching (paid). | PR previews and migration rehearsal. No real user data. |
| Production | **"Kosis Project"** (eu-west-1) | Real users only. Migrations are applied **only via CI** after review. |

**Separation rules (SR-H4):**
- Production URL, keys and the service-role key are set **only** in the Vercel *Production* environment. Preview and development builds get staging or local values.
- A runtime guard in `src/server/env.ts` refuses to start when `VERCEL_ENV !== 'production'` and the Supabase URL equals the production URL.
- Production migrations run from a GitHub Actions workflow bound to a protected **GitHub Environment "production"**, which requires owner approval. The database credentials live only there.
- Agents never run write SQL, apply migrations, or create, reset or delete branches on production through the Supabase MCP without explicit owner approval in the conversation.
- Agents' read-only use of production is limited to **schema listings and advisors**. They don't read production logs, because those can contain user data.

## 10. ADRs to write in Phase 0
| ADR | Topic |
|---|---|
| 0001 | Stack (this §2) |
| 0002 | Append-only log, voids, cosmetic vs historical fields |
| 0003 | Time model, timezone, week start |
| 0004 | Planned-day pro-rating (ceil) and goal-change timing |
| 0005 | Offline (read-only MVP; a future queue stores a client `recorded_at` and replays honestly as late) |
| 0006 | DB-only write path (RPCs, grants, RLS) |
| 0007 | Environments and migration deployment (§9) |
| 0008 | Service worker and offline policy (§7.3) |
