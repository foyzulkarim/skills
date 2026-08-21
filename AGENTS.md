# AGENTS.md — foyzulkarim/skills

A Claude Code plugin marketplace with one plugin, `dev-pipeline` (a 5-phase software development pipeline). Full user-facing docs live in `README.md` and per-skill `SKILL.md` files; `CLAUDE.md` is the canonical in-repo reference. This file captures only the non-obvious, hard-earned facts an agent needs to avoid mistakes.

## Repo nature

- **No build system, test runner, or compiled code.** The repo is pure markdown instructions (`SKILL.md`) plus portable bash helper scripts. No `package.json`, `pyproject.toml`, or `Cargo.toml` exists.
- **Bash** helpers require only standard utilities: `git`, `jq`, `find`, `grep`, `awk`, `sed`. **Node.js** is needed *only* when running the `setup-cost-tracking` skill (its statusline scripts are JS).
- All docs and comments are in English.

## Developer commands

There is no build/lint/typecheck. The only verification steps are:

| Command | Purpose |
|---|---|
| `bash dev-pipeline/skills/<skill>/<script>.sh` | Run a bundled helper directly, e.g. `plan-architecture/file-tree.sh` |
| `scripts/sync-skills.sh push <skill>` | Copy a skill into `~/.claude/skills/` for live testing |

### Local testing workflow (`scripts/sync-skills.sh`)

Skills are tested by pushing them into `~/.claude/skills/`. Each pushed copy gets a `.synced-from` marker so the script only manages directories it created.

| Command | Purpose |
|---|---|
| `scripts/sync-skills.sh push` | Push all repo skills → `~/.claude/skills/` |
| `scripts/sync-skills.sh push <skill> …` | Push only named skills |
| `scripts/sync-skills.sh push --force <skill>` | Overwrite even an unmanaged (unmarked) directory at the target |
| `scripts/sync-skills.sh pull` | Pull all tracked skills back into the repo |
| `scripts/sync-skills.sh pull <skill> …` | Pull only named tracked skill(s) |
| `scripts/sync-skills.sh import <skill> …` | Import a non-tracked skill from `~/.claude/skills/` into the repo |
| `scripts/sync-skills.sh nuke` | Remove all marker-managed copies from `~/.claude/skills/` |
| `scripts/sync-skills.sh nuke --force <skill>` | Force-remove a skill even with no marker (danger) |
| `scripts/sync-skills.sh --target <dir> push ...` | Sync to `<dir>` instead of `~/.claude/skills/` (e.g. another agent's skills dir); must precede the command |
| `scripts/sync-skills.sh --to <harness> push ...` | Resolve `<harness>` via `scripts/sync-targets.json` (e.g. `oh-my-pi`, `opencode`) and push there; must precede the command. Requires `jq`. |
| `scripts/sync-skills.sh list-targets` | Print all configured harness aliases and their resolved directories |

The `--to <harness>` and `list-targets` paths read `scripts/sync-targets.json`, which maps harness aliases (e.g. `oh-my-pi` → `~/.omp/skills`) to skills dirs; `~` is expanded at resolve time.

## Pipeline artifacts on `master`

`specs/` files and `CODE-REVIEW-*.md` reports are *expected* to merge to `master` with their feature branch. `/archive-issue <issue#>` retires them to the GitHub wiki after the PR merges and the issue closes, reading them from `master` at that point — so deleting them pre-merge destroys the very content the skill exists to preserve. There is no CI gate enforcing this; archival is a manual step you run once the issue closes.

## Skill authoring conventions

These conventions differ from generic defaults and are enforced by the marketplace/plugin toolchain:

- Every skill lives at `dev-pipeline/skills/<skill-name>/SKILL.md` plus optional bundled scripts alongside it.
- **`SKILL.md` must start with YAML frontmatter**: `name`, `description` (one line for the marketplace UI), `model`, and optional `color`. The rest is a markdown body written as imperatives directed at the AI agent ("You are …", "Do …", "You must NOT …").
- Interactive skills define explicit conversation phases (A, B, C, …) and include a "You Must NOT" constraints section and a "Readiness Checklist"/"Gate" before artifact generation.
- Bundled scripts are referenced inside `SKILL.md` as `{base_directory}/script.sh` — the runtime injects the skill's directory; never hardcode absolute or repo-root paths.
- Bash scripts must start with `#!/usr/bin/env bash` and `set -euo pipefail`, and must resolve their own paths via `dirname`/relative paths. Scripts are read-only by default; any mutating script documents its side effects.

### Adding a new skill

1. Create `dev-pipeline/skills/<skill-name>/SKILL.md` (with frontmatter + body).
2. Add bundled helper scripts in the same directory.
3. **No `plugin.json` or `marketplace.json` registration is needed** — `plugin.json`'s `skills` field points to `./skills/`, which is auto-scanned.
4. Update `dev-pipeline/README.md` if user-facing.
5. Test locally: `scripts/sync-skills.sh push <skill-name>`.
6. Open a PR. Leave any `specs/` or `CODE-REVIEW-*.md` artifacts in place — they merge with the branch and get archived after the issue closes.

## Review sub-skills are NOT independently invocable

The 16 files under `dev-pipeline/skills/review/sub-skills/` are plain reference documents (`<check>.md`), **not** invocable skills. The `review` orchestrator dispatches them as parallel sub-agents; each reads the shared `_protocol.md` plus its check file and receives a filtered diff and tech-stack summary. `CLAUDE.md` is passed to every sub-agent when present; in pipeline mode the ARCH + REQ specs are passed too. The protocol defines the findings table and 2-level tracing; check files add domain criteria and severity calibration.

## Versioning — keep two files in sync

The plugin version lives in **two** places that must agree:

1. `dev-pipeline/.claude-plugin/plugin.json` → `version`
2. `.claude-plugin/marketplace.json` → `plugins[0].version`

Bump both together. Do not restate the current version in this file — read it from
`plugin.json`. This line previously carried a hardcoded copy and silently drifted a full
patch release behind, which is exactly the failure the "two places" rule exists to prevent.

## Commit convention

Conventional Commits: `feat:` (new skill/capability), `fix:`, `docs:`, `refactor:`, `chore:` (tooling/config), `test:` (script tests). The `commit` skill's `commit.sh` automatically excludes sensitive files (`.env`, `secret`, `credential`, `token`, `api-key`, `private-key`, `password`) from staging and never `--force`-pushes.

## Useful existing instruction files

- `CLAUDE.md` — the canonical in-repo reference; fuller prose on the pipeline, structure, and conventions. Read this first for high-level context.
- `README.md` — user-facing marketplace doc with the pipeline diagram, install commands, and the sync workflow reference.
- `dev-pipeline/skills/<skill>/SKILL.md` — each skill's behavior and conversation flow; the authoritative source for what a skill does.