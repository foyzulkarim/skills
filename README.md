# foyzulkarim/skills — Claude Code Plugin Marketplace

A plugin marketplace for [Claude Code](https://claude.ai/claude-code) with a structured 5-phase development pipeline.

## Add this marketplace

```
/add-marketplace foyzulkarim/skills
```

## dev-pipeline

A complete development workflow built on a 5-phase agentic framework:

```
Phase 1              Phase 2              Phase 3            Phase 4      Phase 5
/plan-requirements → /plan-architecture → /generate-tasks → /tdd       → /review → /commit
   (you)              (you + Claude)       (Claude)          (Claude)     (you+C)   (support)
   REQ-*.md           ARCH-*.md            tasks in ARCH     code+tests   PR

/start-task → sync main, create branch, gather context  (opt-in, pre-Phase-1)
/commit → conventional commit  (use at any stage)
```

| Skill | Phase | Description |
|-------|-------|-------------|
| [/plan-requirements](./dev-pipeline/skills/plan-requirements) | 1 | Capture WHAT and WHY — Socratic interview producing `REQ-*.md`. Owner: developer. |
| [/plan-architecture](./dev-pipeline/skills/plan-architecture) | 2 | Design HOW — collaborative system design producing `ARCH-*.md`. |
| [/generate-tasks](./dev-pipeline/skills/generate-tasks) | 3 | Embed TDD-ready task specs into `ARCH-*.md`. |
| [/tdd](./dev-pipeline/skills/tdd) | 4 | RED-GREEN-REFACTOR, one test at a time. Collaborative or autonomous. |
| [/review](./dev-pipeline/skills/review) | 5 | Triage-first code review — up to 16 checks, pipeline or general mode. |
| [/start-task](./dev-pipeline/skills/start-task) | pre-1 | Sync main, gather task context, create and push a feature branch. |
| [/commit](./dev-pipeline/skills/commit) | any | Standalone conventional commit assistant. |

### Pipeline entry points

- **Greenfield** → Phase 1 → 2 → 3 → 4 → 5
- **New feature in an existing system** → Phase 2 → 3 → 4 → 5 (skip requirements; brief is enough)
- **Bugfix** → Phase 1 (as RCA) → 3 → 4 → 5 (skip architecture)

### Install

```
/install-plugin foyzulkarim/skills dev-pipeline
```

## Plugin structure

```
dev-pipeline/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── plan-requirements/
│   ├── plan-architecture/
│   ├── generate-tasks/
│   ├── tdd/
│   ├── review/
│   ├── commit/
│   ├── start-task/
│   ├── create-worktrees/
│   ├── code-quality-review/
│   ├── performance-review/
│   ├── rules-check/
│   └── security-review/
└── README.md
```

## Contribute

1. Fork this repo
2. Add or modify skills under `dev-pipeline/skills/<skill-name>/`
3. The `skills` field in `plugin.json` points to `./skills/` — the directory is auto-scanned, no per-skill registration needed
4. Open a pull request
