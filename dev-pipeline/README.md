# dev-pipeline

A structured 5-phase development pipeline for Claude Code — from requirement engineering through code review.

## The pipeline

```
Phase 1              Phase 2              Phase 3            Phase 4      Phase 5
/plan-requirements → /plan-architecture → /generate-tasks → /tdd       → /review → /commit
   (you)              (you + Claude)       (Claude)          (Claude)     (you+C)   (support)

/start-task → sync main, create branch, gather context  (opt-in, pre-Phase-1)
/commit → conventional commit  (use at any stage)
```

### /plan-requirements (Phase 1)

Socratic interview that captures **what** and **why** — intent, behaviors, edge cases, failure modes, and acceptance criteria. Produces `/specs/requirements/REQ-<slug>.md`. Owner: the developer. Claude is the interviewer, not the designer.

Skip this phase when the requirements are already clear (typical for new features in an existing system).

### /plan-architecture (Phase 2)

Collaborative system design — high-level structure, tech choices, data models, API contracts, module boundaries, patterns. Reads `REQ-*.md` when present. Produces `/specs/architecture/ARCH-<slug>.md` with an empty Tasks section that the next phase fills in.

### /generate-tasks (Phase 3)

Reads the architecture document (and the linked REQ when present) and embeds TDD-ready task specifications directly into the `ARCH-*.md` Tasks section. Each task includes a test plan, implementation notes, scope boundaries, and REQ traceability.

### /tdd (Phase 4)

Test-driven development partner. Works through RED-GREEN-REFACTOR one test at a time. Reads the task spec from `ARCH-*.md` for full context. Supports collaborative mode (pauses at every step) and autonomous mode (`/tdd auto`).

### /review (Phase 5)

Comprehensive code review with a triage-first approach. Proposes relevant checks, runs them as parallel agents, and produces a combined report. Up to 16 specialized checks. Two modes: pipeline (verifies implementation against `ARCH-*.md`) and general (PR/branch/staged).

### /start-task (pre-pipeline)

Start a new task by creating a synced feature branch. Pulls latest main, gathers task context from Jira (via `acli`), GitHub (via `gh`), or local specs, then creates and pushes a branch with the pattern `{type}/{task-number}/{slug}`. Opt-in only.

### /commit (supporting)

Standalone commit assistant. Inspects staged and unstaged changes, asks what to include, infers the conventional commit type from the diff, extracts a task number from the branch name, and drafts a complete commit message for confirmation before executing. Can be used at any stage of the pipeline.

## Pipeline entry points

- **Greenfield** → Phase 1 → 2 → 3 → 4 → 5
- **New feature in an existing system** → Phase 2 → 3 → 4 → 5 (skip requirements; brief is enough)
- **Bugfix** → Phase 1 (as RCA) → 3 → 4 → 5 (skip architecture)

## Install

```
/install-plugin foyzulkarim/skills dev-pipeline
```

## Output Conventions

- Requirements: `/specs/requirements/REQ-<slug>.md`
- Architecture (with embedded tasks): `/specs/architecture/ARCH-<slug>.md`
- Review reports: `CODE-REVIEW-*.md` at repo root
- Context files: `/specs/context/<identifier>.md`
- Branch naming: `{type}/{task-number}/{slug}`
