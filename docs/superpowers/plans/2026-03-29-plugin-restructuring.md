# Plugin Restructuring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate 5 separate plugins into a single `dev-pipeline` plugin with renamed skills and updated cross-references.

**Architecture:** Move all skill content from `plugins/<name>/commands/SKILL.md` to `dev-pipeline/skills/<new-name>/SKILL.md`. Create single plugin identity files. Update all internal cross-references. Delete old structure.

**Tech Stack:** Claude Code plugin system (markdown files, JSON config)

---

## File Structure

**New files to create:**
- `dev-pipeline/.claude-plugin/plugin.json` — single plugin identity
- `dev-pipeline/.claude-plugin/marketplace.json` — single marketplace entry (lives inside the plugin, NOT at repo root)
- `dev-pipeline/skills/plan-project/SKILL.md` — was `plugins/architect/commands/SKILL.md`
- `dev-pipeline/skills/plan-feature/SKILL.md` — was `plugins/planner/commands/SKILL.md`
- `dev-pipeline/skills/generate-tasks/SKILL.md` — was `plugins/taskgen/commands/SKILL.md`
- `dev-pipeline/skills/tdd/SKILL.md` — was `plugins/tdd/commands/SKILL.md`
- `dev-pipeline/skills/review/SKILL.md` — was `plugins/review/commands/SKILL.md`
- `dev-pipeline/README.md` — unified README for the pipeline

**Files to delete:**
- `plugins/` — entire directory (5 plugin subdirectories)
- `.claude-plugin/marketplace.json` — old root marketplace (replaced by `dev-pipeline/.claude-plugin/marketplace.json`)

**Files to update:**
- `README.md` (repo root) — update to reflect new single-plugin structure

---

### Task 1: Create plugin identity files

**Files:**
- Create: `dev-pipeline/.claude-plugin/plugin.json`
- Create: `dev-pipeline/.claude-plugin/marketplace.json`

- [ ] **Step 1: Create directory structure**

Run: `mkdir -p dev-pipeline/.claude-plugin dev-pipeline/skills/plan-project dev-pipeline/skills/plan-feature dev-pipeline/skills/generate-tasks dev-pipeline/skills/tdd dev-pipeline/skills/review`

- [ ] **Step 2: Create plugin.json**

Create `dev-pipeline/.claude-plugin/plugin.json`:

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

- [ ] **Step 3: Create marketplace.json**

Create `dev-pipeline/.claude-plugin/marketplace.json`:

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

- [ ] **Step 4: Commit**

```bash
git add dev-pipeline/.claude-plugin/plugin.json dev-pipeline/.claude-plugin/marketplace.json
git commit -m "feat: create dev-pipeline plugin identity files"
```

---

### Task 2: Move and rename plan-project skill (was architect)

**Files:**
- Create: `dev-pipeline/skills/plan-project/SKILL.md`
- Source: `plugins/architect/commands/SKILL.md`

- [ ] **Step 1: Copy the skill file**

Copy `plugins/architect/commands/SKILL.md` to `dev-pipeline/skills/plan-project/SKILL.md`.

- [ ] **Step 2: Update frontmatter name field**

Change `name: architect` to `name: plan-project`.

- [ ] **Step 3: Remove (fs-1) prefix from description**

In the frontmatter `description` field, remove the `(fs-1)` prefix. The description should start with `"Plan a new project or major epic..."`.

- [ ] **Step 4: Update cross-references in the skill content**

Apply these replacements in the file body (NOT in the description frontmatter examples, which use natural language):

| Find | Replace | Context |
|------|---------|---------|
| `Start with: \`/planner for:` | `Start with: \`/plan-feature for:` | Line 230 — next steps section |
| `point explicitly to the Planner skill as the next stage` | `point explicitly to the plan-feature skill as the next stage` | Line 318 — reminders |
| `**Your output feeds into:** The Planner skill, which plans each feature individually` | `**Your output feeds into:** The plan-feature skill, which plans each feature individually` | Line 32 — pipeline section |

Do NOT change:
- `"You are a senior technical architect"` — this is a persona, not a skill reference
- Pipeline ASCII diagram labels like `Planner (per feature)` — update these to `plan-feature (per feature)`
- The examples in the frontmatter `description` — update `/planner` to `/plan-feature` and `the planner skill` to `the plan-feature skill` and `the architect skill` to `the plan-project skill` within those examples

- [ ] **Step 5: Commit**

```bash
git add dev-pipeline/skills/plan-project/SKILL.md
git commit -m "feat: add plan-project skill (was architect)"
```

---

### Task 3: Move and rename plan-feature skill (was planner)

**Files:**
- Create: `dev-pipeline/skills/plan-feature/SKILL.md`
- Source: `plugins/planner/commands/SKILL.md`

- [ ] **Step 1: Copy the skill file**

Copy `plugins/planner/commands/SKILL.md` to `dev-pipeline/skills/plan-feature/SKILL.md`.

- [ ] **Step 2: Update frontmatter name field**

Change `name: planner` to `name: plan-feature`.

- [ ] **Step 3: Remove (fs-2) prefix from description**

Remove the `(fs-2)` prefix from the description field.

- [ ] **Step 4: Update cross-references in the skill content**

| Find | Replace | Context |
|------|---------|---------|
| `The Taskgen skill, which transforms your plan` | `The generate-tasks skill, which transforms your plan` | Line 33 |
| `_This plan is the input for the Taskgen skill._` | `_This plan is the input for the generate-tasks skill._` | Line 273 |
| `Generate tasks — that's the Taskgen skill's job` | `Generate tasks — that's the generate-tasks skill's job` | Line 301 |
| `escalating to the Architect skill if the work truly spans` | `escalating to the plan-project skill if the work truly spans` | Line 324 |
| `point the developer to the Taskgen skill as the next step` | `point the developer to the generate-tasks skill as the next step` | Line 333 |
| `run: "Generate task from plan:` | keep as-is — this is a user instruction, not a skill reference |

Also update the frontmatter `description` examples:
- `the planner skill` → `the plan-feature skill`
- `the architect skill` → `the plan-project skill`
- `/planner` → `/plan-feature` (in example user commands)

The pipeline diagram reference `Planner for:` and `Mode A/B` labels should stay as functional descriptions, but the skill invocation syntax `/planner for:` should become `/plan-feature for:`.

- [ ] **Step 5: Commit**

```bash
git add dev-pipeline/skills/plan-feature/SKILL.md
git commit -m "feat: add plan-feature skill (was planner)"
```

---

### Task 4: Move and rename generate-tasks skill (was taskgen)

**Files:**
- Create: `dev-pipeline/skills/generate-tasks/SKILL.md`
- Source: `plugins/taskgen/commands/SKILL.md`

- [ ] **Step 1: Copy the skill file**

Copy `plugins/taskgen/commands/SKILL.md` to `dev-pipeline/skills/generate-tasks/SKILL.md`.

- [ ] **Step 2: Update frontmatter name field**

Change `name: taskgen` to `name: generate-tasks`.

- [ ] **Step 3: Remove (fs-3) prefix from description**

Remove the `(fs-3)` prefix from the description field.

- [ ] **Step 4: Update cross-references in the skill content**

| Find | Replace | Context |
|------|---------|---------|
| `The Planner skill (a \`PLAN-*.md\` file)` | `The plan-feature skill (a \`PLAN-*.md\` file)` | Line 27 |
| `The feature plan was produced by the Planner skill` | `The feature plan was produced by the plan-feature skill` | Line 63 |
| `This is what the TDD skill will use` | `This is what the tdd skill will use` | Line 95 (no change needed, lowercase already matches) |
| `The TDD skill updates the status field` | `The tdd skill updates the status field` | Line 235 |
| `point the developer to the TDD skill as the next step` | `point the developer to the tdd skill as the next step` | Line 319 |

Also update the frontmatter `description` examples:
- `the taskgen skill` → `the generate-tasks skill`
- `the planner skill` → `the plan-feature skill`
- `/taskgen` → `/generate-tasks` (in example user commands)

Also update the pipeline diagram in the skill body:
- `Planner` → `plan-feature` (in the pipeline ASCII art)
- `Taskgen` → `generate-tasks`

- [ ] **Step 5: Commit**

```bash
git add dev-pipeline/skills/generate-tasks/SKILL.md
git commit -m "feat: add generate-tasks skill (was taskgen)"
```

---

### Task 5: Move tdd skill (name unchanged)

**Files:**
- Create: `dev-pipeline/skills/tdd/SKILL.md`
- Source: `plugins/tdd/commands/SKILL.md`

- [ ] **Step 1: Copy the skill file**

Copy `plugins/tdd/commands/SKILL.md` to `dev-pipeline/skills/tdd/SKILL.md`.

- [ ] **Step 2: Update frontmatter**

Change `name: tdd` — no change needed for name. Remove `(fs-4)` prefix from description.

- [ ] **Step 3: Update cross-references in the skill content**

| Find | Replace | Context |
|------|---------|---------|
| `added by the Taskgen skill` | `added by the generate-tasks skill` | Line 84 |
| `task specs (added by the Taskgen skill). You read` | `task specs (added by the generate-tasks skill). You read` | Line 53 |
| `The Review skill, which checks the implementation` | `The review skill, which checks the implementation` | Line 54 (minor case fix) |
| `point the developer to the Review skill as the next step` | `point the developer to the review skill as the next step` | Line 189 |

Also update the frontmatter `description` examples:
- `/tdd` references stay as-is
- `the tdd skill` references stay as-is

Update pipeline ASCII art in skill body:
- `Planner` → `plan-feature`
- `Taskgen` → `generate-tasks`

- [ ] **Step 4: Commit**

```bash
git add dev-pipeline/skills/tdd/SKILL.md
git commit -m "feat: add tdd skill to dev-pipeline"
```

---

### Task 6: Move review skill (name unchanged)

**Files:**
- Create: `dev-pipeline/skills/review/SKILL.md`
- Source: `plugins/review/commands/SKILL.md`

- [ ] **Step 1: Copy the skill file**

Copy `plugins/review/commands/SKILL.md` to `dev-pipeline/skills/review/SKILL.md`.

- [ ] **Step 2: Update frontmatter**

Remove `(fs-5)` prefix from description. Name stays `review`.

- [ ] **Step 3: Update cross-references in the skill content**

| Find | Replace | Context |
|------|---------|---------|
| `The TDD skill produced working code` | `The tdd skill produced working code` | Line 35 (minor case consistency) |

Update pipeline ASCII art in skill body:
- `Planner` → `plan-feature`
- `Taskgen` → `generate-tasks`
- `TDD` → `tdd` (in pipeline diagram labels)

Also update the frontmatter `description` examples:
- `the review skill` references stay as-is

- [ ] **Step 4: Commit**

```bash
git add dev-pipeline/skills/review/SKILL.md
git commit -m "feat: add review skill to dev-pipeline"
```

---

### Task 7: Create unified README.md

**Files:**
- Create: `dev-pipeline/README.md`

- [ ] **Step 1: Write the README**

Create `dev-pipeline/README.md`:

```markdown
# dev-pipeline

A structured development pipeline for Claude Code — from project planning through code review.

## Skills

```
/plan-project → phased project plan    (optional, for multi-feature work)
  /plan-feature → feature-level plan
    /generate-tasks → TDD-ready task specs
      /tdd → implementation
        /review → verification
```

### /plan-project

Strategic project planning through a 5-phase conversation. Explores the problem space, maps the domain, identifies constraints, and decomposes the project into ordered phases with dependencies. Use when the work spans multiple features.

### /plan-feature

Feature-level planning through a 5-phase Socratic conversation. Uncovers requirements, edge cases, failure modes, and constraints before implementation. Produces a plan artifact (`PLAN-*.md`).

### /generate-tasks

Transforms plan artifacts into TDD-ready task specifications. Collaboratively drafts test plans and embeds task specs directly in the plan document so the TDD skill has full context in one file.

### /tdd

Test-driven development partner. Works through RED-GREEN-REFACTOR one test at a time. Supports collaborative mode (pauses at every step) and autonomous mode (`/tdd auto`).

### /review

Comprehensive code review with a triage-first approach. Proposes relevant checks, runs them as parallel agents, and produces a combined report. Up to 14 specialized checks. Works with any language or framework.

## Install

```
/install-plugin foyzulkarim/skills dev-pipeline
```

## Output Conventions

- Project plans: `/specs/plans/PROJECT-[slug].md`
- Feature plans: `/specs/plans/PLAN-[slug].md`
- Task specs: Embedded in `PLAN-*.md` documents
- Review reports: `CODE-REVIEW-*.md` at repo root
```

- [ ] **Step 2: Commit**

```bash
git add dev-pipeline/README.md
git commit -m "docs: add unified README for dev-pipeline plugin"
```

---

### Task 8: Update root README.md and delete old structure

**Files:**
- Modify: `README.md` (repo root)
- Delete: `plugins/` (entire directory)
- Delete: `.claude-plugin/marketplace.json` (old root marketplace)

- [ ] **Step 1: Update root README.md**

Replace the entire content of `README.md` with:

```markdown
# foyzulkarim/skills — Claude Code Plugin Marketplace

A plugin marketplace for [Claude Code](https://claude.ai/claude-code) with a structured development pipeline.

## Add this marketplace

```
/add-marketplace foyzulkarim/skills
```

## dev-pipeline

A complete development workflow from project planning to code review:

```
/plan-project → phased project plan    (optional, for multi-feature work)
  /plan-feature → feature-level plan
    /generate-tasks → TDD-ready task specs
      /tdd → implementation
        /review → verification
```

| Skill | Description |
|-------|-------------|
| [/plan-project](./dev-pipeline/skills/plan-project) | Strategic project planning — explores problem space, maps domain, decomposes into phases |
| [/plan-feature](./dev-pipeline/skills/plan-feature) | Feature-level planning — uncovers requirements, edge cases, failure modes, constraints |
| [/generate-tasks](./dev-pipeline/skills/generate-tasks) | Transform plans into TDD-ready task specs embedded in plan documents |
| [/tdd](./dev-pipeline/skills/tdd) | Collaborative or autonomous TDD — RED-GREEN-REFACTOR, one test at a time |
| [/review](./dev-pipeline/skills/review) | Triage-first code review — up to 14 checks, pipeline or general mode |

### Install

```
/install-plugin foyzulkarim/skills dev-pipeline
```

## Plugin structure

```
dev-pipeline/
├── .claude-plugin/
│   ├── plugin.json        ← plugin identity
│   └── marketplace.json   ← marketplace entry
├── skills/
│   ├── plan-project/
│   │   └── SKILL.md
│   ├── plan-feature/
│   │   └── SKILL.md
│   ├── generate-tasks/
│   │   └── SKILL.md
│   ├── tdd/
│   │   └── SKILL.md
│   └── review/
│       └── SKILL.md
└── README.md
```

## Contribute

1. Fork this repo
2. Add or modify skills under `dev-pipeline/skills/<skill-name>/`
3. Register in `dev-pipeline/.claude-plugin/marketplace.json`
4. Open a pull request
```

- [ ] **Step 2: Move root marketplace.json into dev-pipeline**

The marketplace.json now lives inside `dev-pipeline/.claude-plugin/marketplace.json` (already created in Task 1). The root `.claude-plugin/marketplace.json` is replaced by a pointer.

Update `.claude-plugin/marketplace.json` to point to the plugin:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "foyzulkarim-skills",
  "description": "Claude Code plugin marketplace with a structured development pipeline",
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
      "source": "./dev-pipeline",
      "category": "development"
    }
  ]
}
```

- [ ] **Step 3: Delete old plugins directory**

Run: `rm -rf plugins/`

Expected: The `plugins/` directory and all its contents are removed.

- [ ] **Step 4: Verify the new structure**

Run: `find dev-pipeline -type f | sort`

Expected output:
```
dev-pipeline/.claude-plugin/marketplace.json
dev-pipeline/.claude-plugin/plugin.json
dev-pipeline/README.md
dev-pipeline/skills/generate-tasks/SKILL.md
dev-pipeline/skills/plan-feature/SKILL.md
dev-pipeline/skills/plan-project/SKILL.md
dev-pipeline/skills/review/SKILL.md
dev-pipeline/skills/tdd/SKILL.md
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: consolidate 5 plugins into single dev-pipeline plugin

Replaces separate architect, planner, taskgen, tdd, and review plugins
with a single dev-pipeline plugin. Renames architect→plan-project,
planner→plan-feature, taskgen→generate-tasks. Updates all cross-references."
```
