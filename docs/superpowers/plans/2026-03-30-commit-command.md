# Commit Command — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `/commit` command to the `dev-pipeline` plugin that guides staging, drafts a conventional commit message, and executes after confirmation.

**Architecture:** A single `SKILL.md` file following the same pattern as the other 5 dev-pipeline skills. No production code — the skill is Claude instructions in Markdown. Two supporting updates: `plugin.json` to register the skill, and the two READMEs to document it.

**Tech Stack:** Markdown, JSON (Claude Code skills format)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `dev-pipeline/skills/commit/SKILL.md` | Full commit command instructions |
| Modify | `dev-pipeline/.claude-plugin/plugin.json` | Register `commit` in the `skills` array |
| Modify | `dev-pipeline/README.md` | Add `/commit` to the skills section |
| Modify | `README.md` (root) | Add `/commit` to the skills table |

---

### Task 1: Create `dev-pipeline/skills/commit/SKILL.md`

**Files:**
- Create: `dev-pipeline/skills/commit/SKILL.md`

- [ ] **Step 1: Create the file with the full content**

Create `dev-pipeline/skills/commit/SKILL.md` with exactly this content:

```markdown
---
name: commit
description: "Stage, draft, and execute a conventional commit. Use this command when you want to commit changes at any point in your workflow — after writing plan docs, mid-TDD, after fixing review findings, or any ad-hoc change. Inspects git state, helps you decide what to stage, drafts a conventional commit message with type, optional task scope, and description, then executes after your confirmation.

Examples:

<example>
Context: Developer has finished updating plan docs and wants to commit.
user: \"/commit\"
assistant: \"Let me use the commit command to inspect your git state and help you commit these changes.\"
<commentary>
Standalone commit — no pipeline context needed. Works at any stage.
</commentary>
</example>

<example>
Context: Developer is mid-TDD and wants to checkpoint passing tests.
user: \"/commit\"
assistant: \"I'll use the commit command to check what's staged and draft a commit message.\"
<commentary>
Can be invoked at any pipeline stage.
</commentary>
</example>

<example>
Context: Developer passes a message hint to guide the title.
user: \"/commit fix null check in auth middleware\"
assistant: \"I'll use that as a hint for the commit title while checking what's staged.\"
<commentary>
Optional message hint informs the title draft. Still runs through both phases.
</commentary>
</example>

<example>
Context: Developer wants to commit only specific files.
user: \"/commit\"
assistant: \"Here's what's staged and unstaged. What would you like to commit?\"
<commentary>
Phase 1 always shows the full git state and asks what to include — never assumes.
</commentary>
</example>"
model: inherit
color: lightcoral
---

# Commit Command

You are a commit assistant. Your job is to help the developer stage the right files and craft a well-formed conventional commit message, then execute the commit after confirmation.

You are **standalone** — not tied to any pipeline position. You can be invoked at any stage: after writing plan docs, mid-TDD, after fixing review findings, or any ad-hoc change.

**Arguments:** An optional message hint (e.g., `/commit fix null check in auth`). If provided, use it to inform the title draft. If absent, derive the title from the diff.

---

## Phase 1: Staging

Run `git status` and `git diff --stat` (both staged and unstaged). Present a clear summary:

```
Staged (3 files):
  M  dev-pipeline/skills/plan-feature/SKILL.md
  M  dev-pipeline/skills/plan-project/SKILL.md
  M  README.md

Unstaged (2 files):
  M  dev-pipeline/.claude-plugin/plugin.json
  ??  CODE-REVIEW-PR-2.md
```

If there is nothing staged and nothing unstaged, tell the developer there is nothing to commit and stop.

Before asking, scan for potentially sensitive files in the list (`.env`, files with `secret`, `credential`, `token`, `key`, or `password` in the name). If any are present, call them out explicitly:
> *"⚠️ I noticed `config/.env` in the unstaged files — I'll leave that out unless you explicitly ask to include it."*

Then ask:
> *"What would you like to commit? (e.g. 'everything', 'just staged', 'all except CODE-REVIEW-PR-2.md')"*

Stage the requested files using specific `git add <file>` calls for each file. Never use `git add -A` or `git add .` unless the developer explicitly says "everything" AND no sensitive files were identified.

Once staging is resolved, move to Phase 2.

---

## Phase 2: Draft & Confirm

Silently compute all fields from the staged diff (`git diff --cached`):

### Type Inference

Infer the commit type from the staged diff content:

| Signal in diff | Type |
|----------------|------|
| New feature code, new endpoints, new functionality | `feat` |
| Correcting wrong behavior | `fix` |
| Moving, renaming, restructuring — no behavior change | `refactor` |
| Only `.md` files changed | `docs` |
| Only test files changed | `test` |
| Config, dependencies, tooling — no production code | `chore` |
| Formatting, whitespace, style only | `style` |
| CI/CD config changes | `ci` |

If the diff mixes signals, pick the dominant one and state your reasoning:
> *"This looks like a `refactor` — mostly renames and restructuring with no new behavior. Agree, or different type?"*

If genuinely ambiguous (roughly equal signals), list the top 2 candidates and ask the developer to pick.

### Task Number Extraction

Parse the current branch name (`git branch --show-current`) for a task or issue number.

Match patterns in this order:
1. `[A-Z]+-\d+` anywhere in the branch name (e.g. `feature/TASK-42-login` → `TASK-42`, `fix/PROJ-7` → `PROJ-7`)
2. A standalone digit sequence separated by `-` or `/` (e.g. `feat/42-add-auth` → `42`)

If no number is found in the branch name, ask once:
> *"Any task number to reference? (enter to skip)"*

If the developer skips or no number is found: omit the `({task-number})` scope from the header and omit the `Refs:` trailer entirely — never leave them blank.

### Title

One-line imperative summary of what changed. Total header length (type + scope + title) must be ≤72 characters. Use imperative mood: "add", "fix", "update", "remove" — not "added", "fixing", "updates".

If a message hint was passed as a command argument, use it as the basis for the title, adjusting for imperative mood and length.

### Description

1–3 sentences in plain English explaining what changed and why. Derive from the diff content. Be specific — mention file names, features, or behaviors being changed.

### Presenting the Draft

Present the full message in a code block:

```
{type}({task-number}): {short title}

{description}

Refs: {task-number}
```

Or without task number:

```
{type}: {short title}

{description}
```

Then ask:
> *"Commit this? (yes / edit / cancel)"*

- **yes** → execute the commit using a heredoc to preserve formatting:
  ```bash
  git commit -m "$(cat <<'EOF'
  {full message here}
  EOF
  )"
  ```
- **edit** → ask what to change (the developer can say "change the title to X" or provide the full new message). Redisplay the updated draft and ask for confirmation again before executing.
- **cancel** → abort. Tell the developer what is currently staged and leave git state unchanged.

---

## You Must NOT

- Use `--no-verify` or skip git hooks for any reason — if a hook fails, stop and report it
- Use `git add -A` or `git add .` unless the developer explicitly asked for everything AND no sensitive files are present
- Push to remote — this command commits only
- Run tests before committing — that is not your job
- Invent task numbers — only use what is found in the branch name or provided by the developer
- Commit if there is nothing staged after Phase 1
- Leave `({task-number})` or `Refs:` blank — either include them with a real value or omit them entirely
```

- [ ] **Step 2: Verify the file was created**

```bash
ls dev-pipeline/skills/commit/
```

Expected output:
```
SKILL.md
```

- [ ] **Step 3: Verify the frontmatter is valid**

```bash
head -5 dev-pipeline/skills/commit/SKILL.md
```

Expected output:
```
---
name: commit
description: "Stage, draft, and execute a conventional commit...
```

---

### Task 2: Register in `plugin.json`

**Files:**
- Modify: `dev-pipeline/.claude-plugin/plugin.json`

- [ ] **Step 1: Add the `commit` entry to the skills array**

Current `dev-pipeline/.claude-plugin/plugin.json`:
```json
{
  "name": "dev-pipeline",
  "description": "A structured development pipeline: project planning, feature planning, task generation, TDD implementation, and code review",
  "version": "1.0.0",
  "author": {
    "name": "foyzulkarim"
  },
  "skills": [
    { "name": "plan-project", "path": "skills/plan-project" },
    { "name": "plan-feature", "path": "skills/plan-feature" },
    { "name": "generate-tasks", "path": "skills/generate-tasks" },
    { "name": "tdd", "path": "skills/tdd" },
    { "name": "review", "path": "skills/review" }
  ]
}
```

Updated `dev-pipeline/.claude-plugin/plugin.json`:
```json
{
  "name": "dev-pipeline",
  "description": "A structured development pipeline: project planning, feature planning, task generation, TDD implementation, and code review",
  "version": "1.0.0",
  "author": {
    "name": "foyzulkarim"
  },
  "skills": [
    { "name": "plan-project", "path": "skills/plan-project" },
    { "name": "plan-feature", "path": "skills/plan-feature" },
    { "name": "generate-tasks", "path": "skills/generate-tasks" },
    { "name": "tdd", "path": "skills/tdd" },
    { "name": "review", "path": "skills/review" },
    { "name": "commit", "path": "skills/commit" }
  ]
}
```

- [ ] **Step 2: Verify**

```bash
cat dev-pipeline/.claude-plugin/plugin.json
```

Expected: 6 entries in the `skills` array, last one being `commit`.

---

### Task 3: Update READMEs

**Files:**
- Modify: `dev-pipeline/README.md`
- Modify: `README.md` (root)

- [ ] **Step 1: Add `/commit` section to `dev-pipeline/README.md`**

After the existing `### /review` section, add:

```markdown
### /commit

Standalone commit assistant. Inspects staged and unstaged changes, asks what to include, infers the conventional commit type from the diff, extracts a task number from the branch name, and drafts a complete commit message for confirmation before executing. Can be used at any stage of the pipeline.
```

- [ ] **Step 2: Update the pipeline diagram in `dev-pipeline/README.md`**

The current diagram:
```
/plan-project → phased project plan    (optional, for multi-feature work)
  /plan-feature → feature-level plan
    /generate-tasks → TDD-ready task specs
      /tdd → implementation
        /review → verification
```

Updated diagram (commit is shown as a utility alongside the pipeline, not in sequence):
```
/plan-project → phased project plan    (optional, for multi-feature work)
  /plan-feature → feature-level plan
    /generate-tasks → TDD-ready task specs
      /tdd → implementation
        /review → verification

/commit → conventional commit (use at any stage)
```

- [ ] **Step 3: Add `/commit` row to root `README.md` skills table**

Current table in `README.md`:
```markdown
| Skill | Description |
|-------|-------------|
| [/plan-project](./dev-pipeline/skills/plan-project) | Strategic project planning — explores problem space, maps domain, decomposes into phases |
| [/plan-feature](./dev-pipeline/skills/plan-feature) | Feature-level planning — uncovers requirements, edge cases, failure modes, constraints |
| [/generate-tasks](./dev-pipeline/skills/generate-tasks) | Transform plans into TDD-ready task specs embedded in plan documents |
| [/tdd](./dev-pipeline/skills/tdd) | Collaborative or autonomous TDD — RED-GREEN-REFACTOR, one test at a time |
| [/review](./dev-pipeline/skills/review) | Triage-first code review — up to 14 checks, pipeline or general mode |
```

Add a row at the bottom:
```markdown
| [/commit](./dev-pipeline/skills/commit) | Standalone commit assistant — stages files, drafts conventional commit message, executes after confirmation |
```

- [ ] **Step 4: Verify both READMEs mention `/commit`**

```bash
grep -n "commit" dev-pipeline/README.md README.md
```

Expected: at least one match in each file.

---

### Task 4: Commit

- [ ] **Step 1: Stage all changed files**

```bash
git add dev-pipeline/skills/commit/SKILL.md
git add dev-pipeline/.claude-plugin/plugin.json
git add dev-pipeline/README.md
git add README.md
git add docs/superpowers/specs/2026-03-30-commit-command-design.md
git add docs/superpowers/plans/2026-03-30-commit-command.md
```

- [ ] **Step 2: Verify staged files**

```bash
git diff --cached --stat
```

Expected: 6 files staged — the new SKILL.md, plugin.json, both READMEs, and the two docs files.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add commit command to dev-pipeline plugin

Adds a standalone /commit command that guides staging, drafts
a conventional commit message from the diff and branch name,
and executes after confirmation. Includes spec, plan, and
registration in plugin.json and README updates.
EOF
)"
```

Expected: commit succeeds, no hook failures.
