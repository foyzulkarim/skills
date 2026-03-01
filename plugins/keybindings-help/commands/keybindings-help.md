---
allowed-tools: Read, Edit
description: Customize Claude Code keyboard shortcuts in ~/.claude/keybindings.json
---

## Context

Current keybindings configuration:
!`cat ~/.claude/keybindings.json 2>/dev/null || echo "{}"`

## Your task

Help the user customize their Claude Code keyboard shortcuts in `~/.claude/keybindings.json`.

1. **Read the current state** — the file contents are injected above. If empty or `{}`, start fresh.
2. **Understand the request** — ask the user what they want to change:
   - Add a new keybinding (key combo → action)
   - Modify an existing binding
   - Remove a binding
   - Add a chord sequence (multi-key shortcut)
3. **Edit the file** — use the Edit tool to update `~/.claude/keybindings.json` with the change.
4. **Confirm** — show the user the updated binding and explain what it does.

### Keybinding format reference

```json
{
  "keybindings": [
    {
      "key": "ctrl+shift+r",
      "command": "claude.reloadWindow"
    },
    {
      "key": "ctrl+k ctrl+s",
      "command": "workbench.action.openGlobalKeybindings"
    }
  ]
}
```

Common commands include: `claude.newConversation`, `claude.submitMessage`, `claude.cancelRequest`, `claude.toggleSidebar`.

If the file does not exist yet, create it with the structure shown above.
