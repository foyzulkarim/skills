# Plan: Start-Task Skill for Dev-Pipeline

> **Date:** 2026-04-03
> **Project source:** Standalone
> **Estimated tasks:** 3-4
> **Planning session:** detailed
> **Branch:** `feat/start-task-skill/create-start-task-skill`

## Summary

Add a `start-task` skill to the dev-pipeline plugin that bootstraps new task work. It auto-detects the task source from user input, syncs with the latest main, gathers and merges context from remote trackers and local specs, creates a context file in `/specs/context/`, and creates/pushes a properly named branch. It sits before `plan-feature` in the pipeline and is opt-in only.

## Requirements

### Functional Requirements
1. Auto-detect task source from user input patterns (Jira key → `acli`, `#N` → `gh`, file path → local file, else → ad-hoc conversation)
2. Confirm the detected source with the developer before fetching anything
3. Fetch task details from the confirmed source and extract key, title, type, and description
4. Offer to layer local specs/PRDs on top of remote tracker data when both exist
5. Use the remote tracker number for the branch name when multiple sources are present
6. Ask for a short identifier when no remote tracker is involved
7. Detect the repo's default branch and sync (`git fetch`, `checkout`, `pull`)
8. Detect current branch and reuse it if it matches the task; stop and ask if it mismatches
9. Protect uncommitted changes — never stash or discard without explicit confirmation
10. Build branch name as `{type}/{task-number}/{slug}` and confirm with developer
11. Create branch and push to remote
12. Create a context file at `/specs/context/{identifier}.md` with gathered task information
13. If context file already exists, ask developer then update in place
14. Hand off to plan-feature with a summary and reference to the context file

### Non-Functional Requirements
1. Token-efficient — confirm before fetching to avoid wasted API calls
2. If a required CLI tool (`acli`, `gh`) is not installed, fail with a clear message and stop — no silent degradation
3. Opt-in only — never trigger automatically

## Behaviors

### Auto-Detection Behavior

The skill parses the user's invocation for patterns to infer the task source:

| Input Pattern | Detected Source | Confirmation Prompt |
|--------------|----------------|-------------------|
| `TASK-42`, `PROJ-123` (uppercase + dash + digits) | Jira | "Looks like a Jira ticket — should I fetch TASK-42 with acli?" |
| `#123` | GitHub | "Looks like a GitHub issue — should I fetch #123 with gh?" |
| `/specs/...`, `/docs/...`, path with `.md` or `.txt` | Local file | "I'll read the task from [path] — correct?" |
| Free-form text or no recognizable pattern | Ad-hoc | "I don't recognize a task source. Let's figure this out together." |

**Why this matters:** Without confirmation, the skill could waste tokens calling the wrong API or misidentifying a local filename as a ticket key. The confirmation step is cheap and prevents confusion.

### Source Merging Behavior

When a remote tracker is detected and fetched, the skill should ask:
> *"Do you have any local specs or PRDs that add context to this task?"*

If yes, read the file and merge. The branch number always comes from the remote tracker.

When only ad-hoc input exists, the skill asks clarifying questions to extract type, title, and identifier.

### Branch Reuse Behavior

Before switching to main, check the current branch name (`git branch --show-current`). If it already matches the task (contains the task number/key), offer to stay on it:
> *"You're already on `feat/TASK-42/add-auth`. Want to continue here, or create a fresh branch?"*

If the current branch doesn't match and has a different task number, stop:
> *"You're on `feat/TASK-99/other-work` but we're starting TASK-42. Should I switch to main and create a new branch, or handle this differently?"*

**Why this matters:** Developers sometimes restart a session on an existing branch. Silently creating a new one would orphan the existing work.

### Context File Behavior

After gathering all task information, write a context file to `/specs/context/{identifier}.md`. The format is flexible — the runtime agent decides the structure based on what information is available. At minimum it should contain:
- Task identifier (ticket key or short slug)
- Task title
- Task type
- Source(s) used
- Relevant details (description, acceptance criteria, notes)
- Date created/updated

If the file already exists, ask:
> *"A context file already exists at `/specs/context/TASK-42.md`. Should I update it with the new information?"*

**Why this matters:** The context file persists across sessions. Plan-feature, generate-tasks, and future conversations can read it to understand what the task is about without re-fetching.

### CLI Tool Failure Behavior

If `acli` or `gh` is not installed:
> *"I need the Atlassian CLI (`acli`) to fetch Jira tickets, but it doesn't appear to be installed. Please install it and try again."*

Stop. Do not fall back to ad-hoc. The developer chose a specific source — they should get it working, not silently lose information.

**Why this matters:** Silent fallback trains developers to ignore broken tooling. A hard fail is a nudge to fix the setup.

### Default Branch Detection

Try `main` first. If it doesn't exist, detect the default branch:
```bash
git remote show origin | grep 'HEAD branch'
```
If neither works, ask the developer which branch to sync from.

## Key Constraints

| Constraint | Why It Matters |
|------------|----------------|
| Never stash/discard uncommitted changes without explicit confirmation | Developer's work could be lost |
| Never push to main/master | Only push the new feature branch |
| Never use `--force` on any push | Prevents overwriting remote history |
| Never trigger automatically | Developer explicitly opts in to start a task |
| Never silently fall back when CLI tool is missing | Broken tooling should be fixed, not worked around |
| Context file lives in `/specs/context/`, not `/specs/plans/` | This skill orients, it does not plan |

## Edge Cases & Failure Modes

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| Auto-detection is wrong (e.g., "AUTH-42" is a filename, not Jira) | Confirmation step catches this before any API call | Saves tokens and avoids confusing errors |
| No remote tracker anywhere | Ask developer for a short identifier | Avoids inventing meaningless slugs |
| `acli` or `gh` not installed | Fail with clear message, stop | No silent degradation |
| Context file already exists | Ask developer, then update in place | Preserve history |
| Already on a matching feature branch | Offer to reuse it | Avoids orphaning existing work |
| On a mismatching branch | Stop and ask what to do | Prevents continuing on wrong branch |
| `git checkout -b` fails (branch exists locally) | Ask: switch to it / different name / delete and recreate | Developer may have prior work there |
| Push fails (network, permissions) | Report error, suggest checking access | Don't retry blindly |
| Dirty working tree when switching branches | Ask before any stash/discard | Never lose uncommitted work |

## Decisions Log

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|------------------------|----------------|
| 1 | Auto-detect + confirm before fetch | Always ask; always auto-detect without confirming | Balances efficiency with safety — saves tokens without risking wrong API calls |
| 2 | Branch number from remote tracker when multiple sources | Use most specific; use local slug | Remote tracker is the source of truth for traceability |
| 3 | Ask for short identifier when no tracker | Auto-generate slug | Developer knows best what identifier makes sense |
| 4 | Hard fail when CLI tool missing | Silent fallback to ad-hoc | Forces developer to fix broken tooling |
| 5 | Context file in `/specs/context/` | `/specs/plans/`; `/specs/tasks/` | Separated from plans — this skill orients, doesn't plan |
| 6 | Flexible context file format | Rigid template | Not all tasks have the same shape |
| 7 | Ask then update existing context file | Overwrite; append | Developer controls what stays |
| 8 | Reuse current branch if matching | Always create new | Avoids orphaning existing work |
| 9 | Stop on branch mismatch | Warn and proceed; auto-switch | Prevents silent mistakes |

## Scope Boundaries

### In Scope
- Task source auto-detection with confirmation
- Fetching from Jira (`acli`), GitHub (`gh`), local files, ad-hoc
- Merging multiple sources
- Branch creation, naming, and push
- Context file creation in `/specs/context/`
- Current branch detection and reuse logic
- CLI tool availability checks with hard fail
- Hand-off to plan-feature

### Out of Scope
- Writing a feature plan (plan-feature's job)
- Generating tasks (generate-tasks' job)
- Code review (review's job)
- Committing changes (commit's job)
- Installing CLI tools (`acli`, `gh`) — developer's responsibility

## Dependencies

### Depends On (must exist before this work starts)
- Git CLI — available in the environment
- `acli` — optional, only needed for Jira tasks
- `gh` — optional, only needed for GitHub issues

### Depended On By (other work waiting for this)
- `plan-feature` — expects a context file and a feature branch to exist

## Architecture Notes

The skill is a single `SKILL.md` file in the dev-pipeline plugin, following the same pattern as `commit`, `plan-feature`, etc. It reads from external CLIs and files but does not bundle scripts or references — all external interactions happen via bash commands (`acli`, `gh`, `git`).

The context file is the primary hand-off artifact. Downstream skills read it to understand task context without re-fetching or re-asking the developer.

---

# Tasks

## Task T1: Rewrite SKILL.md Conversation Flow

> **Status:** done
> **Effort:** m
> **Priority:** high
> **Depends on:** None

### Description

Rewrite the existing `dev-pipeline/skills/start-task/SKILL.md` to incorporate all decisions from the plan. The current draft has a basic 5-phase flow that asks "where is the task?" every time. It needs to be restructured with auto-detection first, confirmation before fetch, branch reuse logic, and CLI tool availability checks. This is the core skill rewrite — the conversation flow is the skill.

### What to Change

The current SKILL.md has these phases:
1. Where is the task? (always asks)
2. Sync with main
3. Branch naming
4. Create and push
5. Hand off

Rewrite to these phases:
1. **Detect & Confirm** — Parse user input for patterns (Jira key, GitHub `#N`, file path). If detected, confirm before fetching. If not, enter ad-hoc conversation. Add CLI tool availability check before any fetch — hard fail if missing.
2. **Source Merging** — After fetching from remote tracker, ask if local specs/PRDs should be layered on. Branch number comes from remote tracker. Ad-hoc gets clarifying questions for type, title, and identifier.
3. **Branch Check & Sync** — Check current branch. If matching task number, offer to reuse. If mismatching, stop and ask. If no match, sync with default branch (detect main/master) and create new branch.
4. **Create & Push** — Build branch name `{type}/{task-number}/{slug}`, confirm, create, push.
5. **Hand off** — Summarize and point to `/plan-feature`.

### Verification Checklist

After writing, verify the skill handles:
- [ ] Jira key auto-detection (e.g. `TASK-42`) → confirms before calling `acli`
- [ ] GitHub issue auto-detection (e.g. `#87`) → confirms before calling `gh`
- [ ] File path detection (e.g. `/specs/prds/auth.md`) → confirms before reading
- [ ] Ad-hoc with no patterns → conversational, asks for type and identifier
- [ ] CLI tool not installed → hard fail with clear message, stops
- [ ] Current branch matches task → offers to reuse
- [ ] Current branch mismatches task → stops and asks
- [ ] Dirty working tree → asks before any stash/discard
- [ ] Default branch detection (main vs master vs ask)
- [ ] Branch already exists locally → asks: switch / rename / recreate

### Scope Boundaries

- Do NOT add context file creation logic (that's T2)
- Do NOT change the README or plugin.json
- Do NOT add bundled scripts or reference files
- Only modify `dev-pipeline/skills/start-task/SKILL.md`

### Files Expected

**Modified files:**
- `dev-pipeline/skills/start-task/SKILL.md` (rewrite conversation flow, add auto-detection, branch reuse, CLI checks)

**Must NOT modify:**
- `dev-pipeline/README.md`
- `dev-pipeline/.claude-plugin/plugin.json`
- Any other skill files

---

## Task T2: Add Context File Creation

> **Status:** done
> **Effort:** s
> **Priority:** high
> **Depends on:** T1

### Description

Add context file creation to the start-task skill. After gathering all task information (from Jira, GitHub, local files, or ad-hoc), the skill writes a context file to `/specs/context/{identifier}.md`. This file persists task context across sessions so that plan-feature, generate-tasks, and future conversations can reference it without re-fetching or re-asking.

### What to Add

Insert a new phase between "Create & Push" and "Hand off" in the SKILL.md from T1:

- **Context File** — After branch creation, write `/specs/context/{identifier}.md` with gathered task info. Format is flexible — the runtime agent decides structure. Minimum fields: identifier, title, type, source(s), details, date.
- If file exists, ask developer whether to update, then update in place.
- The hand-off phase should reference the context file path.

Also ensure the pipeline diagram and hand-off text point to the context file.

### Verification Checklist

After writing, verify the skill handles:
- [ ] Creates `/specs/context/{identifier}.md` with task info after branch creation
- [ ] File contains at minimum: identifier, title, type, source(s), details, date
- [ ] Detects existing context file and asks before overwriting
- [ ] Updates existing file in place when developer confirms
- [ ] Hand-off references the context file path for downstream skills
- [ ] Source merging (remote + local) results in a single context file
- [ ] Ad-hoc tasks still get a context file with a slug identifier

### Scope Boundaries

- Do NOT create the `/specs/context/` directory in the repo — the skill creates it at runtime
- Do NOT define a rigid template for the context file — keep it flexible
- Do NOT add context file logic to other skills
- Only modify `dev-pipeline/skills/start-task/SKILL.md`

### Files Expected

**Modified files:**
- `dev-pipeline/skills/start-task/SKILL.md` (add context file phase + update hand-off)

**Must NOT modify:**
- `dev-pipeline/README.md`
- `dev-pipeline/.claude-plugin/plugin.json`
- Any other skill files
