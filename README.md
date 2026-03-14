# foyzulkarim/skills — Claude Code Plugin Marketplace

A plugin marketplace for [Claude Code](https://claude.ai/claude-code) with tools for code review, project planning, and test-driven development.

## Add this marketplace

```
/add-marketplace foyzulkarim/skills
```

## Plugins

### Code Quality

| Plugin | Command | Description |
|--------|---------|-------------|
| [review](./plugins/review) | `/review` | Comprehensive code review using 7 parallel agents — works with any repo, language, or framework |
| [ts-check](./plugins/ts-check) | `/ts-check` | Deep TypeScript/JavaScript analysis with 2-level code tracing |

### Planning

| Plugin | Command | Description |
|--------|---------|-------------|
| [architect](./plugins/architect) | `/architect` | Strategic project planning — domain mapping, phase decomposition, dependency graphs |
| [planner](./plugins/planner) | `/planner` | Feature-level planning — requirements, edge cases, constraints |
| [spec-to-plan](./plugins/spec-to-plan) | `/spec-to-plan` | Transform a spec into a phased project plan |
| [plan-to-phases](./plugins/plan-to-phases) | `/plan-to-phases` | Expand a plan into detailed phase documents |

### Development

| Plugin | Command | Description |
|--------|---------|-------------|
| [taskgen](./plugins/taskgen) | `/taskgen` | Generate TDD-ready task specs from plan artifacts |
| [tdd](./plugins/tdd) | `/tdd` | Collaborative RED-GREEN-REFACTOR cycle, one test at a time |

### Productivity

| Plugin | Command | Description |
|--------|---------|-------------|
| [keybindings-help](./plugins/keybindings-help) | `/keybindings-help` | Customize Claude Code keyboard shortcuts |

## Development Pipeline

These plugins form a complete development workflow with two entry points:

**Greenfield projects** — start with `/architect` to explore the problem space and create a phased plan through collaborative conversation.

**Existing specs** — start with `/spec-to-plan` to transform a spec or requirements document into a phased plan.

```
/architect → phased project plan (greenfield)
  OR
/spec-to-plan → phased project plan (from existing spec)

  ↓
  /plan-to-phases → detailed phase documents
    /planner → feature-level plans (optional)
      /taskgen → TDD-ready task specifications
        /tdd → implementation via RED-GREEN-REFACTOR

/review → code review before merge
/ts-check → deep TypeScript analysis before merge
```

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
