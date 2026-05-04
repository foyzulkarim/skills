# Architecture: Fix Review Sub-Skill Dispatch Mechanism

> **Date:** 2026-05-04
> **Phase:** 2 of 5 (System Architecture)
> **Requirements source:** specs/requirements/REQ-fix-review-subskill-dispatch.md
> **Type:** bugfix

## Architecture Summary

The review skill's dispatch mechanism is replaced with explicit parallel Agent tool calls. Each agent reads a sub-skill's SKILL.md file to get its review criteria, then applies it to the relevant files. Sub-skills become reference documents — no longer independently invocable via `/review:{name}`. The fix is surgical: only instruction text in SKILL.md frontmatter and dispatch sections changes. No code, no config, no runtime behavior affected.

## High-Level Structure

No structural change. The review orchestrator still triages, dispatches, and compiles — only the dispatch mechanics change:

```
Before (broken):
  Orchestrator ── "dispatch review/sub-skills/code-quality" ──> ???

After:
  Orchestrator ── Agent(read SKILL.md, apply criteria) ──> Findings
             ── Agent(read SKILL.md, apply criteria) ──> Findings   (parallel)
             ── Agent(read SKILL.md, apply criteria) ──> Findings
```

## Architecture Decisions Log

| #   | Decision                          | Alternatives                     | Chosen Because                  | Satisfies REQs |
|-----|-----------------------------------|----------------------------------|---------------------------------|----------------|
| A1  | Orchestrator uses parallel Agent tool calls, each reading sub-skill SKILL.md for criteria | Keep "let the skill runner decide" vagueness | Explicit calls are clear and executable; vagueness causes dispatch failure | R1, R4 |
| A2  | Sub-skill `trigger` field removed from all 16 files | Keep trigger but remove direct-invocation language | No trigger needed — not independently invocable; cleaner to remove | R2 |
| A3  | Sub-skill `name` fields kept fully qualified (`review/{check-name}`) | Simplify to `{check-name}` | Fully qualified avoids collision with other review skills | R3 |
| A4  | Available Checks table references file paths, not dispatch paths | Keep current dispatch-path format | File paths are unambiguous and point to actual source of truth | R6 |
| A5  | Description updated to reflect reference-document model | Keep current description | Current description implies standalone skill invocation | R5 |
| A6  | Sub-skill body content untouched | N/A | REQ R7 explicitly scopes body content as out of scope | R7 |

## Change Footprint

### Modified: `dev-pipeline/skills/review/SKILL.md`

| Section | Lines | What changes |
|---------|-------|-------------|
| Frontmatter description | 3 | Remove "dispatches sub-skills by name" — describe as reading sub-skill definitions and applying via parallel Agent calls |
| Step 3: Dispatch Selected Checks | 145-151 | Replace dispatch instruction format and "let the skill runner decide" with explicit parallel Agent prompt template referencing `dev-pipeline/skills/review/sub-skills/{check-name}/SKILL.md` |
| Available Checks table intro | 163 | Replace "Dispatch these by path: `review/sub-skills/{check-name}`" with file path reference to `dev-pipeline/skills/review/sub-skills/{check-name}/SKILL.md` |
| Available Checks table | 165-182 | Update Path column values to full file paths |
| "You Must NOT" section | ~324 | Reword "Hardcode Agent tool calls to dispatch sub-skills" to allow explicit Agent calls but require reading sub-skill SKILL.md |

### Modified: 16 sub-skill SKILL.md files

All under `dev-pipeline/skills/review/sub-skills/*/SKILL.md`:

| Change | Details |
|--------|---------|
| Remove `trigger` field | Each file loses the `trigger:` line from frontmatter. `name` and `description` stay untouched. |

Files:
- `dev-pipeline/skills/review/sub-skills/accessibility/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/async-patterns/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/code-quality/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/config-dependencies/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/database-patterns/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/documentation/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/error-handling/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/express-patterns/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/migration/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/performance/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/react-patterns/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/runtime-behavior/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/security/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/task-completion/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/test-coverage/SKILL.md`
- `dev-pipeline/skills/review/sub-skills/typescript-strictness/SKILL.md`

### Touched but not changed

None — no other files reference sub-skill dispatch paths or trigger fields.

## Areas of Impact

| Area | Impact | Risk | Why |
|------|--------|------|-----|
| Review orchestrator behavior | Dispatch mechanism changes from vague to explicit Agent calls | Low | Triage conversation and report format untouched; only dispatch mechanics change |
| Sub-skill independence | No longer invocable via `/review:{name}` | Low | Intentional; no other skill references sub-skills directly |
| Downstream pipeline skills | None — plan-architecture, generate-tasks, tdd, commit don't interact with review sub-skills | Low | Isolated change |

## Risk & Stress-Test Scenarios

### Forward — runtime failure scenarios

| Scenario | How the Design Handles It |
|----------|--------------------------|
| Agent can't find sub-skill SKILL.md file | Prompt template uses explicit path; if file missing, agent reports error clearly |
| Developer tries `/review:code-quality` directly | Skill runner won't find it — expected behavior per design decision |
| Sub-skill criteria drift from what agent reads | Each agent reads the SKILL.md fresh at dispatch time — no stale caching |

## Out of Scope

- Sub-skill review criteria, checklists, and output formats (REQ R7)
- Other skills in the plugin
- Plugin version bump
- Agent files in `dev-pipeline/agents/`

---

# Tasks

## Task T1: Update main review SKILL.md dispatch mechanism

> **Status:** not started
> **Effort:** s
> **Priority:** high
> **Depends on:** None
> **Satisfies REQs:** R1, R4, R5, R6
> **Footprint slice:** Modified: `dev-pipeline/skills/review/SKILL.md` (description, Step 3 dispatch, Available Checks table intro, Available Checks table Path column, "You Must NOT" section)
> **High-risk areas touched:** Review orchestrator behavior — Low risk (triage and report format untouched)

### Description

Fix the review skill's dispatch mechanism by replacing the ambiguous "dispatch by path" instructions with explicit parallel Agent tool call guidance. Five targeted edits to the main review SKILL.md so the orchestrator knows exactly how to spawn agents that read sub-skill definitions and apply their criteria.

### Test Plan

No test runner — verification is read-after-edit against acceptance criteria.

#### Verification Checks

- **V1:** Step 3 contains explicit Agent prompt template referencing `dev-pipeline/skills/review/sub-skills/{check-name}/SKILL.md` _(verifies R1)_
- **V2:** Description no longer says "dispatches sub-skills by name" — describes orchestrator as reading sub-skill definitions and applying via parallel Agent calls _(verifies R5)_
- **V3:** Available Checks table intro and Path column reference full file paths `dev-pipeline/skills/review/sub-skills/{check-name}/SKILL.md` _(verifies R6)_
- **V4:** "You Must NOT" section reworded to allow explicit Agent calls but require reading sub-skill SKILL.md files _(verifies R4)_
- **V5:** No lines changed outside these 5 sections _(verifies N1)_

### Implementation Notes

- **Module(s):** Review orchestrator SKILL.md
- **Key decisions:** A1 (explicit Agent calls), A4 (file path references), A5 (updated description)
- **High-risk callouts:** None — Low risk. Triage conversation, report format, verdicts, and re-review protocol are untouched.

### Scope Boundaries

- Do NOT modify sub-skill SKILL.md files (T2 owns those)
- Do NOT modify agent .md files or plugin.json
- Do NOT touch triage conversation, report format, verdicts, or re-review protocol sections

### Files Expected

**Modified files:**
- `dev-pipeline/skills/review/SKILL.md` (5 targeted section edits: frontmatter description, Step 3 dispatch instructions, Available Checks table intro, Available Checks table Path column, "You Must NOT" section)

**Must NOT modify:**
- All sub-skill SKILL.md files under `dev-pipeline/skills/review/sub-skills/` (T2 owns these)
- All agent .md files under `dev-pipeline/agents/`
- `dev-pipeline/.claude-plugin/plugin.json`

---

## Task T2: Remove `trigger` field from all 16 sub-skill SKILL.md files

> **Status:** not started
> **Effort:** xs
> **Priority:** high
> **Depends on:** None
> **Satisfies REQs:** R2, R3, R7
> **Footprint slice:** Modified: all 16 files under `dev-pipeline/skills/review/sub-skills/*/SKILL.md` (frontmatter only)
> **High-risk areas touched:** Sub-skill independence — Low risk (intentional change)

### Description

Remove the `trigger` field from all 16 sub-skill SKILL.md frontmatter blocks. Sub-skills are no longer independently invocable — they are reference documents read by the orchestrator's Agent calls. This is the same mechanical edit repeated for each file.

### Test Plan

No test runner — verification is read-after-edit against acceptance criteria.

#### Verification Checks

- **V1:** All 16 files under `dev-pipeline/skills/review/sub-skills/*/SKILL.md` contain only `name` and `description` in frontmatter — no `trigger` field _(verifies R2)_
- **V2:** All 16 files retain fully qualified `name` field (e.g. `review/code-quality`) _(verifies R3)_
- **V3:** No body content changed in any file — only the `trigger` line removed from frontmatter _(verifies R7)_

### Implementation Notes

- **Module(s):** Review sub-skills (all 16)
- **Key decisions:** A2 (remove trigger field), A3 (keep fully qualified name)
- **High-risk callouts:** None — purely mechanical frontmatter change.

### Scope Boundaries

- Do NOT modify `name` or `description` fields in any sub-skill frontmatter
- Do NOT modify any body content in sub-skill files
- Do NOT modify `dev-pipeline/skills/review/SKILL.md` (T1 owns that)
- Do NOT modify agent .md files or plugin.json

### Files Expected

**Modified files:**
- `dev-pipeline/skills/review/sub-skills/accessibility/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/async-patterns/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/code-quality/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/config-dependencies/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/database-patterns/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/documentation/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/error-handling/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/express-patterns/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/migration/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/performance/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/react-patterns/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/runtime-behavior/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/security/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/task-completion/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/test-coverage/SKILL.md` (remove `trigger` line)
- `dev-pipeline/skills/review/sub-skills/typescript-strictness/SKILL.md` (remove `trigger` line)

**Must NOT modify:**
- `dev-pipeline/skills/review/SKILL.md` (T1 owns that)
- All agent .md files under `dev-pipeline/agents/`
- `dev-pipeline/.claude-plugin/plugin.json`
