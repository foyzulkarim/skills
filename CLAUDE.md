# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code plugin marketplace (`foyzulkarim/skills`) containing the `dev-pipeline` plugin — a collection of AI skills implementing a structured **5-phase development pipeline**:

1. **Requirement Engineering** — capture WHAT and WHY (problem space)
2. **System Architecture** — design HOW (solution space)
3. **Task Generation** — break architecture into TDD-ready tasks
4. **TDD Implementation** — RED-GREEN-REFACTOR per task
5. **Review & Merge** — verify before merge

There is no build system, test runner, or compiled code. The entire value is in the SKILL.md files.

## Plugin structure

```
.claude-plugin/marketplace.json        ← marketplace registry (lists all plugins)
dev-pipeline/
├── .claude-plugin/plugin.json         ← plugin identity and skills location
└── skills/<skill-name>/SKILL.md       ← one file per skill; this is the source of truth
```

When adding a new skill:
1. Create `dev-pipeline/skills/<skill-name>/SKILL.md`
2. The `skills` field in `plugin.json` points to `./skills/` — the directory is auto-scanned, no per-skill registration needed

## The pipeline

```
Phase 1              Phase 2              Phase 3            Phase 4      Phase 5
/plan-requirements → /plan-architecture → /generate-tasks → /tdd       → /review → /commit
   (you)              (you + Claude)       (Claude)          (Claude)     (you+C)   (support)
   REQ-*.md           ARCH-*.md            tasks in ARCH     code+tests   PR
```

### Phase skills

- **plan-requirements** (Phase 1) — Socratic interview to capture WHAT and WHY. Outputs `/specs/requirements/REQ-<slug>.md`. Owner: developer.
- **plan-architecture** (Phase 2) — Collaborative system design. Reads REQ when present, runs from a brief otherwise. Outputs `/specs/architecture/ARCH-<slug>.md` (with an empty Tasks section).
- **generate-tasks** (Phase 3) — Reads ARCH (and the linked REQ) and embeds TDD-ready task specs into `ARCH-*.md`'s Tasks section. Does not create a new file.
- **tdd** (Phase 4) — RED-GREEN-REFACTOR loop driven from `ARCH-*.md`. Two modes: collaborative (pauses each step) and auto.
- **review** (Phase 5) — Triage-first review with up to 16 checks. Two modes: pipeline (verifies task implementation against ARCH/REQ) and general (PR/branch/staged).

### Supporting skills (non-phase)

- **commit** — Standalone; stages files, infers conventional commit type, extracts task number from branch name.
- **start-task** — Pre-pipeline bootstrap; pulls latest main, gathers task context, creates a feature branch.
- **create-worktrees** — Spins up parallel worktrees for parallel agent work.
- **code-quality-review / performance-review / rules-check / security-review** — Sub-checklists invoked by `review` as parallel agents.

### Pipeline entry points (three scenarios)

- **Greenfield** — Phase 1 → 2 → 3 → 4 → 5
- **New feature** in an existing system — Phase 2 → 3 → 4 → 5 (skip requirements; brief is enough)
- **Bugfix** — Phase 1 (as RCA) → 3 → 4 → 5 (skip architecture)

### Artifact paths

- `/specs/requirements/REQ-<slug>.md` — produced by plan-requirements
- `/specs/architecture/ARCH-<slug>.md` — produced by plan-architecture; tasks embedded in-place by generate-tasks
- `/specs/context/<identifier>.md` — produced by start-task

## SKILL.md format

Each SKILL.md contains YAML frontmatter followed by markdown instructions for the skill agent. The frontmatter declares at minimum the skill name, description, and trigger conditions. The markdown body defines the agent's behavior, conversation flow, inputs, outputs, and constraints.

## Versioning

Version lives in two places — keep them in sync:
- `dev-pipeline/.claude-plugin/plugin.json` → `version`
- `.claude-plugin/marketplace.json` → `plugins[0].version`

## Contributing

Fork → edit skills under `dev-pipeline/skills/<name>/` → open PR. Commits follow conventional commit format (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
