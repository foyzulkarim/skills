# foyzulkarim/skills — Claude Code Plugin Marketplace

A plugin marketplace for [Claude Code](https://claude.ai/claude-code) with tools for code review, project planning, and test-driven development.

## Add this marketplace

```
/add-marketplace foyzulkarim/skills
```

## Development Pipeline

These plugins form a complete development workflow organized into 5 stages:

### Pipeline Overview

```
architect                 (optional, for multi-feature work)
        |
        v
planner                  (plan a single feature)
        |
        v
taskgen                  (generate TDD-ready task specs)
        |
        v
tdd                      (implement via RED-GREEN-REFACTOR)
        |
        v
review                   (verify before merge)
```

### Stage 1: Architect *(optional — for multi-feature work)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [architect](./plugins/architect) | `/architect` | Strategic project planning through a 5-phase conversation — explores problem space, maps domain, identifies constraints, and decomposes into ordered phases with dependencies |

### Stage 2: Planner *(plan a single feature)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [planner](./plugins/planner) | `/planner` | Feature-level planning through a 5-phase Socratic conversation — uncovers requirements, edge cases, failure modes, and constraints before implementation |

### Stage 3: Taskgen *(generate TDD-ready task specs)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [taskgen](./plugins/taskgen) | `/taskgen` | Transform plan artifacts into TDD-ready task specifications, embedded directly in plan documents for full context in one file |

### Stage 4: TDD *(implement via RED-GREEN-REFACTOR)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [tdd](./plugins/tdd) | `/tdd` | Collaborative or autonomous TDD cycle — reads plan + task from one document, implements one test at a time |

### Stage 5: Review *(verify before merge)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [review](./plugins/review) | `/review` | Comprehensive code review with triage-first approach — up to 14 specialized checks, pipeline mode (verify against plan) or general mode (PR/branch/staged/diff) |

## Install a plugin

```
/install-plugin foyzulkarim/skills <plugin-name>
```

## Plugin structure

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json      ← metadata (name, description, author)
├── commands/
│   └── <name>.md        ← the skill file with YAML frontmatter
└── README.md            ← usage docs
```

## Contribute

1. Fork this repo
2. Create a directory under `plugins/<your-plugin-name>/`
3. Add `.claude-plugin/plugin.json`, `commands/<your-plugin-name>.md`, and `README.md`
4. Register the plugin in `.claude-plugin/marketplace.json` at the root
5. Open a pull request
