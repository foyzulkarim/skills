# keybindings-help

A Claude Code skill that helps you interactively customize keyboard shortcuts in `~/.claude/keybindings.json`.

## What it does

- Reads your current keybindings configuration
- Helps you add, modify, or remove key bindings
- Supports chord sequences (multi-key shortcuts)
- Edits the file directly using Claude's Edit tool

## Usage

Once installed, invoke the skill with:

```
/keybindings-help
```

Then describe what you want — for example:
- "Add a shortcut to start a new conversation with ctrl+shift+n"
- "Remove the binding for ctrl+r"
- "Change the submit key to ctrl+enter"

## Installation

Install via Claude Code:

```
/install-plugin foyzulkarim/skills keybindings-help
```

Or if you've registered the marketplace locally, it should appear in `/list-plugins`.

## Keybindings file location

`~/.claude/keybindings.json`
