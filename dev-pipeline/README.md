# dev-pipeline

A structured 5-phase development pipeline for Claude Code — from requirement engineering through code review, with an optional QA gate that runs independently of review.

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
  │  Output: TASKS-<N>-<slug>.md                               │
  └──────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Phase 4     /implement                                    │
  │  Output: code + verification evidence                      │
  └──────────────┬─────────────────────────────┬───────────────┘
                 │                             │
                 ▼                             ▼
  ┌───────────────────────────┐  ┌───────────────────────────┐
  │  Phase 5   /review        │  │  QA gate (when applicable)│
  │  Output: PR + report      │  │  /plan-qa                 │
  │                           │  │    ↓                      │
  │                           │  │  /execute-qa              │
  │                           │  │  Output: QA-RESULTS-*.md  │
  └──────────────┬────────────┘  └─────────────┬─────────────┘
                 └───────────────┬─────────────┘
                                 ▼
                               merge
        (QA gate is skipped when the change has
         no running surface worth driving)

  ┌────────────────────────────────────────────────────────────┐
  │  /commit → use at any stage                                │
  └────────────────────────────────────────────────────────────┘
```

### /plan-requirements (Phase 1)

Socratic interview that captures **what** and **why** — intent, behaviors, edge cases, failure modes, and acceptance criteria. Produces `/specs/requirements/REQ-<N>-<slug>.md` (or `REQ-<slug>.md` with no linked issue). Owner: the developer. Claude is the interviewer, not the designer.

Skip this phase when the requirements are already clear (typical for new features in an existing system).

### /plan-architecture (Phase 2)

Collaborative system design — high-level structure, tech choices, data models, API contracts, module boundaries, patterns, and a change-footprint walk that names the concrete files in scope. Reads `REQ-*.md` when present. Produces `/specs/architecture/ARCH-<N>-<slug>.md` (or `ARCH-<slug>.md` with no linked issue) — architecture-only; the next phase emits a sibling `TASKS-<N>-<slug>.md` and the ARCH header carries a `> **Tasks:**` row that names it.

### /generate-tasks (Phase 3)

Reads the architecture document (and the linked REQ when present) and emits verification-ready task specifications as a separate `TASKS-<N>-<slug>.md` sibling of ARCH. Each task carries a verification mode — `tdd`, `test-after`, `ui`, or `checklist` — plus a matching verification plan, implementation notes, scope boundaries, and REQ traceability.

### /implement (Phase 4)

Implementation partner that routes each task to the verification discipline it needs: `tdd` (RED-GREEN-REFACTOR), `test-after` (increment, then cover), `ui` (evidence-backed human checklist), or `checklist` (command outcomes). Reads the task spec from `TASKS-*.md` (with `ARCH-*.md` as architecture-only context) and ends every task with a task-scoped conventional commit. Collaborative by default; `/implement T1 auto` runs one task without stepping, `/implement auto` runs the whole plan behind a single approval gate.

### /review (Phase 5)

Comprehensive code review with a triage-first approach. Proposes relevant checks, runs them as parallel agents, and produces a combined report. Up to 17 specialized checks. Two modes: pipeline (verifies implementation against `ARCH-*.md`) and general (PR/branch/staged).

### /plan-qa (QA gate)

Post-implementation QA planning — independent of `/review` (the developer chooses whether to run them sequentially or in parallel, and in what order). Interviews the developer to turn the specs and the diff into an executable QA specification: cases with tagged steps (`[bash]`/`[browser]`), project traps codified as `Guard:`s on the exact steps that need them, a Coverage Map over every changed file, identities, preconditions, and named operator handoffs for the few actions an agent genuinely cannot do. Every Expected line is falsifiable — `[assert]` (machine-verifiable) or `[judge]` with an explicit pass/fail criterion fixed at plan time. Produces `/specs/qa/QA-<N>-<slug>.md`. Skip this gate when the change has no running surface worth driving.


### /execute-qa (QA gate)

Runs after `/plan-qa` produces the specification. Preconditions run first (a red automated suite means the run does not begin); cases execute in order with their tagged drivers and guards; operator handoffs print verbatim and wait. `[assert]` lines verify mechanically; `[judge]` lines are judged only against the plan's written criterion, with the observed evidence quoted next to the verdict and ambiguity escalating to PARTIAL — never a guessed pass. Appends one run section of verdicts and findings to `/specs/qa/QA-RESULTS-<N>-<slug>.md`; never modifies the plan.

### /start-task (pre-pipeline)

One-shot branch bootstrap, zero confirmation by default. Detects the task source from the args — GitHub issue (`#100`, `issue 100`, or bare `100`), Jira key (via `acli`), local spec file, or ad-hoc brief — fetches the task, derives `{type}/{task-number}/{slug}`, syncs the default branch, creates and pushes the branch, and writes `specs/context/<id>.md`. The GitHub path runs entirely through a bundled script. Opt-in only.

### /move-to-worktree (supporting)

Companion to `/start-task` for parallel Phase 4 lanes. Parks the current clean, pushed feature branch in its own `.worktrees/<issue#>` and returns the primary checkout to the default branch, so the next parallel lane can start. Operates on git state only — it does not install dependencies or write project configuration; a bundled script owns all mutation.

**Prerequisite:** `.worktrees/` must be gitignored in your repo. The worktree is nested inside the repo root, so an unignored one is staged by any `git add -A` as an embedded `160000` gitlink — silently committing the lane's HEAD onto another branch. The skill hard-stops with the one-line remedy rather than editing `.gitignore` for you.

### /finish-worktree (supporting)

Teardown counterpart to `/move-to-worktree`, run after an issue's PR has squash-merged and its issue has closed. Verifies the merge via `gh` (PR merged, local tip matches the merged head, issue closed, remote branch gone), fast-forwards the default branch, removes the worktree, and deletes the local branch. A bundled script owns all mutation.

### /archive-issue (supporting)

Retires a closed issue's `specs/` artifacts (context, requirements, architecture, review reports) into the GitHub wiki, once GitHub itself becomes the source of truth for the issue. Resolves everything from the issue number via `gh issue view` and the artifact naming contract below — no separate anchor file. Bootstraps the wiki index on first use; the wiki push requires explicit confirmation.

### /release-notes (supporting)

Drafts a changelog entry for the next release by summarizing commits since the last git tag, suggests the next semver version, and prepends the entry to `CHANGELOG.md`. Version baseline comes from `git describe --tags`, never from a project manifest.

### /session-stats (supporting)

Terminal dashboard of the current Claude Code session, rendered by a bundled bash script from the session's transcript JSONL (`~/.claude/projects/<project>/<session-id>.jsonl`): message counts, token usage, cache read/write, dollar cost, context %, lines changed, a cost-per-turn sparkline, and a tool-call histogram. One bash call, no LLM analysis. Pass a session id to inspect a different session.

### /setup-cost-tracking (supporting)

One-time system-level setup for per-session cost capture. Wires bundled logger scripts into the Claude Code statusline and Stop hooks, **preserving any existing user configuration**. Idempotent and safe to re-run; additive only — backs up settings files before editing and records the original command for reversal. Run once per machine; the session stats dashboard then reads the captured cost.

### /commit (supporting)

One-shot conventional commit — bundled scripts (`gather.sh`/`commit.sh`) own all git inspection and mutation; the diff is adaptively curated in bash so the LLM drafts the message in a single pass. Zero-confirmation by default; `ask` argument enables draft confirmation and selective staging. Can be used at any stage of the pipeline.

## Pipeline entry points

- **Greenfield** → Phase 1 → 2 → 3 → 4 → 5
- **New feature in an existing system** → Phase 2 → 3 → 4 → 5 (skip requirements; brief is enough)
- **Bugfix (needs root-cause analysis)** → Phase 1 (as RCA) → 3 → 4 → 5 (skip architecture)
- **Trivial bugfix (known cause, doesn't touch the design, under ~half a day)** → Phase 3 → 4 → 5 (skip both requirements and architecture)

The QA gate (`/plan-qa` → `/execute-qa`) attaches to any scenario whose change has a running surface worth driving. Review and QA are independent gates — the developer chooses whether to run them sequentially or in parallel, and in what order.

## Install

```
/install-plugin foyzulkarim/skills dev-pipeline
```

## Output Conventions

- Requirements: `/specs/requirements/REQ-<N>-<slug>.md`, where `<N>` is the linked issue number
- Architecture (architecture-only, references its tasks via the `> **Tasks:**` header row): `/specs/architecture/ARCH-<N>-<slug>.md`
- Tasks: `/specs/tasks/TASKS-<N>-<slug>.md` (sibling of ARCH; shares the `<N>-<slug>` stem)
- Review reports: `/specs/reviews/CODE-REVIEW-*.md` (pipeline mode: `CODE-REVIEW-PIPELINE-<N>-<slug>.md`, derived from the ARCH filename)
- QA specifications: `/specs/qa/QA-<N>-<slug>.md` (no-issue fallbacks: `QA-<slug>.md`, `QA-PR-<number>.md`)
- QA results: `/specs/qa/QA-RESULTS-<N>-<slug>.md` (same stem as the plan, one appended section per run)
- Context files: `/specs/context/<identifier>.md`
- Branch naming: `{type}/{task-number}/{slug}`
- Both `REQ-*.md`/`ARCH-*.md` artifacts also carry a `> **Issue:** #N` metadata row in their header, so an artifact's owning issue is recoverable even if the filename alone is ambiguous.

**Breaking change in 5.0.0:** artifacts written by `plan-requirements` / `plan-architecture` are
now issue-prefixed (`REQ-<N>-<slug>.md` / `ARCH-<N>-<slug>.md`) when a task branch or linked
issue is in play. Existing `REQ-<slug>.md` / `ARCH-<slug>.md` files from before this release
keep working — both naming shapes are read indefinitely, and no migration is required. Work
with no linked issue (ad-hoc, greenfield) continues to produce the un-prefixed shape.
