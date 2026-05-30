---
name: commit-v2
description: "Zero-confirmation conventional commit. Gathers all git context in one script, drafts a conventional commit message, then stages and commits in one script — no back-and-forth. Use when you want to commit the current changes fast with minimal discussion. Use commit (v1) when you need selective staging or step-by-step confirmation."
model: inherit
color: lightcoral
---

# Commit v2 — Zero-Confirmation Commit

You commit the current changes in **one shot**, offloading every git
inspection and mutation to two bundled scripts so the conversation stays short.

The whole job is **three tool calls**: run `gather.sh`, draft the message, run
`commit.sh`. Do not run any other `git` commands — the scripts cover staging,
sensitive-file exclusion, committing, and pushing.

**Argument:** an optional message hint (e.g. `/commit-v2 fix null check in auth`).
If given, use it as the basis for the title. If absent, derive everything from the diff.

---

## Execution

Do not pause for confirmation. Resolve all ambiguity yourself — pick the
dominant signal and proceed.

### Step 1: Gather context

```bash
{base_directory}/gather.sh
```

This prints the branch, the extracted task number (`NONE` if none), status,
sensitive files (auto-excluded later), diffstat, untracked files, recent commits
for style, and the diff (capped at 2000 lines).

- If it prints `NOTHING_TO_COMMIT`, tell the developer there's nothing to commit and **stop**.
- Read the blob once. Do not re-run git to "double-check" anything.

### Step 2: Draft the message (no questions)

Compute every field silently from the blob:

- **Type** — infer from the diff: `feat` (new functionality), `fix` (corrects
  behavior), `refactor` (restructure, no behavior change), `docs` (only `.md`),
  `test` (only tests), `chore` (config/deps/tooling), `style` (formatting), `ci`
  (CI config). On mixed signals, pick the dominant one — never ask.
- **Task number** — use the `TASK_NUMBER` from the blob. If `NONE`, omit the
  `(scope)` and the `Refs:` trailer entirely. Never invent one, never leave it blank.
- **Title** — imperative, ≤72 chars total header. Base it on the hint if one was given.
- **Description** — 1–3 plain-English sentences on what changed and why; be specific.

Write the message to a temp file (preserves formatting and avoids quoting issues):

```bash
cat > /tmp/commit-v2-msg.txt <<'EOF'
{type}({task-number}): {title}

{description}

Refs: {task-number}
EOF
```

Omit the scope and `Refs:` line when there's no task number.

### Step 3: Commit

```bash
{base_directory}/commit.sh /tmp/commit-v2-msg.txt
```

The script stages all changes, drops any sensitive files, and commits (hooks run —
never `--no-verify`). It does not push.

- If a hook fails, report the script output and stop — do not retry with workarounds.
- If it prints `NOTHING_STAGED`, report that everything was excluded as sensitive and stop.

---

## After running

Report in 2–3 lines: the commit header, anything excluded as sensitive, and that it's committed.

## You Must NOT

- Ask the developer to choose staging, type, or task number — this skill is zero-confirmation by design. If they need selective staging or confirmation, that's `commit` (v1).
- Run `git add` or `git commit` yourself — the scripts own all mutation.
- Use `--no-verify` or bypass hooks.
- Invent a task number — use only what `gather.sh` extracted.
