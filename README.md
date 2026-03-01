# foyzulkarim/skills — Claude Code Plugin Marketplace

A personal plugin marketplace for [Claude Code](https://claude.ai/claude-code), following the same format as [`anthropics/claude-plugins-official`](https://github.com/anthropics/claude-plugins-official).

## Plugins

| Plugin | Description | Category |
|--------|-------------|----------|
| [keybindings-help](./plugins/keybindings-help) | Interactively customize Claude Code keyboard shortcuts | productivity |

## Add this marketplace to Claude Code

```
/add-marketplace foyzulkarim/skills
```

## Install a plugin

```
/install-plugin foyzulkarim/skills keybindings-help
```

## Use an installed plugin

```
/keybindings-help
```

## Contribute

1. Fork this repo
2. Create a directory under `plugins/<your-plugin-name>/`
3. Add `.claude-plugin/plugin.json`, `commands/<your-plugin-name>.md`, and `README.md`
4. Register the plugin in `.claude-plugin/marketplace.json` at the root
5. Open a pull request

### Plugin structure

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json      ← metadata (name, description, author)
├── commands/
│   └── <name>.md        ← the skill file with YAML frontmatter
└── README.md            ← usage docs
```

### Skill file format

```markdown
---
allowed-tools: Read, Edit, Bash(git log:*)
description: Short description shown in /help
---

## Context
- Injected shell output: !`some-command`

## Your task
Instructions for Claude...
```
