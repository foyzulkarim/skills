---
name: create-worktrees
description: Creates git worktrees for parallel agent work and copies the root Claude settings into each one. Use when asked to create worktrees, set up parallel agents, or spin up multiple workspaces on this repo.
---

When asked to create worktrees, follow these steps:

## Steps

1. Ask the user for:
   - The list of branch names to create worktrees for (if not already provided)
   - The name of the settings file to copy from `~/.claude/` (e.g., `settings.json`, `glm.json`). This file will be copied as `settings.json` into each worktree.
   - A suffix to append to worktree directory names (e.g., `-wt`, `-parallel`) so worktrees are easily distinguishable from regular branches

2. For each branch, create a worktree under `.claude/worktrees/` inside the current repo:
```bash
git worktree add .claude/worktrees/<branch-name><suffix> -b <branch-name>
```

If the branch already exists remotely, use:
```bash
git worktree add .claude/worktrees/<branch-name><suffix> <branch-name>
```

3. After creating each worktree, ensure the `.claude/` directory exists inside it:
```bash
mkdir -p .claude/worktrees/<branch-name><suffix>/.claude
```

4. Copy the root Claude settings file into the worktree's `.claude/` directory:
```bash
cp ~/.claude/<source-settings-file> .claude/worktrees/<branch-name><suffix>/.claude/settings.json
```

2. For each branch, create a worktree under `.claude/worktrees/` inside the current repo:
```bash
git worktree add .claude/worktrees/<branch-name> -b <branch-name>
```

If the branch already exists remotely, use:
```bash
git worktree add .claude/worktrees/<branch-name> <branch-name>
```

3. After creating each worktree, ensure the `.claude/` directory exists inside it:
```bash
mkdir -p .claude/worktrees/<branch-name>/.claude
```

4. Copy the root Claude settings file into the worktree's `.claude/` directory:
```bash
cp ~/.claude/settings.json .claude/worktrees/<branch-name>/.claude/settings.json
```

5. Confirm each worktree was created successfully by running:
```bash
git worktree list
```

## After completion

Report back with:
- The full path of each created worktree
- Confirmation that `<source-settings-file>` was copied as `settings.json`
- The command to open each worktree in a new Claude Code session:
```bash
claude .claude/worktrees/<branch-name><suffix>
```

## Notes

- Never create worktrees outside of `.claude/worktrees/` — keeps everything contained in the project
- If `~/.claude/<source-settings-file>` does not exist, warn the user and skip the copy step rather than failing
- If a worktree for that branch already exists, skip creation and only re-copy the settings file
- The suffix should be short and consistent (e.g., `-wt`, `-p`, `-parallel`) to keep directory names readable
