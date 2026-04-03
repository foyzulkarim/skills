# foyzulkarim/skills — Claude Code Plugin Marketplace

A plugin marketplace for [Claude Code](https://claude.ai/claude-code) with a structured development pipeline.

## Add this marketplace

```
/add-marketplace foyzulkarim/skills
```

## dev-pipeline

A complete development workflow from project planning to code review:

```
/plan-project → phased project plan    (optional, for multi-feature work)
  /start-task → sync main, create branch, gather context  (opt-in, per task)
    /plan-feature → feature-level plan
      /generate-tasks → TDD-ready task specs
        /tdd → implementation
          /review → verification
```

| Skill | Description |
|-------|-------------|
| [/plan-project](./dev-pipeline/skills/plan-project) | Strategic project planning — explores problem space, maps domain, decomposes into phases |
| [/start-task](./dev-pipeline/skills/start-task) | Start a task — syncs main, gathers context from Jira (via `acli`), GitHub (via `gh`), or local specs, creates and pushes a branch |
| [/plan-feature](./dev-pipeline/skills/plan-feature) | Feature-level planning — uncovers requirements, edge cases, failure modes, constraints |
| [/generate-tasks](./dev-pipeline/skills/generate-tasks) | Transform plans into TDD-ready task specs embedded in plan documents |
| [/tdd](./dev-pipeline/skills/tdd) | Collaborative or autonomous TDD — RED-GREEN-REFACTOR, one test at a time |
| [/review](./dev-pipeline/skills/review) | Triage-first code review — up to 14 checks, pipeline or general mode |
| [/commit](./dev-pipeline/skills/commit) | Standalone commit assistant — stages files, drafts conventional commit message, executes after confirmation |

### Install

```
/install-plugin foyzulkarim/skills dev-pipeline
```

## Plugin structure

```
dev-pipeline/
├── .claude-plugin/
│   ├── plugin.json        ← plugin identity
│   └── marketplace.json   ← marketplace entry
├── skills/
│   ├── plan-project/
│   │   └── SKILL.md
│   ├── start-task/
│   │   └── SKILL.md
│   ├── plan-feature/
│   │   └── SKILL.md
│   ├── generate-tasks/
│   │   └── SKILL.md
│   ├── tdd/
│   │   └── SKILL.md
│   └── review/
│       └── SKILL.md
└── README.md
```

## Contribute

1. Fork this repo
2. Add or modify skills under `dev-pipeline/skills/<skill-name>/`
3. Register the new skill in `dev-pipeline/.claude-plugin/plugin.json` (add an entry to the `skills` array)
4. Open a pull request
