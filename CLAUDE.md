# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code plugin marketplace (`foyzulkarim/skills`) containing the `dev-pipeline` plugin — a collection of six AI skills defining a structured development workflow. There is no build system, test runner, or compiled code. The entire value is in the SKILL.md files.

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

## The six skills and their pipeline order

```
/plan-project  →  /plan-feature  →  /generate-tasks  →  /tdd  →  /review  →  /commit
```

- **plan-project** — Strategic planning, outputs `/specs/plans/PROJECT-<slug>.md`
- **plan-feature** — Feature requirements via Socratic conversation, outputs `/specs/plans/PLAN-<slug>.md`
- **generate-tasks** — Embeds TDD-ready task specs into the existing `PLAN-*.md` file (does not create a new file)
- **tdd** — RED-GREEN-REFACTOR loop; two modes: collaborative (pauses each step) and auto
- **review** — Triage-first review with up to 14 checks; two modes: pipeline (verifies task completion) and general (PR/branch/staged)
- **commit** — Standalone; stages files, infers conventional commit type, extracts task number from branch name

## SKILL.md format

Each SKILL.md contains YAML frontmatter followed by markdown instructions for the skill agent. The frontmatter declares at minimum the skill name, description, and trigger conditions. The markdown body defines the agent's behavior, conversation flow, inputs, outputs, and constraints.

## Versioning

Version lives in two places — keep them in sync:
- `dev-pipeline/.claude-plugin/plugin.json` → `version`
- `.claude-plugin/marketplace.json` → `plugins[0].version`

## Contributing

Fork → edit skills under `dev-pipeline/skills/<name>/` → open PR. Commits follow conventional commit format (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
