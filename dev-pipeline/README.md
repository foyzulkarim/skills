# dev-pipeline

A structured 5-phase development pipeline for Claude Code — from requirement engineering through code review.

## The pipeline

```
  ┌────────────────────────────────────────────────────────────┐
  │  Pre: /start-task → issue → branch + context  (opt-in)    │
  └──────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Phase 1     /plan-requirements                            │
  │  Output: REQ-*.md                                          │
  └──────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Phase 2     /plan-architecture                            │
  │  Output: ARCH-*.md                                         │
  └──────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Phase 3     /generate-tasks                               │
  │  Output: tasks in ARCH                                     │
  └──────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Phase 4     /tdd                                          │
  │  Output: code + tests                                      │
  └──────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Phase 5     /review                                       │
  │  Output: PR                                                │
  └────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────┐
  │  /commit → use at any stage                                │
  └────────────────────────────────────────────────────────────┘
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

One-shot branch bootstrap, zero confirmation by default. Detects the task source from the args — GitHub issue (`#100`, `issue 100`, or bare `100`), Jira key (via `acli`), local spec file, or ad-hoc brief — fetches the task, derives `{type}/{task-number}/{slug}`, syncs the default branch, creates and pushes the branch, and writes `specs/context/<id>.md`. The GitHub path runs entirely through a bundled script. Opt-in only.

### /session-stats (supporting)

Terminal dashboard of the current Claude Code session, rendered by a bundled bash script from the session's transcript JSONL (`~/.claude/projects/<project>/<session-id>.jsonl`): message counts, token usage, cache read/write, dollar cost, context %, lines changed, a cost-per-turn sparkline, and a tool-call histogram. One bash call, no LLM analysis. Pass a session id to inspect a different session.

### /commit (supporting)

One-shot conventional commit — bundled scripts (`gather.sh`/`commit.sh`) own all git inspection and mutation; the diff is adaptively curated in bash so the LLM drafts the message in a single pass. Zero-confirmation by default; `ask` argument enables draft confirmation and selective staging. Can be used at any stage of the pipeline.

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
