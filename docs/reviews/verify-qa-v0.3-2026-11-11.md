# QA verification of v0.3 (findings 1-6), 2026-11-11

| # | Status | Evidence |
|---|---|---|
| 1 Clock seam | RESOLVED | architecture §4.3 and testing §3 use `private.*(p_user, p_now, ...)` with thin wrappers. There is no override, and CI checks migrations for one. `tests/fixtures/time-vectors.json` is shared by Vitest and pgTAP, and the versions are pinned. |
| 2 "Needs today" | RESOLVED | Spec AC-A1 defines `planned_this_week` (§7.1, including scheduled pauses), `remaining_needed = max(0, ...)` and an inclusive `remaining_days`. Testing §5 has fixtures for the last day, Sunday start, Thursday creation and a pause tomorrow. |
| 3 Pause/archive after completing today | RESOLVED | AC-H4, AC-H5 and AC-H8 take effect tomorrow (D1), so today keeps its entry. H18 tests it, including pausing at 23:59. |
| 4 `replace_with_full` | RESOLVED | Architecture §4.3 and AC-L5 specify the shared lock, `variant = minimum`, non-voided, a 7-day window and an active day. A full entry is rejected. `source` is late only if the day is before today. H6 has a concurrency test and H19 covers the rest. |
| 5 E2E phasing | RESOLVED | Strategy §6 matches the roadmap exits exactly. Phase 2: 1, 2a, 3, 5a, 6a, 7, 10, 11, 13. Phase 3: 2b, 4a, 5b, 6b. Phase 4: 4b, 8, 9, plus smoke S. Phase 5: 10b, 12. |
| 6 Traceability | RESOLVED | Testing §7 has a row for every AC family (O, H, D, A, L, R, P, W, Q, X) plus §7 metrics and §9 copy. |

## New blocking issues
None.

## Minor, non-blocking
- Flow 10 is listed as phases "2-4", but the roadmap Phase 2 lists only E2E 10 with no later phases. This is fine as long as each phase's exit re-runs it.
- AC-R3 option 4 ("Pause this habit" effective today) conflicts with AC-H5, where pause takes effect tomorrow. Spec owner to check.
