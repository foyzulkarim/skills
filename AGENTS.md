# Agent Guide for foyzulkarim/skills

This repository is a **Claude Code plugin marketplace** containing the `dev-pipeline` plugin — a collection of AI "skills" that implement a structured 5-phase software development pipeline. The entire value of the repo lives in markdown instruction files (`SKILL.md`) and bundled bash helper scripts. There is no build system, no compiled code, and no language runtime dependency for the repo itself.

## Project Overview

- **Repository:** `foyzulkarim/skills`
- **Product:** Claude Code plugin marketplace with one plugin: `dev-pipeline`
- **Current version:** `3.0.0` (keep `dev-pipeline/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` in sync)
- **Language:** All documentation and comments are in English.

### The 5-Phase Pipeline

```
Phase 1              Phase 2              Phase 3            Phase 4      Phase 5
/plan-requirements → /plan-architecture → /generate-tasks → /tdd       → /review → /commit
   (user)            (user + Claude)       (Claude)          (Claude)     (user+C)   (support)
   REQ-*.md           ARCH-*.md            tasks in ARCH     code+tests   PR
```

- **plan-requirements** — Socratic interview producing `/specs/requirements/REQ-<slug>.md`
- **plan-architecture** — Collaborative system design producing `/specs/architecture/ARCH-<slug>.md`
- **generate-tasks** — Embeds TDD-ready task specs into `ARCH-*.md`
- **tdd** — RED-GREEN-REFACTOR implementation
- **review** — Triage-first code review with up to 16 domain-specific checks
- **start-task** (pre-pipeline) — One-shot branch bootstrap from GitHub issue, Jira, local spec, or ad-hoc brief
- **commit** (any phase) — One-shot conventional commit
- **session-stats** (any phase) — Terminal dashboard of current Claude Code session
- **setup-cost-tracking** (any phase) — Install per-session cost tracking

## Project Structure

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
    │   ├── SKILL.md                     ← skill instructions (YAML frontmatter + markdown body)
    │   ├── gather.sh                    ← bundled commit context script
    │   └── commit.sh                    ← bundled commit executor script
    ├── generate-tasks/SKILL.md
    ├── plan-architecture/SKILL.md
    │   ├── file-tree.sh
    │   └── search-codebase.sh
    ├── plan-requirements/SKILL.md
    ├── review/SKILL.md
    │   └── sub-skills/                  ← 16 review checks, dispatched by /review
    │       ├── accessibility/SKILL.md
    │       ├── async-patterns/SKILL.md
    │       ├── code-quality/SKILL.md
    │       ├── config-dependencies/SKILL.md
    │       ├── database-patterns/SKILL.md
    │       ├── documentation/SKILL.md
    │       ├── error-handling/SKILL.md
    │       ├── express-patterns/SKILL.md
    │       ├── migration/SKILL.md
    │       ├── performance/SKILL.md
    │       ├── react-patterns/SKILL.md
    │       ├── runtime-behavior/SKILL.md
    │       ├── security/SKILL.md
    │       ├── task-completion/SKILL.md
    │       ├── test-coverage/SKILL.md
    │       └── typescript-strictness/SKILL.md
    ├── session-stats/SKILL.md
    │   └── dashboard.sh
    ├── setup-cost-tracking/SKILL.md
    │   └── scripts/                     ← cost-logger.js, statusline-wrapper.js, etc.
    ├── start-task/SKILL.md
    │   └── gh-start-task.sh
    └── tdd/SKILL.md
scripts/
└── sync-skills.sh                       ← bidirectional sync with ~/.claude/skills/
```

## Technology Stack

- **No build system** — this repo contains no `package.json`, `pyproject.toml`, `Cargo.toml`, or equivalent.
- **Bash** — helper scripts are portable bash (macOS and Linux). They require standard utilities: `git`, `jq`, `find`, `grep`, `awk`, `sed`.
- **Node.js** — only required when running `setup-cost-tracking` (statusline scripts are JS).
- **Markdown + YAML frontmatter** — every `SKILL.md` has YAML frontmatter (`name`, `description`, `model`, `color`, etc.) followed by a long markdown body defining agent behavior.

## Build and Test Commands

There is no build step. The repo is pure documentation and scripts.

### Testing

- Run the doc-hygiene self-tests:
  ```bash
  bash .github/scripts/test-doc-hygiene.sh
  ```
- Test skills locally by pushing them into `~/.claude/skills/`:
  ```bash
  scripts/sync-skills.sh push <skill-name>
  ```
- Run a single skill script directly (e.g.):
  ```bash
  bash dev-pipeline/skills/plan-architecture/file-tree.sh
  bash dev-pipeline/skills/plan-architecture/search-codebase.sh --help
  ```

### Sync Workflow

The `scripts/sync-skills.sh` helper copies repo skills into `~/.claude/skills/` for live testing. Each copy gets a `.synced-from` marker so the script only touches directories it created.

| Command | Purpose |
|---------|---------|
| `scripts/sync-skills.sh push` | Push all repo skills → `~/.claude/skills/` |
| `scripts/sync-skills.sh push <skill> …` | Push only named skills |
| `scripts/sync-skills.sh pull` | Pull all tracked skills back into the repo |
| `scripts/sync-skills.sh import <skill> …` | Import a non-tracked skill from `~/.claude/skills/` into the repo |
| `scripts/sync-skills.sh nuke` | Remove all `.synced-from`-managed copies from `~/.claude/skills/` |
| `scripts/sync-skills.sh nuke --force <skill>` | Force-remove a skill even without marker (danger) |

## Code Style Guidelines

### SKILL.md Format

Every skill file must contain:

1. **YAML frontmatter** at the very top:
   ```yaml
   ---
   name: skill-name
   description: "One-line description for the marketplace UI"
   model: inherit
   color: orange   # optional UI hint
   ---
   ```
2. **Markdown body** defining the agent's behavior, conversation flow, inputs, outputs, constraints, and formatting rules.

### Skill Content Conventions

- Write instructions as imperatives directed at the AI agent ("You are a …", "Do …", "You must NOT …").
- Use ASCII diagrams sparingly and only when they clarify pipeline flow.
- Define explicit conversation phases (A, B, C, …) when the skill is interactive.
- Include a "You Must NOT" section for hard constraints.
- Include a "Readiness Checklist" or "Gate" section before artifact generation.
- Reference `{base_directory}` for bundled script paths — Claude Code injects the skill's directory at invocation time.
- Use today's date in generated artifacts.

### Script Conventions

- All bash scripts start with `#!/usr/bin/env bash` and `set -euo pipefail`.
- Scripts are read-only by default; any mutating script documents its side effects clearly.
- Helper scripts adjacent to a `SKILL.md` are "bundled" — referenced in the skill via `{base_directory}/script.sh`.
- Scripts must not hardcode the repo root; they use relative paths or `dirname "$0"` resolution.

### Commit Convention

Commits to this repo follow **Conventional Commits**:
- `feat:` — new skill or significant capability
- `fix:` — bug fix in a skill or script
- `docs:` — documentation changes
- `refactor:` — restructuring without behavior change
- `chore:` — tooling, config, dependency updates
- `test:` — adding or updating tests for scripts

## Testing Instructions

### Doc Hygiene CI

The `.github/workflows/doc-hygiene.yml` runs on every PR targeting `master`. It blocks branch-only artifacts:

- Any file under `specs/` (requirements, architecture, context files generated during pipeline use)
- Any file matching `CODE-REVIEW-*.md` (generated review reports)

These files are expected on feature branches but must not merge to `master`.

### Review Sub-Skills

The 16 review checks under `dev-pipeline/skills/review/sub-skills/` are **not independently invocable**. They are dispatched by the `review` orchestrator via parallel Agent tool calls. Each sub-skill receives:

- A filtered diff (only files relevant to its domain)
- Tech stack summary
- Severity scale
- `CLAUDE.md` content (if present)
- Pipeline mode only: ARCH + REQ content

Sub-skills must output findings in a standardized table format and include a coverage checklist.

## Security Considerations

- **No secrets in the repo** — there are no API keys, tokens, or credentials committed.
- **Sensitive file exclusion** — the `commit` skill's `commit.sh` automatically excludes files matching patterns like `.env`, `secret`, `credential`, `token`, `api-key`, `private-key`, `password` from staging.
- **Script safety** — helper scripts validate inputs, refuse to operate on dirty working trees, and never use `--force` on git pushes.
- **Path traversal prevention** — `start-task` rejects local spec paths containing `..`.
- **Cost-tracking scripts** are additive only — they preserve existing user statusline and hooks, back up settings files before editing, and record the original command for reversal.

## Deployment / Distribution

This repo is distributed as a **Claude Code plugin**, not a deployed service.

- Users install via: `/install-plugin foyzulkarim/skills dev-pipeline`
- The marketplace registry is `.claude-plugin/marketplace.json`
- The plugin manifest is `dev-pipeline/.claude-plugin/plugin.json`
- The `skills` field in `plugin.json` points to `./skills/` — the directory is auto-scanned. **No per-skill registration is required** when adding a new skill.

## Versioning

Version lives in two places — keep them in sync:
1. `dev-pipeline/.claude-plugin/plugin.json` → `version`
2. `.claude-plugin/marketplace.json` → `plugins[0].version`

## How to Add a New Skill

1. Create `dev-pipeline/skills/<skill-name>/SKILL.md`
2. Add any bundled helper scripts in `dev-pipeline/skills/<skill-name>/scripts/`
3. Update `dev-pipeline/README.md` if the skill is user-facing
4. No changes to `plugin.json` are needed (auto-scan)
5. Test locally: `scripts/sync-skills.sh push <skill-name>`
6. Open a PR. Ensure `test-doc-hygiene.sh` passes and no `specs/` or `CODE-REVIEW-*.md` files are present.

## Artifact Paths (generated during pipeline use)

These paths are conventions used by the skills when running inside a **user's project** (not this repo):

- `/specs/requirements/REQ-<slug>.md` — produced by `plan-requirements`
- `/specs/architecture/ARCH-<slug>.md` — produced by `plan-architecture`; tasks embedded by `generate-tasks`
- `/specs/context/<identifier>.md` — produced by `start-task`
- `CODE-REVIEW-*.md` — produced by `review` (general mode)

**Important:** These artifacts must never be committed to `master` of this repo. The doc-hygiene CI enforces this.
