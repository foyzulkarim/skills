# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code plugin marketplace (`foyzulkarim/skills`) containing the `dev-pipeline` plugin — a collection of AI skills implementing a structured **5-phase development pipeline**.

- **Current version:** `3.0.0`
- **Language:** All documentation and comments are in English.
- **No build system, test runner, or compiled code.** The entire value is in the `SKILL.md` files and bundled bash helper scripts.

### The 5-Phase Pipeline

1. **Requirement Engineering** — capture WHAT and WHY (problem space)
2. **System Architecture** — design HOW (solution space)
3. **Task Generation** — break architecture into TDD-ready tasks
4. **TDD Implementation** — RED-GREEN-REFACTOR per task
5. **Review & Merge** — verify before merge

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
    ├── commit/
    │   ├── SKILL.md
    │   ├── gather.sh
    │   └── commit.sh
    ├── generate-tasks/SKILL.md
    ├── plan-architecture/SKILL.md
    │   ├── file-tree.sh
    │   └── search-codebase.sh
    ├── plan-requirements/SKILL.md
    ├── review/SKILL.md
    │   └── sub-skills/                  ← 16 review checks, dispatched by /review
    ├── session-stats/SKILL.md
    │   └── dashboard.sh
    ├── setup-cost-tracking/SKILL.md
    │   └── scripts/
    ├── start-task/SKILL.md
    │   └── gh-start-task.sh
    └── tdd/SKILL.md
```

When adding a new skill:
1. Create `dev-pipeline/skills/<skill-name>/SKILL.md`
2. Add any bundled helper scripts in `dev-pipeline/skills/<skill-name>/scripts/`
3. Update `dev-pipeline/README.md` if the skill is user-facing
4. The `skills` field in `plugin.json` points to `./skills/` — the directory is auto-scanned, no per-skill registration needed
5. Test locally: `scripts/sync-skills.sh push <skill-name>`

## The pipeline

```
Phase 1              Phase 2              Phase 3            Phase 4      Phase 5
/plan-requirements → /plan-architecture → /generate-tasks → /tdd       → /review → /commit
   (you)              (you + Claude)       (Claude)          (Claude)     (you+C)   (support)
   REQ-*.md           ARCH-*.md            tasks in ARCH     code+tests   PR
```

### Phase skills

- **plan-requirements** (Phase 1) — Socratic interview to capture WHAT and WHY. Outputs `/specs/requirements/REQ-<slug>.md`. Owner: developer.
- **plan-architecture** (Phase 2) — Collaborative system design. Reads REQ when present, runs from a brief otherwise. Bundled scripts (`file-tree.sh`, `search-codebase.sh`) detect project structure and tech stack. Outputs `/specs/architecture/ARCH-<slug>.md` (with an empty Tasks section).
- **generate-tasks** (Phase 3) — Reads ARCH (and the linked REQ) and embeds TDD-ready task specs into `ARCH-*.md`'s Tasks section. Does not create a new file.
- **tdd** (Phase 4) — RED-GREEN-REFACTOR loop driven from `ARCH-*.md`. Two modes: collaborative (pauses each step) and auto.
- **review** (Phase 5) — Triage-first review with up to 16 domain-specific checks. Two modes: pipeline (verifies task implementation against ARCH/REQ) and general (PR/branch/staged). The 16 sub-skills are dispatched via parallel Agent tool calls; each receives a filtered diff, tech stack summary, severity scale, `CLAUDE.md` content, and (in pipeline mode) ARCH + REQ content. Sub-skills output findings in a standardized table format with a coverage checklist. They are **not independently invocable**.

### Supporting skills (non-phase)

- **start-task** — Pre-pipeline bootstrap, zero-confirmation by default. Detects the task source from the args (GitHub issue number, Jira key, local spec path, or ad-hoc), fetches the task, derives `{type}/{number}/{slug}`, then a bundled script (`gh-start-task.sh`, GitHub path) or manual git steps sync main, create and push the branch, and write `specs/context/<id>.md`. Rejects local spec paths containing `..` to prevent path traversal.
- **commit** — Standalone one-shot conventional commit. Bundled scripts (`gather.sh`/`commit.sh`) own all git inspection and mutation; the diff is adaptively curated in bash so the LLM drafts the message in a single pass. Zero-confirmation by default; `ask` argument enables draft confirmation and selective staging. Automatically excludes files matching sensitive patterns (`.env`, `secret`, `credential`, `token`, `api-key`, `private-key`, `password`) from staging.
- **session-stats** — Terminal dashboard of the current session. A bundled script (`dashboard.sh`) locates the transcript JSONL via `CLAUDE_CODE_SESSION_ID`, aggregates tokens/cost/tools with `jq`, and prints cards; the LLM only relays the output verbatim.
- **setup-cost-tracking** — One-time system-level setup for per-session cost capture. Wires logger scripts into the Claude Code statusline and Stop hooks, **preserving any existing user configuration**. Idempotent; safe to re-run. Additive only — backs up settings files before editing and records the original command for reversal.

### Pipeline entry points (three scenarios)

- **Greenfield** — Phase 1 → 2 → 3 → 4 → 5
- **New feature** in an existing system — Phase 2 → 3 → 4 → 5 (skip requirements; brief is enough)
- **Bugfix** — Phase 1 (as RCA) → 3 → 4 → 5 (skip architecture)

### Artifact paths

- `/specs/requirements/REQ-<slug>.md` — produced by plan-requirements
- `/specs/architecture/ARCH-<slug>.md` — produced by plan-architecture; tasks embedded in-place by generate-tasks
- `/specs/context/<identifier>.md` — produced by start-task
- `CODE-REVIEW-*.md` — produced by review (general mode)

**Important:** These artifacts must never be committed to `master` of this repo. The doc-hygiene CI enforces this.

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

## Contributing

Fork → edit skills under `dev-pipeline/skills/<name>/` → open PR.

### Commit convention

Commits follow **Conventional Commits**:
- `feat:` — new skill or significant capability
- `fix:` — bug fix in a skill or script
- `docs:` — documentation changes
- `refactor:` — restructuring without behavior change
- `chore:` — tooling, config, dependency updates
- `test:` — adding or updating tests for scripts

### Pull request requirements

- Run the doc-hygiene self-test before opening a PR:
  ```bash
  bash .github/scripts/test-doc-hygiene.sh
  ```
- Ensure no `specs/` or `CODE-REVIEW-*.md` files are present in the branch (these are pipeline artifacts meant for feature branches only).
- Test skills locally:
  ```bash
  scripts/sync-skills.sh push <skill-name>
  ```

## Technology stack

- **No build system** — this repo contains no `package.json`, `pyproject.toml`, `Cargo.toml`, or equivalent.
- **Bash** — helper scripts are portable bash (macOS and Linux). They require standard utilities: `git`, `jq`, `find`, `grep`, `awk`, `sed`.
- **Node.js** — only required when running `setup-cost-tracking` (statusline scripts are JS).
- **Markdown + YAML frontmatter** — every `SKILL.md` has YAML frontmatter followed by a long markdown body defining agent behavior.

## Testing

### Doc hygiene CI

The `.github/workflows/doc-hygiene.yml` runs on every PR targeting `master`. It blocks branch-only artifacts:
- Any file under `specs/` (requirements, architecture, context files generated during pipeline use)
- Any file matching `CODE-REVIEW-*.md` (generated review reports)

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
