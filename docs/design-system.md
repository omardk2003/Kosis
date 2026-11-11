# DISCIPLINE — Design System

Owner: `ui-ux-designer` · Status: **Draft v0.1** · 2026-11-11

## 0. Required skill: `design-taste-frontend`

**Status: NOT installed** (checked 2026-11-11 in `.claude/skills/` and `~/.claude/skills/`).

This is a third-party, MIT-licensed skill from
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill). Several mirrors and forks exist
under other names, so only use the original repo. **Install only after the owner approves and
someone has reviewed its `SKILL.md`.**

```bash
# Option A — skills CLI (fetches from GitHub via npx)
npx skills add Leonxlnx/taste-skill --skill "design-taste-frontend"

# Option B — manual, reviewable
git clone https://github.com/Leonxlnx/taste-skill /tmp/taste-skill
less /tmp/taste-skill/skills/*/SKILL.md          # review first
mkdir -p .claude/skills/design-taste-frontend
cp -r /tmp/taste-skill/skills/<folder>/. .claude/skills/design-taste-frontend/
```
Restart Claude Code afterward. Pin to a reviewed commit SHA. If the skill conflicts with
this document, **this document wins** for DISCIPLINE.

## 1. Design direction
**"Quiet instrument."** A well-made tool: warm paper-like neutrals, one confident accent,
generous whitespace, typographic hierarchy over boxes and borders. Calm doesn't mean bland.
Its distinctiveness comes from type, rhythm, and a single signature element (the consistency
bars), not from decoration.

Avoid: purple-gradient SaaS look, glassmorphism, emoji-as-UI, confetti, red failure
states, dense card grids, and "streak flame" imagery.

## 2. Color tokens
Use CSS custom properties. Light and dark themes are both first-class. Every text pair is
≥ 4.5:1, and UI/graphic elements are ≥ 3:1.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F7F5F0` | `#141413` | App background (warm paper / warm ink) |
| `--surface` | `#FFFFFF` | `#1E1D1B` | Raised surfaces |
| `--text` | `#1C1B19` | `#EDEBE6` | Primary text |
| `--text-muted` | `#5E5A53` | `#A8A39A` | Secondary text |
| `--border` | `#E4E0D8` | `#2E2C29` | Hairlines |
| `--accent` | `#2F5D50` | `#7FB8A4` | Primary action, "done" (deep green-teal) |
| `--accent-contrast` | `#FFFFFF` | `#0F1F1A` | Text on accent |
| `--late` | `#8A6A2E` | `#D3B37A` | "Logged later" marker (ochre), always paired with a hollow shape |
| `--missed` | `#D9D4CA` | `#3A3733` | Missed: neutral, **never red** |
| `--danger` | `#9B2C2C` | `#F2A3A3` | Destructive actions only (delete) |
| `--focus` | `#1F6FEB` | `#79B8FF` | Focus ring |

Status is never conveyed by color alone. Use shape too: filled = done, ring = late,
half = minimum, empty = missed.

## 3. Typography
- **Display/headings:** a characterful serif or grotesk with open licensing, e.g. *Fraunces*
  (OFL) for the primary action and big numbers. **Body/UI:** *Inter* (OFL) or the system UI
  stack.
- Scale (rem, 16 px base): 0.8125 · 0.9375 · 1 · 1.25 · 1.5 · 2 · 2.75 (stat numerals).
- Tabular numerals for all stats. Line-height 1.5 body, 1.15 display.
- Self-host fonts with `font-display: swap`. Budget ≤ 2 font files on the critical path.

## 4. Spacing, layout, shape
- 4 px base grid. Spacing tokens: 4, 8, 12, 16, 24, 32, 48, 64.
- Mobile gutter 16 px, max content width 640 px (single column even on desktop for Today).
- Radii: 8 (controls), 14 (cards), 999 (pills). Elevation: hairline borders by default, one
  soft shadow level for the Action Mode sheet only.
- Thumb zone: the primary action sits in the lower half of the viewport on mobile when there's
  room. Sticky bottom navigation with ≤ 3 tabs: **Today · Progress · Habits**.

## 5. Motion
- Durations 120 / 200 / 320 ms, using a standard ease-out curve.
- Completion: a check draws in plus a subtle 1.0 → 1.04 → 1.0 scale. No particles.
- `prefers-reduced-motion`: replace with opacity fades ≤ 120 ms.

## 6. Core components
Primary Action Button (full width, 56 px tall, display font) · Habit Row (name, weekly
progress "2 of 3", one-tap check ≥ 44 px) · Undo Toast · Inline Card (recovery, reflection,
quote: dismissible, never modal) · Action Mode Sheet (full screen, timer, Done / Not now /
Minimum) · Consistency Bars (12 weeks, zero-based, value + denominator on tap) · Habit
Heatmap (12×7 cells with shape-coded states) · Goal Picker (segmented: Daily / N per week /
Specific days) · Date Picker for late log (only the last 7 days are enabled) · Skeletons ·
Empty State · Error Banner.

## 7. Data visualization rules
Zero-based y-axis. No smoothing or interpolation across "no plan" weeks (render a gap).
Label the current week "in progress". Late logs are visibly distinct. Every value is
reachable as text for screen readers (a table alternative).

## 8. Required states (every screen)
| State | Pattern |
|---|---|
| Loading | Skeleton matching the final layout. Never a full-screen spinner > 300 ms |
| Empty | One sentence of context + one primary action |
| Error | Plain-language cause + Retry. Keep showing cached data when available |
| Success | Brief inline confirmation or toast. No modal |
| Offline | Quiet banner. Completions queue if supported, otherwise disabled with a reason |

## 9. Voice & tone
Calm, direct, kind, brief. "Workout slipped this week. Want to get back on track?" — not
"You failed your workout goal!" Banned in UI copy: *fail, failed, broke, lost, lazy, should
have*. Sentence case everywhere.

## 10. Screens to spec (docs/screens/)
today · action-mode · habit-create-edit · habit-detail · late-log · recovery-card ·
progress · weekly-reflection · settings · onboarding (≤ 2 steps: name + goal of the first
habit).
