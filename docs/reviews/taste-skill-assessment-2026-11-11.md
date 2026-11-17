# Taste Skill (Leonxlnx/taste-skill): installation and security assessment

Date: 2026-11-11 · Inspected commit: `f6b76575f949707b4e3c37cd86cb44b0b98643e8` (2026-11-07), version **tasteskill 2.5.1**.

**Method:** a read-only `git clone` into an isolated scratch folder, then manual and grep-based inspection. **Nothing was installed or executed.**

## 1. Facts
| Item | Finding |
|---|---|
| License | MIT |
| Official install | `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`. Alternatives: `/plugin install taste-skill@taste-skill`, or `install.sh`, which symlinks into `~/.claude/skills` |
| Install name | `design-taste-frontend` (SKILL.md frontmatter). Folder: `skills/taste-skill/` |
| Size | **40 MB, 1,631 files**, of which **153 are executable scripts** (`.mjs`/`.js`). 26 MB is assets, including 12 MB of photographs |
| Instructions | SKILL.md (381 lines) plus about 440 KB of reference texts |
| Runtime needs | Node 22+, Chrome/Chromium, and ffmpeg (optional). All three exist in this cloud container |
| npm dependencies | None. It doesn't install packages |
| **Embedded hook** | The SKILL.md frontmatter defines a **`Stop` hook**. While the skill is active, it runs `node scripts/gate.mjs --hook claude` automatically at the end of every turn, with a timeout of up to **600 s** |
| Processes | Scripts start headless Chrome (`--remote-debugging-port=0`, `--user-data-dir=<temp>`), detached watchdog processes, `spawnSync('ffmpeg')`, and recursive deletion (`rmSync`) of their own temp and profile folders |
| Network | Google Fonts, jsDelivr, Wikimedia Commons, picsum.photos and GitHub (icons). Fetched only when photos, icons or fonts are requested |
| Env vars read | `CHROME_PATH`, `HOME`, `TASTE_SKILL_*`, Windows paths. **No** secrets, tokens or credential files |
| Suspicious patterns | None found: no reads of `~/.ssh`, `.aws`, `.npmrc` or `.env`, no exfiltration to unknown hosts, no `eval` of external code. The `eval` hits are Chrome DevTools `page.eval()` calls. This is a **grep-based scan, not a full audit** of 153 scripts |

## 2. Can it be a project skill in Claude Code on the web?
**Technically yes.** Claude Code discovers project skills in `.claude/skills/<name>/SKILL.md` in the repository. A web session clones the repo, and skills are loaded when the session starts. The `ui-ux-designer` agent already has the `Skill` tool and would call `Skill("design-taste-frontend")`.

## 3. Why we don't recommend installing it as is
1. **Wrong product fit.** Version 2.5 is built for **marketing and company websites**: hero sections, real photographs, shader effects, "one section per screen", modelled on figma.com and x.ai. DISCIPLINE is a calm, mobile-first **app** with a fixed design system and a ban on decorative effects and gamification. The skill would push the UI agent in the opposite direction.
2. **The automatic Stop hook** runs third-party Node code at the end of every turn while the skill is active, for up to 10 minutes, starting Chrome and background processes. That is code execution in the session without an explicit approval per run.
3. **Size and review burden:** 40 MB and 153 scripts in the repository, with no realistic way to review every update.
4. **Network access** to external CDNs and photo sources during design work.

## 4. Recommendation
**A (recommended): distill, don't install.** The `ui-ux-designer` reads the skill's text principles once (from the scratch copy or GitHub, read-only) and writes the relevant, licence-compliant principles into `docs/design-system.md` with attribution (MIT). That means no third-party code, no hook, and no dependency.

**B (alternative): vendor a text-only copy.** Copy only `SKILL.md` and `references/*.md` into `.claude/skills/design-taste-frontend/`, pinned to the commit above. **Remove the `hooks:` block** and all script references, and keep the MIT LICENSE alongside. The downside is that the instructions refer to scripts that are missing, so the skill behaves inconsistently and has to be adapted (a fork).

**C (not recommended for DISCIPLINE):** a full install via `npx skills add`, `/plugin install` or `install.sh`. Acceptable only in a separate marketing-site project, after owner approval.

**Older variants:** the earlier `design-taste-frontend-v1` lives in the separate repo `Leonxlnx/taste-skill-classics`. It hasn't been inspected; it may be text-heavier and more general, but it needs its own security review before any decision.

## 5. If the owner chooses B
1. Branch `claude/taste-skill-vendor`, copying only the text files from commit `f6b7657`.
2. Delete the `hooks:` block in the SKILL.md frontmatter. Add `PROVENANCE.md` (source, commit, date, list of changes) and `LICENSE`.
3. Review by `security-performance-reviewer`. Approval by the owner.
4. Add `skills: [design-taste-frontend]` to `ui-ux-designer` if the agent format supports preloading (*needs verification*). Otherwise the agent invokes it with the `Skill` tool, as described today.
5. The skill becomes available from the **next** session after the merge, because skills are loaded at session start.
