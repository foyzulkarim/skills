# Plan: Fix Start-Task Skill Review Findings

> **Date:** 2026-04-03
> **Project source:** Standalone
> **Estimated tasks:** 3
> **Planning session:** brief (well-defined fixes from PR #5 review)

## Summary

Fix 12 issues (1 critical, 3 high, 8 medium) plus 5 low-severity improvements identified in the consolidated PR #5 review. The issues span three files: `SKILL.md` (input validation, error handling, phase logic), `dev-pipeline/README.md` (documentation gaps), and root `README.md` (missing skill entry). All fixes are additive — no re-architecture needed.

## Requirements

### Functional Requirements
1. Fix Phase 3 skip target — change "skip to Phase 4 (hand-off)" to "skip to Phase 5 (Context File)"
2. Anchor Jira key regex to string boundaries and validate extracted key before CLI call
3. Add branch slug validation — allowlist `[a-z0-9-]`, reject/sanitize everything else
4. Add "Source(s)" to Phase 2 output checklist so agents track source type before Phase 5
5. Add `gh pr view` auto-fallback when `gh issue view` fails with "not found"
6. Narrow file path detection — require path to start with `/`, `./`, or `../`; reject `..` traversal
7. Add fetch failure handling — check exit codes, report actionable errors for auth/network/not-found
8. Complete default branch detection fallback — specify detection mechanism and add "ask developer" step
9. Add concrete slug derivation rules (drop articles, keep action + object, examples)
10. Add context file path to `dev-pipeline/README.md` Output Conventions
11. Align description wording between README and SKILL.md (`acli` not "Atlassian CLI")
12. Update root `README.md` — add start-task to pipeline diagram, skills table, and directory tree
13. Align Phase 2 naming with plan ("Source Merging" behavior mentioned explicitly)
14. Always run `git status` before branch operations, not just during switches
15. Add "(opt-in)" annotation to pipeline diagram for `/start-task`
16. Clarify "dive straight in" hand-off text with concrete options
17. Rephrase subjective "You Must NOT" item to be actionable

### Non-Functional Requirements
1. All fixes are backward-compatible — no breaking changes to the skill's behavior for valid inputs
2. Security fixes must be explicit and documented — no implicit assumptions about "safe" input

## Behaviors

### Input Validation Behavior

After detection, before any CLI or git operation, the skill must sanitize all user-derived inputs:

| Input | Validation | On Failure |
|-------|-----------|------------|
| Jira key | Must match `^[A-Z]+-\d+$` exactly. Only the matched group is passed to `acli`. | Reject and ask for valid key |
| GitHub number | Must be digits only. Try `gh issue view`, fall back to `gh pr view` on "not found". | If both fail, report actionable error |
| File path | Must start with `/`, `./`, or `../`. Must not contain `..` path traversal. | Reject and ask for valid path |
| Branch slug | Must contain only `[a-z0-9-]`. Reject or strip anything else before git commands. | Sanitize and confirm with developer |
| Context file identifier | Must contain only `[a-zA-Z0-9_-]` before path construction. | Sanitize automatically |

**Why this matters:** The skill passes user-derived strings directly into CLI commands. Without validation, shell metacharacters in Jira titles, task descriptions, or user input could cause command injection or unexpected behavior. Three of four reviewers flagged this.

### Error Handling Behavior

After any fetch operation (`acli`, `gh`), check the exit code and report an actionable error:

| Failure Mode | Message Pattern |
|-------------|----------------|
| CLI not installed | "I need [tool] to fetch [source]. Please install it and try again." (existing) |
| Auth error | "Failed to fetch [key]. Your [tool] authentication may need to be refreshed." |
| Network error | "Could not reach [source]. Check your network connection and try again." |
| Not found | "[key] was not found, or you don't have access. Verify the key and try again." |

### Default Branch Detection Behavior

The detection sequence is explicit:
1. Try `git checkout main` — if it succeeds, use `main`
2. Run `git remote show origin | grep 'HEAD branch'` — extract the branch name
3. If neither works, ask: "I couldn't detect the default branch. Which branch should I sync from?"

## Detailed Specifications

### Phase 2 Output Checklist Update

Current checklist (4 fields):
- Task key/number
- Task title
- Task type
- Task details

New checklist (5 fields):
- **Task key/number** (e.g. `TASK-42`, `87`, or a developer-provided slug)
- **Task title** (a short summary)
- **Task type** (feature, fix, refactor, chore, docs, etc.)
- **Task details** (description, acceptance criteria, notes)
- **Source(s)** (Jira, GitHub, local file, ad-hoc)

### Slug Derivation Rules

Add concrete guidance after "2-4 word kebab-case summary derived from the task title":

> Derivation rules: Drop articles (a, an, the), prepositions (for, with, via), and helper verbs (is, be, has). Keep the core action and object. Hyphenate between words.
>
> Examples:
> - "Add user authentication" → `add-user-auth`
> - "Fix null pointer in payment flow" → `fix-null-pointer-payment`
> - "Remove legacy API endpoints" → `remove-legacy-api`

### Hand-Off Clarification

Replace "or dive straight in if you already have a clear picture" with:

> "Or dive straight in — run `/tdd` if you have tasks ready, or start coding directly if the task is small enough to not need a plan."

### "You Must NOT" Rephrase

Replace: "Create a branch if the developer seems unsure about the task — help them clarify first"

With: "Create a branch before confirming the task type and title with the developer — always get explicit confirmation first"

## Key Constraints

| Constraint | Why It Matters |
|------------|----------------|
| Only the matched regex group is passed to CLI commands — never the full user input | Prevents command injection |
| Branch slug allowlist is enforced before any `git checkout -b` or `git push` | Prevents shell metacharacters in git commands |
| Context file identifier is validated before path construction | Prevents path traversal writes |
| `git status` check runs before ANY branch operation, not just switches | Protects uncommitted work even when already on default branch |
| No breaking changes to existing valid-input behavior | Existing users should see no regression |

## Edge Cases & Failure Modes

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| User input contains multiple Jira keys (e.g. "TASK-42 and TASK-43") | Anchored regex rejects — ask which one to use | Ambiguous input should be clarified, not guessed |
| `gh issue view` fails with auth error vs not-found | Auth error → report auth issue; not-found → try `gh pr view` | Different failures need different responses |
| Jira title contains backticks or `$()` (e.g. "Add `hostname` support") | Slug sanitization strips them → `add-hostname-support` | Shell metacharacters must never reach git commands |
| File path is `./specs/../etc/passwd.md` | Reject — `..` in path is forbidden regardless of final target | Defense in depth |
| Default branch is neither `main` nor `master` (e.g. `develop`, `trunk`) | Fallback to `git remote show origin`, then ask developer | Don't assume standard names |
| Non-tracker branch names have redundant segments | Clarify with a note: `{task-number}` is the identifier, `{slug}` is independently derived from title | Reduces confusion for ad-hoc/local-spec tasks |

## Decisions Log

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|------------------------|----------------|
| 1 | Auto-fallback for `#N` detection (try issue, then PR) | Ask developer whether it's an issue or PR first | Auto-fallback is seamless — the developer just wants the data. Two of four reviewers preferred this. |
| 2 | Reject `..` in file paths rather than resolving | Resolve to absolute path and check prefix | Simpler rule, no false negatives, easier for an LLM agent to enforce |
| 3 | Sanitize slug (strip invalid chars) then confirm with developer | Reject and ask for manual slug | Sanitize + confirm is faster for the developer while still safe |
| 4 | Include all low-severity fixes in this plan | Defer to a later PR | One PR cycle is more efficient; all changes are small and non-breaking |
| 5 | Keep Phase 2 name as "Fetch & Merge" but mention "Source Merging" as a subheading | Rename to "Source Merging" to match plan | "Fetch & Merge" is more descriptive of what actually happens |

## Scope Boundaries

### In Scope
- All 12 critical/high/medium issues from the consolidated review
- All 5 low-severity improvements
- Updates to `SKILL.md`, `dev-pipeline/README.md`, and root `README.md`

### Out of Scope
- Changes to other skill files (plan-feature, tdd, review, commit, etc.)
- Changes to `plugin.json` or `marketplace.json` (version/description are correct)
- Changes to the plan artifact `PLAN-start-task-skill.md`
- Adding new features beyond what was reviewed
- Fork-based workflow handling (only a one-line note, no logic change)

## Dependencies

### Depends On
- Current state of `feat/start-task-skill/create-start-task-skill` branch (all files exist)

### Depended On By
- PR #5 merge — these fixes are prerequisites for approval

## Architecture Notes

All changes are edits to existing Markdown files. No new files are created. No scripts, no code, no JSON config changes.

The changes are organized into three tasks by file grouping:
1. **SKILL.md** — input validation, error handling, phase logic fixes (bulk of changes)
2. **dev-pipeline/README.md** — documentation gaps
3. **Root README.md** — missing skill entry

---

# Tasks

## Task T1: Fix SKILL.md — Input Validation, Error Handling & Phase Logic

> **Status:** done
> **Effort:** s
> **Priority:** critical
> **Depends on:** None

### Description

Apply 13 fixes to `dev-pipeline/skills/start-task/SKILL.md` addressing all critical, high, medium, and low-severity review findings that affect the skill definition itself. Changes span input validation (regex anchoring, slug allowlist, path restrictions), error handling (fetch failures, branch detection fallback), phase logic (skip target, output checklist, git status timing), and clarity improvements (slug derivation rules, hand-off text, "You Must NOT" rephrase).

### Verification Checklist

After editing, verify the skill file handles all of these scenarios:

##### Phase 1: Detect & Confirm
- [ ] Jira key regex `^[A-Z]+-\d+$` is anchored — rejects multi-key input like "TASK-42; rm -rf /"
- [ ] GitHub `#N` detection label updated to "GitHub issue or PR number"
- [ ] File path detection requires start with `/`, `./`, or `../`
- [ ] File path detection explicitly rejects `..` sequences
- [ ] Detection rule descriptions match the updated validation behavior

##### Phase 2: Fetch & Merge
- [ ] Source Merging subheading or note added to Phase 2 section
- [ ] `gh issue view` has auto-fallback to `gh pr view` on "not found" failure
- [ ] `acli` fetch includes exit code check with actionable error messages
- [ ] `gh` fetch includes exit code check with actionable error messages
- [ ] Output checklist includes **Source(s)** field (5 fields total, not 4)

##### Phase 3: Branch Check & Sync
- [ ] Skip target says "Phase 5 (Context File)" — NOT "Phase 4 (hand-off)"
- [ ] Default branch detection specifies concrete mechanism ("If `git checkout main` fails...")
- [ ] Default branch fallback includes "ask developer" step
- [ ] `git status` check runs before ANY branch operation, not just during switches

##### Phase 4: Create & Push
- [ ] Slug validation explicitly stated: allowlist `[a-z0-9-]`, reject/sanitize anything else
- [ ] Slug derivation rules are concrete with examples
- [ ] Note added: for non-tracker sources, `{task-number}` is identifier, `{slug}` is independently derived

##### Phase 6: Hand Off
- [ ] "Dive straight in" text specifies concrete options (e.g., `/tdd` or direct coding)

##### You Must NOT
- [ ] "Seems unsure" item rephrased to actionable wording ("before confirming task type and title")

### Implementation Notes

- **Pattern reference:** Follow the existing SKILL.md structure — edit in-place, preserve surrounding context
- **Key decisions:** Auto-fallback for `#N`, reject `..` in paths, sanitize slug then confirm, keep "Fetch & Merge" name with "Source Merging" subheading
- **All edits are to Markdown** — no code, no scripts, no JSON

### Scope Boundaries

- Do NOT modify any file other than `dev-pipeline/skills/start-task/SKILL.md`
- Do NOT add new phases or restructure the phase order
- Do NOT change frontmatter (name, description, model, color are correct)
- Do NOT modify the branch type reference table (it's fine as-is)
- Only make the specific edits called out above

### Files Expected

**Modified files:**
- `dev-pipeline/skills/start-task/SKILL.md` (13 targeted edits across 6 sections)

**Must NOT modify:**
- `dev-pipeline/README.md`
- Root `README.md`
- `plugin.json`, `marketplace.json`
- `specs/plans/PLAN-start-task-skill.md`

---

## Task T2: Fix Both READMEs — Documentation Gaps & Missing Skill Entry

> **Status:** done
> **Effort:** xs
> **Priority:** high
> **Depends on:** None

### Description

Fix documentation gaps in `dev-pipeline/README.md` (context file path missing from Output Conventions, description wording mismatch, missing opt-in annotation) and update root `README.md` to include `start-task` in the pipeline diagram, skills table, and directory tree structure. These are straightforward documentation edits.

### Verification Checklist

##### dev-pipeline/README.md
- [ ] Output Conventions section includes `- Context files: /specs/context/{identifier}.md`
- [ ] `/start-task` description uses `acli` (not "Atlassian CLI") to match SKILL.md
- [ ] Pipeline diagram shows `(opt-in, per task)` or similar annotation for `/start-task`

##### Root README.md
- [ ] Pipeline diagram includes `/start-task` between `/plan-project` and `/plan-feature`
- [ ] Skills table includes a row for `/start-task` with accurate description
- [ ] Directory tree includes `start-task/` directory with `SKILL.md`

### Implementation Notes

- **dev-pipeline/README.md:** The context file path goes after the existing "Review reports" entry in Output Conventions. The description change is on line 20. The opt-in annotation goes in the pipeline diagram on line 9.
- **Root README.md:** Follow the exact format of existing entries in the pipeline diagram (line 16-21), skills table (line 23-30), and directory tree (line 40-56). Insert `/start-task` after `/plan-project` in the diagram. Add the skill row after the `/plan-project` row in the table. Add `start-task/` directory after `plan-project/` in the tree.
- **Key decisions:** Use `acli` consistently (matches SKILL.md). Use short description for skills table matching the plugin description.

### Scope Boundaries

- Do NOT modify `SKILL.md`, `plugin.json`, `marketplace.json`, or any other file
- Do NOT change the Install section or Contribute section in either README
- Do NOT reformat existing content — only add or edit the specific items listed
- Only touch the 3 items per file called out above

### Files Expected

**Modified files:**
- `dev-pipeline/README.md` (3 targeted edits: output conventions, description, diagram annotation)
- `README.md` (root) (3 targeted edits: pipeline diagram, skills table, directory tree)

**Must NOT modify:**
- `dev-pipeline/skills/start-task/SKILL.md`
- `specs/plans/PLAN-start-task-skill.md`
- `plugin.json`, `marketplace.json`

---
_Tasks generated from plan: specs/plans/PLAN-start-task-review-fixes.md_
_Execute with: "Implement task T1 from specs/plans/PLAN-start-task-review-fixes.md"_
