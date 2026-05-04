# Requirements: Fix Review Sub-Skill Dispatch Mechanism

> **Date:** 2026-05-04
> **Type:** bugfix
> **Source:** verbal brief — triage dispatch confusion observed in Claude thinking block
> **Phase:** 1 of 5 (Requirement Engineering)

## Summary

The review skill's dispatch mechanism is broken — sub-skills can't be invoked because the instructions reference filesystem paths that aren't resolvable skill names. The fix makes sub-skills reference documents that the orchestrator reads and applies via parallel Agent tool calls, removing the ability to invoke them independently.

## Problem & Motivation

The review skill's Step 3 instructs Claude to "dispatch sub-skills by path" using `review/sub-skills/{check-name}`. These paths are neither skill names nor slash commands — they're SKILL.md files in nested directories. When Claude tries to act on this instruction, it can't resolve the dispatch mechanism, falls back to guessing with generic Agent calls, and sometimes can't find the sub-skills at all.

The vague instruction "let the skill runner decide" and the conflicting rule "You Must NOT hardcode Agent tool calls" make the problem worse. The orchestrator either fails silently or produces sub-optimal review output.

## Users & Consumers

- **Review orchestrator (Claude)** — needs clear, executable dispatch instructions to run checks in parallel
- **Developers using `/review`** — expect the orchestrator to run selected checks without confusion or failure

## Functional Requirements

| ID  | Requirement                                  | Acceptance Criterion                              |
|-----|----------------------------------------------|---------------------------------------------------|
| R1  | Review SKILL.md dispatch section instructs parallel Agent tool calls | Step 3 contains explicit Agent prompt template referencing `dev-pipeline/skills/review/sub-skills/{check-name}/SKILL.md` |
| R2  | Sub-skill SKILL.md files have no `trigger` field | All 16 sub-skill frontmatter blocks contain only `name` and `description` |
| R3  | Sub-skill `name` fields remain fully qualified | All 16 sub-skills keep `name: review/{check-name}` format |
| R4  | "You Must NOT" section does not ban Agent tool calls | The line about hardcoding Agent calls is reworded to require reading sub-skill SKILL.md files instead |
| R5  | Main review SKILL.md description reflects the new dispatch mechanism | Description no longer says "dispatches sub-skills by name" |
| R6  | Available Checks table references file paths, not dispatch paths | Path column points to `dev-pipeline/skills/review/sub-skills/{check-name}/SKILL.md` |
| R7  | No changes to sub-skill review criteria, checklists, or output formats | Diff for sub-skill files touches only frontmatter |

## Non-Functional Requirements

| ID  | Requirement                                  | Acceptance Criterion                              |
|-----|----------------------------------------------|---------------------------------------------------|
| N1  | Changes are minimal and surgical | No lines changed outside the explicitly scoped sections |

## Decisions Log

| #   | Decision                          | Alternatives Considered            | Chosen Because                     |
|-----|-----------------------------------|------------------------------------|------------------------------------|
| 1   | Sub-skills are reference documents, not independently invocable skills | Keep as invocable skills with fixed dispatch paths | The dispatch paths aren't resolvable skill names — making them reference documents eliminates the ambiguity |
| 2   | Orchestrator dispatches via explicit parallel Agent tool calls | Keep "let the skill runner decide" vagueness | Explicit Agent calls are clear and executable; vagueness causes the confusion observed |
| 3   | Remove `trigger` field from sub-skill frontmatter entirely | Keep trigger but remove "user invokes directly" language | No trigger needed since they're not independently invocable; cleaner to remove entirely |
| 4   | Keep fully qualified `name` field (e.g. `review/code-quality`) | Simplify to just `code-quality` | Fully qualified name avoids collision with other review skills |
| 5   | Allow explicit Agent calls but require reading sub-skill SKILL.md | Keep ban on Agent calls entirely | The old ban is the root cause of the dispatch failure; agents must still read the source of truth |

## Scope Boundaries

### In Scope
- `dev-pipeline/skills/review/SKILL.md` — dispatch instructions, description, "You Must NOT" section, Available Checks table
- All 16 sub-skill SKILL.md files under `dev-pipeline/skills/review/sub-skills/*/SKILL.md` — frontmatter only

### Out of Scope
- Sub-skill review criteria, checklists, and output formats (no changes to body content)
- Other skills in the plugin
- Plugin version bump

---
_This requirements document is the input for the **plan-architecture** skill._
_Next step: `/plan-architecture from: specs/requirements/REQ-fix-review-subskill-dispatch.md`_
