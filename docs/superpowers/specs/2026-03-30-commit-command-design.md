# Commit Command — Design Spec

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

`commit` is a standalone command in the `dev-pipeline` plugin. It is not a pipeline step — it can be invoked at any point in the workflow: after writing plan docs, mid-TDD to checkpoint passing tests, after fixing review findings, or after any ad-hoc change.

It is a commit assistant: inspects the current git state, helps the developer decide what to stage, drafts a well-formed conventional commit message, and executes after confirmation.

---

## Two-Phase Flow

### Phase 1 — Staging

The skill runs `git status` and `git diff` (both staged and unstaged) and presents a clear summary:

```
Staged (3 files):
  M  dev-pipeline/skills/plan-feature/SKILL.md
  M  dev-pipeline/skills/plan-project/SKILL.md
  M  README.md

Unstaged (2 files):
  M  dev-pipeline/.claude-plugin/plugin.json
  ??  CODE-REVIEW-PR-2.md
```

Then asks: *"What would you like to commit? (e.g. 'everything', 'just staged', 'everything except CODE-REVIEW-PR-2.md')"*

The skill stages the files accordingly, then moves to Phase 2.

### Phase 2 — Draft & Confirm

The skill silently computes all fields from the staged diff and branch name:

- **Type** — inferred from diff content. If ambiguous, asks once with a proposal.
- **Task number** — extracted from branch name (e.g. `feature/TASK-42-login` → `TASK-42`). If none found, asks: *"Any task number to reference? (enter to skip)"*
- **Title** — one-line imperative summary derived from the diff
- **Description** — 1–3 sentences on what and why, derived from the diff

Presents the full draft, then asks: *"Commit this? (yes / edit / cancel)"*

- **yes** → executes `git commit -m "..."`
- **edit** → developer provides corrected message, skill confirms again before executing
- **cancel** → aborts, leaves staging as-is

---

## Message Format

Follows **Conventional Commits** with an optional task number scope:

```
{type}({task-number}): {short title}
<blank line>
{short description}
<blank line>
Refs: {task-number}
```

The `({task-number})` scope and `Refs:` trailer are both omitted entirely when no task number is found — they are never left blank.

### Rules

| Part | Rule |
|------|------|
| `type` | One of: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`, `ci` |
| `task-number` | Optional — omitted if not found, never blank |
| `short title` | ≤72 chars total header, imperative mood ("add", "fix", "update") |
| blank line | Always present between header and description |
| `description` | 1–3 sentences, plain English, explains *what* and *why* |
| `Refs:` trailer | Only included when a task number is present |

### Examples

With task number:
```
feat(TASK-12): add user registration endpoint

Adds POST /auth/register with email/password validation,
bcrypt hashing, and duplicate email error handling.

Refs: TASK-12
```

Without task number:
```
docs: update dev-pipeline README with new skill names

Corrects skill names and install instructions following
the architect→plan-project rename refactor.
```

---

## Type Inference

The skill infers type from the staged diff using these signals:

| Signal in diff | Inferred type |
|----------------|---------------|
| New feature code, new endpoints, new functionality | `feat` |
| Correcting wrong behavior | `fix` |
| Moving, renaming, restructuring without behavior change | `refactor` |
| Only `.md` files changed | `docs` |
| Only test files changed | `test` |
| Config, dependencies, tooling — no production code | `chore` |
| Formatting, whitespace, style only | `style` |
| CI/CD config changes | `ci` |

**Ambiguity rule:** If the diff mixes signals, the skill picks the dominant signal and states its reasoning:

> *"This looks like a `refactor` — mostly renames and restructuring with no new behavior. Agree, or different type?"*

If it genuinely cannot decide (roughly equal signals), it lists the top candidates and asks the developer to pick.

---

## Task Number Extraction

**Primary source:** Branch name. The skill parses the current branch for common patterns:
- `feature/TASK-42-login` → `TASK-42`
- `fix/PROJ-7-null-check` → `PROJ-7`
- `feat/42-add-auth` → `42`
- Bare branch names with no number → no task found

**Fallback:** If no task number is found in the branch name, the skill asks once:
> *"Any task number to reference? (enter to skip)"*

If the developer skips, the scope and `Refs:` trailer are omitted from the message.

---

## What This Command Is NOT

- It does not push to remote — commit only
- It does not create PRs
- It does not run tests before committing
- It does not enforce branch naming conventions
- It does not skip git hooks (`--no-verify` is never used)
