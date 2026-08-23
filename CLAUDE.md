# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code plugin marketplace (`foyzulkarim/skills`) containing the `dev-pipeline` plugin — a collection of AI skills implementing a structured **5-phase development pipeline with an optional QA gate that runs independently of review**.

- **Current version:** see `dev-pipeline/.claude-plugin/plugin.json` — never restate it here.
- **Language:** All documentation and comments are in English.
- **No build system, test runner, or compiled code.** The entire value is in the `SKILL.md` files and bundled bash helper scripts.

### The 5-Phase Pipeline + QA Gate

1. **Requirement Engineering** — capture WHAT and WHY (problem space)
2. **System Architecture** — design HOW (solution space)
3. **Task Generation** — break architecture into verification-ready tasks
4. **Implementation** — mode-appropriate verification per task (tdd, test-after, ui, checklist)
5. **Review** — verify the code before merge

After Phase 4, two **independent merge gates** may run in parallel:

- **Review** (Phase 5) — reads the code
- **QA gate** (when applicable) — `/plan-qa` then `/execute-qa` drives the running product

The QA gate is skipped when the change has no running surface worth driving (docs, script refactors). It is not a numbered phase and does not run in sequence with Phase 5.

## Plugin structure

```
.claude-plugin/marketplace.json          ← marketplace registry (lists plugins)
dev-pipeline/
├── .claude-plugin/plugin.json           ← plugin identity and skills root
├── README.md                            ← plugin-level documentation
├── rules/                               ← domain-specific review rules
│   ├── api.md
│   ├── api-test.md
│   ├── database.md
│   ├── database-test.md
│   ├── service.md
│   └── service-test.md
├── scripts/                             ← shared helper scripts
│   ├── file-tree.sh                     ← project structure + tech stack detection
│   └── search-codebase.sh               ← keyword search for brownfield design
└── skills/
    ├── archive-issue/SKILL.md
    ├── commit/
    │   ├── SKILL.md
    │   ├── gather.sh
    │   └── commit.sh
    ├── execute-qa/
    │   ├── SKILL.md
    │   └── artifact-template.md
    ├── finish-worktree/
    │   ├── SKILL.md
    │   └── finish-worktree.sh
    ├── generate-tasks/SKILL.md
    ├── move-to-worktree/
    │   ├── SKILL.md
    │   └── move-to-worktree.sh
    ├── plan-architecture/SKILL.md
    │   ├── file-tree.sh
    │   └── search-codebase.sh
    ├── plan-qa/
    │   ├── SKILL.md
    │   └── artifact-template.md
    ├── plan-requirements/SKILL.md
    ├── release-notes/SKILL.md
    ├── sync-skills/SKILL.md
    ├── review/SKILL.md
    │   ├── sub-skills/                  ← 17 review check files + _protocol.md, dispatched by /review
    │   └── report-template.md
    ├── session-stats/SKILL.md
    │   └── dashboard.sh
    ├── setup-cost-tracking/SKILL.md
    │   └── scripts/
    ├── start-task/SKILL.md
    │   └── gh-start-task.sh
    └── implement/SKILL.md
        └── modes/                       ← tdd, test-after, ui, checklist
```

When adding a new skill:
1. Create `dev-pipeline/skills/<skill-name>/SKILL.md`
2. Add any bundled helper scripts in `dev-pipeline/skills/<skill-name>/scripts/`
3. Update `dev-pipeline/README.md` if the skill is user-facing
4. The `skills` field in `plugin.json` points to `./skills/` — the directory is auto-scanned, no per-skill registration needed
5. Test locally: `scripts/sync-skills.sh push <skill-name>`

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
  │  /commit → conventional commit (use at any stage)          │
  └────────────────────────────────────────────────────────────┘
```

### Phase skills

- **plan-requirements** (Phase 1) — Socratic interview to capture WHAT and WHY. Outputs `/specs/requirements/REQ-<N>-<slug>.md` (or `REQ-<slug>.md` with no linked issue). Owner: developer.
- **plan-architecture** (Phase 2) — Collaborative system design. Reads REQ when present, runs from a brief otherwise. Bundled scripts (`file-tree.sh`, `search-codebase.sh`) detect project structure and tech stack. Outputs `/specs/architecture/ARCH-<N>-<slug>.md` (or `ARCH-<slug>.md` with no linked issue), architecture-only; the task specs are emitted separately by generate-tasks as `TASKS-<N>-<slug>.md`.
- **generate-tasks** (Phase 3) — Reads ARCH (and the linked REQ) and emits verification-ready task specs as `TASKS-<N>-<slug>.md` alongside ARCH, each with a verification mode (tdd, test-after, ui, or checklist) and a matching verification plan. ARCH's `> **Tasks:**` header row names the file.
- **implement** (Phase 4) — Implements tasks from `TASKS-<N>-<slug>.md` (with ARCH for context), routing each to its verification mode (bundled `modes/*.md`, loaded per task): tdd (RED-GREEN-REFACTOR), test-after (increment then cover), ui (evidence-backed human checklist), checklist (command outcomes). Collaborative by default; `auto` runs one task or the whole plan behind a single approval gate, with one task-scoped commit per task.
- **review** (Phase 5) — Triage-first review with up to 17 domain-specific checks. Two modes: pipeline (verifies task implementation against ARCH/REQ, including each task's verification-mode evidence) and general (PR/branch/staged). Checks are plain reference files (`sub-skills/<check>.md`, **not independently invocable skills**) dispatched via parallel Agent tool calls; each agent reads the shared `sub-skills/_protocol.md` (role, false-positive rules, tracing protocol, output format) plus its check file, and receives a filtered diff, tech stack summary, `CLAUDE.md` content, and (pipeline mode) ARCH + REQ content.
- **plan-qa** (post-implementation QA gate, independent of review) — QA planning. The developer chooses whether to run it before, alongside, or after `/review`. Interviews the developer (walk the artifacts → mine the developer → confirm) to turn the specs and the diff into an executable QA specification: cases with tagged steps (`[bash]`/`[browser]`), `Guard:`-codified project traps, a Coverage Map over every changed file, identities, preconditions (P0 = automated suite), and named operator handoffs. Every Expected line is falsifiable — `[assert]` (machine-verifiable) or `[judge]` with an explicit pass/fail criterion fixed at plan time. Outputs `/specs/qa/QA-<N>-<slug>.md`. Declaration skill: nothing project-specific is baked in; scenario types are open-ended (browser + shell today; storybook, performance, accessibility later). Skip when the change has no running surface worth driving.
- **execute-qa** (post-implementation QA gate, independent of review) — Executes a QA specification as written: preconditions first (red P0 = no run), cases in order with their tagged drivers and guards, verbatim operator handoffs. `[assert]` lines verify mechanically; `[judge]` lines are judged only against the plan's written criterion, with evidence quoted and ambiguity escalating to PARTIAL — never a guessed PASS. Writes verdicts (PASS / PASS (judged) / FAIL / PARTIAL / SKIPPED) and findings to `/specs/qa/QA-RESULTS-<N>-<slug>.md`, appending one section per run; never modifies the plan.

### Supporting skills (non-phase)

- **start-task** — Pre-pipeline bootstrap, zero-confirmation by default. Detects the task source from the args (GitHub issue number, Jira key, local spec path, or ad-hoc), fetches the task, derives `{type}/{number}/{slug}`, then a bundled script (`gh-start-task.sh`, GitHub path) or manual git steps sync main, create and push the branch, and write `specs/context/<id>.md`. Rejects local spec paths containing `..` to prevent path traversal.
- **sync-skills** — Natural-language wrapper over `scripts/sync-skills.sh`. The user names a harness ("copy the skills to oh-my-pi"); the skill resolves it to a skills directory via `scripts/sync-targets.json` and runs the sync. Maps canonical aliases (`claude`, `oh-my-pi`, `opencode`) directly; unknown aliases probe conventional paths, confirm with the user, and offer to persist the mapping. Use only when the user asks to copy/sync/push the skills to another harness — never trigger automatically.
- **commit** — Standalone one-shot conventional commit. Bundled scripts (`gather.sh`/`commit.sh`) own all git inspection and mutation; the diff is adaptively curated in bash so the LLM drafts the message in a single pass. Zero-confirmation by default; `ask` argument enables draft confirmation and selective staging. Automatically excludes files matching sensitive patterns (`.env`, `secret`, `credential`, `token`, `api-key`, `private-key`, `password`) from staging, and unstages embedded git repositories (a nested `.worktrees/<N>` or stray clone that `git add -A` would commit as a `160000` gitlink) while preserving `.gitmodules`-registered submodules.
- **session-stats** — Terminal dashboard of the current session. A bundled script (`dashboard.sh`) locates the transcript JSONL via `CLAUDE_CODE_SESSION_ID`, aggregates tokens/cost/tools with `jq`, and prints cards; the LLM only relays the output verbatim.
- **setup-cost-tracking** — One-time system-level setup for per-session cost capture. Wires logger scripts into the Claude Code statusline and Stop hooks, **preserving any existing user configuration**. Idempotent; safe to re-run. Additive only — backs up settings files before editing and records the original command for reversal.
- **move-to-worktree** — Parks the current clean, pushed feature branch in `.worktrees/<issue#>` and returns the primary checkout to the default branch, for parallel Phase 4 lanes. Git only — no dependency install, no port allocation; a bundled script (`move-to-worktree.sh`) owns all mutation. Requires `.worktrees/` to be gitignored in the target repo and hard-stops otherwise, since a nested worktree that git can see gets committed as an embedded gitlink.
- **finish-worktree** — Teardown counterpart, run after the issue's PR has squash-merged and the issue has closed. Verifies the merge via `gh` (PR merged, tip matches, issue closed, remote branch gone), then removes the worktree and deletes the local branch. A bundled script (`finish-worktree.sh`) owns all mutation.
- **archive-issue** — Retires a closed issue's `specs/` artifacts into the GitHub wiki. Resolves everything from the issue number via `gh issue view` and the artifact naming contract (no script — this is markdown authoring). Wiki push requires explicit confirmation.
- **release-notes** — Drafts a `CHANGELOG.md` entry from commits since the last git tag; suggests the next semver version from that tag, never from a project manifest.

### Pipeline entry points (three scenarios)

- **Greenfield** — Phase 1 → 2 → 3 → 4 → 5
- **New feature** in an existing system — Phase 2 → 3 → 4 → 5 (skip requirements; brief is enough)
- **Bugfix** — Phase 1 (as RCA) → 3 → 4 → 5 (skip architecture)

The QA gate (`/plan-qa` → `/execute-qa`) attaches to any scenario whose change has a running surface worth driving. Review and QA are independent gates — the developer chooses whether to run them sequentially or in parallel, and in what order.

### Artifact paths

- `/specs/requirements/REQ-<N>-<slug>.md` — produced by plan-requirements; `<N>` is the linked issue number, omitted (along with the `Issue:` row) when there is none
- `/specs/architecture/ARCH-<N>-<slug>.md` — produced by plan-architecture; architecture-only (no `# Tasks` section). Declares the matching tasks file in its header
- `/specs/tasks/TASKS-<N>-<slug>.md` — produced by generate-tasks; sibling of ARCH, shares the `<N>-<slug>` stem
- `/specs/context/<identifier>.md` — produced by start-task
- `/specs/reviews/CODE-REVIEW-*.md` — produced by review; pipeline mode saves as `CODE-REVIEW-PIPELINE-<N>-<slug>.md` (derived from the ARCH filename), general mode as `CODE-REVIEW-{PR,BRANCH,STAGED,DIFF}-*.md`
- `/specs/qa/QA-<N>-<slug>.md` — produced by plan-qa; the executable QA specification (no-issue fallbacks: `QA-<slug>.md`, `QA-PR-<number>.md`)
- `/specs/qa/QA-RESULTS-<N>-<slug>.md` — produced by execute-qa; same stem as the plan with a `RESULTS` infix, one appended section per run — results never go into the plan file
- Existing `REQ-<slug>.md` / `ARCH-<slug>.md` files from before 5.0.0 keep working — both naming shapes are read indefinitely, no migration required. Pre-split ARCH docs with embedded `# Tasks` also keep working (implement's legacy detection falls back to the embedded section; run `/generate-tasks` to migrate)

**Important:** These artifacts merge to `master` with their feature branch and are retired to the GitHub wiki afterwards, once the PR has merged and the issue has closed — run `/archive-issue <issue#>` then.

## SKILL.md format

Each SKILL.md contains YAML frontmatter followed by markdown instructions for the skill agent.

### Required YAML frontmatter

```yaml
---
name: skill-name
description: "One-line description for the marketplace UI"
model: inherit
color: orange   # optional UI hint
---
```

### Content conventions

- Write instructions as imperatives directed at the AI agent ("You are a …", "Do …", "You must NOT …").
- Use ASCII diagrams sparingly and only when they clarify pipeline flow.
- Define explicit conversation phases (A, B, C, …) when the skill is interactive.
- Include a "You Must NOT" section for hard constraints.
- Include a "Readiness Checklist" or "Gate" section before artifact generation.
- Reference `{base_directory}` for bundled script paths — Claude Code injects the skill's directory at invocation time.
- Use today's date in generated artifacts.

## Versioning

Version lives in two places — keep them in sync:
- `dev-pipeline/.claude-plugin/plugin.json` → `version`
- `.claude-plugin/marketplace.json` → `plugins[0].version`

## Local development

Edit skills under `dev-pipeline/skills/<name>/`. See `docs/skill-refactor-guide.md` for the token-efficiency refactor playbook used for prior skill slimming work.

### Commit convention

Commits follow **Conventional Commits**:
- `feat:` — new skill or significant capability
- `fix:` — bug fix in a skill or script
- `docs:` — documentation changes
- `refactor:` — restructuring without behavior change
- `chore:` — tooling, config, dependency updates
- `test:` — adding or updating tests for scripts

### Pull request requirements

- Leave `specs/` artifacts in place — they merge with the branch and get archived after. There is no pre-PR hygiene gate; retire them with `/archive-issue <issue#>` once the PR merges and the issue closes.
- Test skills locally:
  ```bash
  scripts/sync-skills.sh push <skill-name>
  ```

## Technology stack

- **No build system** — this repo contains no `package.json`, `pyproject.toml`, `Cargo.toml`, or equivalent.
- **Bash** — helper scripts are portable bash (macOS and Linux). They require standard utilities: `git`, `jq`, `find`, `grep`, `awk`, `sed`.
- **git ≥ 2.22** — `move-to-worktree` and `finish-worktree` use `git branch --show-current` (2.22) and `git worktree remove` (2.17). `gh` is additionally required by `finish-worktree`, `archive-issue`, and `start-task`'s GitHub path.
- **Node.js** — only required when running `setup-cost-tracking` (statusline scripts are JS).
- **Markdown + YAML frontmatter** — every `SKILL.md` has YAML frontmatter followed by a long markdown body defining agent behavior.

## Testing

### Sync workflow

The `scripts/sync-skills.sh` helper copies repo skills into `~/.claude/skills/` for live testing. Each copy gets a `.synced-from` marker so the script only touches directories it created.

| Command | Purpose |
|---------|---------|
| `scripts/sync-skills.sh push` | Push all repo skills → `~/.claude/skills/` |
| `scripts/sync-skills.sh push <skill> …` | Push only named skills |
| `scripts/sync-skills.sh pull` | Pull all tracked skills back into the repo |
| `scripts/sync-skills.sh import <skill> …` | Import a non-tracked skill from `~/.claude/skills/` into the repo |
| `scripts/sync-skills.sh nuke` | Remove all `.synced-from`-managed copies from `~/.claude/skills/` |
| `scripts/sync-skills.sh nuke --force <skill>` | Force-remove a skill even without marker (danger) |
| `scripts/sync-skills.sh --target <dir> push ...` | Sync to `<dir>` instead of `~/.claude/skills` (e.g. another agent's skills directory); must precede the command |
| `scripts/sync-skills.sh --to <harness> push ...` | Resolve a harness alias (from `scripts/sync-targets.json`) to its skills dir, then push; must precede the command |
| `scripts/sync-skills.sh list-targets` | Print harness aliases from `scripts/sync-targets.json` and their resolved dirs |
| `scripts/sync-skills.sh push --force <skill>` | Overwrite even an unmanaged (unmarked) directory at the target |

**Harness targets:** `scripts/sync-targets.json` maps harness aliases → skills dirs (`~` allowed). The `/sync-skills` skill turns natural-language requests like "copy the skills to oh-my-pi" into the right `--to` invocation, and on an unmapped harness probes conventional paths, confirms, and offers to add the mapping.

### Running skill scripts directly

```bash
bash dev-pipeline/skills/plan-architecture/file-tree.sh
bash dev-pipeline/skills/plan-architecture/search-codebase.sh --help
```

## Security considerations

- **No secrets in the repo** — there are no API keys, tokens, or credentials committed.
- **Sensitive file exclusion** — the `commit` skill's `commit.sh` automatically excludes files matching patterns like `.env`, `secret`, `credential`, `token`, `api-key`, `private-key`, `password` from staging.
- **Script safety** — helper scripts validate inputs, refuse to operate on dirty working trees, and never use `--force` on git pushes.
- **Path traversal prevention** — `start-task` rejects local spec paths containing `..`.
- **Cost-tracking scripts** are additive only — they preserve existing user statusline and hooks, back up settings files before editing, and record the original command for reversal.

## Distribution

This repo is distributed as a **Claude Code plugin**, not a deployed service.

- Users install via: `/install-plugin foyzulkarim/skills dev-pipeline`
- The marketplace registry is `.claude-plugin/marketplace.json`
- The plugin manifest is `dev-pipeline/.claude-plugin/plugin.json`
- The `skills` field in `plugin.json` points to `./skills/` — the directory is auto-scanned. **No per-skill registration is required** when adding a new skill.
