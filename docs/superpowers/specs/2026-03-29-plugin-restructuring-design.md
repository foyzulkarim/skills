# Design: Consolidate 5 Plugins into Single dev-pipeline Plugin

> **Date:** 2026-03-29
> **Type:** refactoring
> **Status:** approved

## Summary

Restructure the repository from 5 separate plugins (architect, planner, taskgen, tdd, review) into a single plugin called `dev-pipeline`. All skills become subdirectories under `skills/`, with no `commands/` layer — skills are directly discoverable and invocable by Claude Code. Three skills are renamed for clarity.

## Current State

```
plugins/
├── architect/          # separate plugin (fs-1)
│   ├── .claude-plugin/plugin.json
│   ├── commands/SKILL.md
│   └── README.md
├── planner/            # separate plugin (fs-2)
│   ├── .claude-plugin/plugin.json
│   ├── commands/SKILL.md
│   └── README.md
├── taskgen/            # separate plugin (fs-3)
│   ├── .claude-plugin/plugin.json
│   ├── commands/SKILL.md
│   └── README.md
├── tdd/                # separate plugin (fs-4)
│   ├── .claude-plugin/plugin.json
│   ├── commands/SKILL.md
│   └── README.md
└── review/             # separate plugin (fs-5)
    ├── .claude-plugin/plugin.json
    ├── commands/SKILL.md
    └── README.md
```

**Problems:**
- Each skill appears as a separate plugin installation, making them look unrelated
- 5 separate `plugin.json` files to maintain
- 5 separate `marketplace.json` entries
- The pipeline relationship between skills is not obvious from the structure

## Target State

```
dev-pipeline/
├── .claude-plugin/
│   ├── plugin.json              # single plugin identity
│   └── marketplace.json         # single marketplace entry
├── skills/
│   ├── plan-project/
│   │   └── SKILL.md             # was: architect
│   ├── plan-feature/
│   │   └── SKILL.md             # was: planner
│   ├── generate-tasks/
│   │   └── SKILL.md             # was: taskgen
│   ├── tdd/
│   │   └── SKILL.md             # unchanged
│   └── review/
│       └── SKILL.md             # unchanged
└── README.md
```

## Design Decisions

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|------------------------|----------------|
| 1 | Single plugin, not 5 separate ones | Keep 5 separate plugins | Skills form one pipeline; grouping reflects their relationship |
| 2 | Skills-only, no commands layer | commands/ with thin wrappers pointing to skills/ | No functional difference between commands and skills in Claude Code; avoids duplication |
| 3 | Rename architect → plan-project, planner → plan-feature, taskgen → generate-tasks | Keep original names | "plan-project" vs "plan-feature" disambiguates scope; "generate-tasks" is more self-documenting than "taskgen" |
| 4 | Keep tdd and review names unchanged | Rename to "implement" / "verify" | tdd and review are already clear and well-known terms |
| 5 | Plugin name: dev-pipeline | foyzuls-dev-skills, dev-flow, agentic-dev | Clean and descriptive; can be renamed later (single field change) |

## Skill Renames

| Old Name | New Name | Slash Command |
|----------|----------|---------------|
| architect | plan-project | `/plan-project` |
| planner | plan-feature | `/plan-feature` |
| taskgen | generate-tasks | `/generate-tasks` |
| tdd | tdd | `/tdd` |
| review | review | `/review` |

## Cross-Reference Updates

Each skill references others in pipeline diagrams and "next step" instructions. All internal references must be updated:

- `/architect` → `/plan-project`
- `/planner` → `/plan-feature`
- `/taskgen` → `/generate-tasks`
- `Planner` (as skill name in prose) → `Plan-Feature` or `plan-feature skill`
- `Architect` (as skill name in prose) → `Plan-Project` or `plan-project skill`
- `Taskgen` (as skill name in prose) → `Generate-Tasks` or `generate-tasks skill`

**Note:** Only update references to skill/command names. Do not change the role descriptions (e.g., "You are a senior technical architect" stays as-is — that's a persona, not a skill reference).

## Plugin Identity Files

### plugin.json

```json
{
  "name": "dev-pipeline",
  "description": "A structured development pipeline: project planning, feature planning, task generation, TDD implementation, and code review",
  "version": "1.0.0",
  "author": {
    "name": "foyzulkarim"
  }
}
```

### marketplace.json

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "dev-pipeline",
  "description": "A structured development pipeline: project planning, feature planning, task generation, TDD implementation, and code review",
  "owner": {
    "name": "foyzulkarim",
    "email": "foyzulkarim@gmail.com"
  },
  "plugins": [
    {
      "name": "dev-pipeline",
      "description": "A structured development pipeline: project planning, feature planning, task generation, TDD implementation, and code review",
      "version": "1.0.0",
      "author": {
        "name": "foyzulkarim"
      },
      "source": "./",
      "category": "development"
    }
  ]
}
```

## SKILL.md Frontmatter Updates

Each SKILL.md `name` field updates to match the new skill name. The `description` field drops the `(fs-N)` prefix since the pipeline order is now implicit in the single-plugin structure. Example:

```yaml
---
name: plan-project
description: "Plan a new project or major epic — explores the domain and decomposes into phased features. ..."
model: inherit
color: cornflowerblue
---
```

## Files Deleted

- `plugins/architect/` (entire directory)
- `plugins/planner/` (entire directory)
- `plugins/taskgen/` (entire directory)
- `plugins/tdd/` (entire directory)
- `plugins/review/` (entire directory)
- Root `.claude-plugin/marketplace.json` (replaced by one inside dev-pipeline/)

## Files Created

- `dev-pipeline/.claude-plugin/plugin.json`
- `dev-pipeline/.claude-plugin/marketplace.json`
- `dev-pipeline/skills/plan-project/SKILL.md`
- `dev-pipeline/skills/plan-feature/SKILL.md`
- `dev-pipeline/skills/generate-tasks/SKILL.md`
- `dev-pipeline/skills/tdd/SKILL.md`
- `dev-pipeline/skills/review/SKILL.md`
- `dev-pipeline/README.md`

## Scope Boundaries

### In Scope
- Restructure directories from 5 plugins to 1
- Rename 3 skills as specified
- Update all cross-references between skills
- Update plugin.json and marketplace.json
- Write a single README.md for the pipeline

### Out of Scope
- Changing skill content/logic beyond name references
- Adding new skills
- Changing the specs/plans/ output convention
- Adding commands/ layer

---
_This design is the input for the implementation plan._
