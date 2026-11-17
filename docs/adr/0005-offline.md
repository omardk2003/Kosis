# ADR-0005: Offline (read-only MVP)
Status: Accepted · 2026-11-11

## Decision
- **MVP:** writes require a connection, and no personal data is stored on the device (see ADR-0008). Data already loaded in an open session stays visible.
- **Post-MVP queue:** if one is added, it stores a client `recorded_at` separately and replays entries honestly, as late where applicable. It never back-dates `logged_at`.

## Consequences
- The offline experience is simpler and more honest. The UI disables actions and says why.
