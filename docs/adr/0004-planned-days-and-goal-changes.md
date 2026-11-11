# ADR-0004: Planned-day pro-rating and goal-change timing
Status: Accepted · 2026-11-11 · Detail: product-spec §7, AC-H3

## Decision
- **Partial weeks:** `planned = ceil(N × active_days / 7)`. Rounding down would inflate stats.
- **Percentages** round down. All arithmetic uses integers.
- **Goal changes** take effect from the next week start, so one goal version governs each week. The exception is a correction during the creation week.
- **`weekly_count`** counts distinct days.

## Consequences
- Stats can't be gamed by editing goals mid-week. The worked examples in spec §7 are the acceptance tests.
