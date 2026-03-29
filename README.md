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
project-planner            (optional, for multi-feature work)
        |
        v
requirements-engineering   (plan a single feature)
        |
        v
feature-planning           (generate TDD-ready task specs)
        |
        v
tdd                        (implement via RED-GREEN-REFACTOR)
        |
        v
review-orchestrator        (verify before merge)
```

### Stage 1: Project Planner *(optional — for multi-feature work)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [architect](./plugins/architect) | `/architect` | Strategic project planning — conversational exploration OR spec-to-plan transformation |

### Stage 2: Requirements Engineering *(plan a single feature)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [planner](./plugins/planner) | `/planner` | Requirements engineering — structured conversation for feature requirements, edge cases, decisions, and domain behaviors |

### Stage 3: Feature Planning *(generate TDD-ready task specs)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [taskgen](./plugins/taskgen) | `/taskgen` | Generate TDD-ready task specs from plan artifacts |

### Stage 4: TDD *(implement via RED-GREEN-REFACTOR)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [tdd](./plugins/tdd) | `/tdd` | Collaborative RED-GREEN-REFACTOR cycle, one test at a time |

### Stage 5: Review Orchestrator *(verify before merge)*

| Plugin | Command | Description |
|--------|---------|-------------|
| [review](./plugins/review) | `/review` | Comprehensive code review — 7 parallel agents for any repo/language/framework |
| [ts-check](./plugins/ts-check) | `/ts-check` | Deep TypeScript/JavaScript analysis with 2-level code tracing |

### Productivity

| Plugin | Command | Description |
|--------|---------|-------------|
| [keybindings-help](./plugins/keybindings-help) | `/keybindings-help` | Customize Claude Code keyboard shortcuts |

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
