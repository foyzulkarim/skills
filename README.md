# foyzulkarim/skills — Claude Code Plugin Marketplace

A plugin marketplace for [Claude Code](https://claude.ai/claude-code) with a structured 5-phase development pipeline.

## Add this marketplace

```
/add-marketplace foyzulkarim/skills
```

## dev-pipeline

A complete development workflow built on a 5-phase agentic framework:

```
  ┌────────────────────────────────────────────────────────────┐
  │  Pre: /start-task → issue → branch + context  (opt-in)     │
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
  │  Phase 4     /implement                                    │
  │  Output: code + verification evidence                      │
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

| Skill | Phase | Description |
|-------|-------|-------------|
| [/plan-requirements](./dev-pipeline/skills/plan-requirements) | 1 | Capture WHAT and WHY — Socratic interview producing `REQ-*.md`. Owner: developer. |
| [/plan-architecture](./dev-pipeline/skills/plan-architecture) | 2 | Design HOW — collaborative system design producing `ARCH-*.md`. |
| [/generate-tasks](./dev-pipeline/skills/generate-tasks) | 3 | Embed verification-ready task specs into `ARCH-*.md`, each with a verification mode. |
| [/implement](./dev-pipeline/skills/implement) | 4 | Mode-routed implementation — tdd, test-after, ui, or checklist per task. Collaborative or autonomous, one commit per task. |
| [/review](./dev-pipeline/skills/review) | 5 | Triage-first code review — up to 16 checks, pipeline or general mode. |
| [/start-task](./dev-pipeline/skills/start-task) | pre-1 | One-shot branch bootstrap from a GitHub issue, Jira key, local spec, or ad-hoc brief — zero confirmation by default. |
| [/commit](./dev-pipeline/skills/commit) | any | One-shot conventional commit — script-curated context, zero confirmation by default, `ask` mode for review/selective staging. |
| [/session-stats](./dev-pipeline/skills/session-stats) | any | Terminal dashboard of the current session — tokens, cache, cost, context %, tool-call histogram. |
| [/setup-cost-tracking](./dev-pipeline/skills/setup-cost-tracking) | any | Install per-session cost tracking by wiring logger scripts into the Claude Code statusline and hooks. |

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
│   ├── implement/
│   │   └── modes/             # tdd, test-after, ui, checklist
│   ├── review/
│   │   └── sub-skills/        # 16 review check files + shared _protocol.md, dispatched by /review
│   ├── commit/
│   ├── session-stats/
│   ├── setup-cost-tracking/
│   └── start-task/
└── README.md
```

## Contribute

1. Fork this repo
2. Add or modify skills under `dev-pipeline/skills/<skill-name>/`
3. The `skills` field in `plugin.json` points to `./skills/` — the directory is auto-scanned, no per-skill registration needed
4. Open a pull request

### Test skills locally

`scripts/sync-skills.sh` is a bidirectional sync helper that copies repo skills into `~/.claude/skills/` for live testing, and can pull changes back.

Each copy gets a `.synced-from` marker so the script only touches directories it created, never your real personal skills.

| Command | What it does |
|---|---|
| `scripts/sync-skills.sh push` | Push **all** repo skills → `~/.claude/skills/` (creates or refreshes `.synced-from` marker) |
| `scripts/sync-skills.sh push <skill> …` | Push only named skills |
| `scripts/sync-skills.sh pull` | Pull **all tracked** skills back from `~/.claude/skills/` into the repo (strips marker) |
| `scripts/sync-skills.sh pull <skill> …` | Pull only named tracked skill(s) back |
| `scripts/sync-skills.sh import <skill> …` | Import a **non-tracked** skill from `~/.claude/skills/` into the repo (names required) |
| `scripts/sync-skills.sh nuke` | Remove **only** the `.synced-from`-managed copies from `~/.claude/skills/` |
| `scripts/sync-skills.sh nuke --force <skill>` | Force-remove a skill from target even if it has no marker (DANGER) |
| `scripts/sync-skills.sh --target <dir> push ...` | Sync to `<dir>` instead of `~/.claude/skills/` (e.g. another agent's skills directory); must precede the command |
| `scripts/sync-skills.sh push --force <skill>` | Overwrite even an unmanaged (unmarked) directory at the target |

**Typical workflow:**
```bash
# Push a WIP skill to test it live
scripts/sync-skills.sh push commit
# ...edit commit in ~/.claude/skills/commit/ during a real session...
# Pull the changes back into the repo
scripts/sync-skills.sh pull commit
# Or bring in a personal skill you built locally
scripts/sync-skills.sh import my-custom-skill
# If the target already has that skill, force-nuke it first, then push
scripts/sync-skills.sh nuke --force my-custom-skill
scripts/sync-skills.sh push my-custom-skill
# Clean up target copies when done
scripts/sync-skills.sh nuke
```
