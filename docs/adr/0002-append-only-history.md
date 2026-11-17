# ADR-0002: Append-only history, voids, cosmetic fields
Status: Accepted · 2026-11-11 · Detail: architecture §4.1–§4.3

## Context
Product rules 2 and 3 say history is never rewritten silently and stats are never faked.

## Decision
- **Insert-only tables:** `completion_entries`, `completion_voids`, `habit_goal_versions`, `habit_status_events` and `profile_timezone_events`.
- **Undo and corrections** insert a void row, with a composite FK to the entry's owner. Clients may void only with reason `undo` or `correction`, and only within `hi − 7`.
- **Status** comes from events. Pause and archive take effect at `hi + 1`, resume at `lo` (owner decision D1).
- **Cosmetic habit fields** (name, color, minimum version, note, intention) are deliberately non-historical. `created_on` can never change.
- **The only deletes** are explicit and confirmed: `delete_habit` and account deletion, which cascade.

## Consequences
- History can always be reconstructed.
- Undo leaves a visible trace, shown under "Show removed entries".
