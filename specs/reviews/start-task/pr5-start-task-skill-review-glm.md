# Code Review: `feat(dev-pipeline): add start-task skill`

**PR:** [#5](https://github.com/foyzulkarim/skills/pull/5)
**Branch:** `feat/start-task-skill/create-start-task-skill` → `master`
**Commits:** 2 (`d2a2c91` → `90c636f`)
**Author:** foyzulkarim + Claude Opus 4.6
**Review Date:** 2026-04-03
**Reviewer:** glm-5.1

---

## Summary

Adds a `start-task` skill to the dev-pipeline plugin. The skill bootstraps new task work by auto-detecting the task source (Jira via `acli`, GitHub via `gh`, local files, or ad-hoc), syncing with the default branch, creating a context file in `/specs/context/`, and pushing a branch with pattern `{type}/{task-number}/{slug}`. Sits before `plan-feature` in the pipeline. Opt-in only.

**5 files changed: +540 / -8**

| File | Change | Lines |
|------|--------|-------|
| `dev-pipeline/skills/start-task/SKILL.md` | New | +239 |
| `specs/plans/PLAN-start-task-skill.md` | New | +287 |
| `dev-pipeline/README.md` | Updated | +10 / -4 |
| `dev-pipeline/.claude-plugin/plugin.json` | Version bump | +2 / -2 |
| `.claude-plugin/marketplace.json` | Version bump | +2 / -2 |

**Verdict:** Not ready to merge. One critical issue must be fixed. Three important issues should be addressed before merge.

---

## Strengths

1. **Excellent plan fidelity.** All 14 functional requirements and 3 non-functional requirements from `PLAN-start-task-skill.md` are addressed. All 9 decisions in the Decisions Log followed without deviation.

2. **Consistent with plugin conventions.** SKILL.md frontmatter (`name`, `description`, `model: inherit`, `color`), phase-based conversation flow, blockquote prompts, and "You Must NOT" section all match `commit/SKILL.md` and `plan-feature/SKILL.md`.

3. **Auto-detection priority order is correct.** Jira key `[A-Z]+-\d+` → GitHub `#\d+` → file path → ad-hoc. The confirmation-before-fetch pattern catches false detections early (e.g. "AUTH-42" might be a filename, not a Jira key).

4. **CLI tool hard-fail behavior is well-designed.** `which acli` / `which gh` check before fetch, with a clear stop message. No silent fallback to ad-hoc. This nudges developers to fix broken tooling.

5. **Branch reuse/mismatch logic is sound.** Three-case handling (match → offer reuse, mismatch → stop and ask, no match → sync and create) prevents orphaning existing work.

6. **Dirty working tree protection.** Explicit confirmation required before any stash operation.

7. **Context file placement correct.** `/specs/context/` per plan Decision #5 — separated from plans because "this skill orients, it does not plan."

8. **Config changes consistent.** Version bump (1.1.0 → 1.2.0) applied to both `plugin.json` and `marketplace.json` with matching descriptions. README pipeline diagram correctly positions start-task.

---

## Issues

### 🔴 Critical

#### 1. Phase 3 skip target is wrong

**File:** `dev-pipeline/skills/start-task/SKILL.md`, line 116

> *"If they choose to stay, skip to Phase 4 (hand-off). The branch and remote are already set up."*

Two errors in one sentence:

1. **Wrong phase number.** Phase 4 is "Create & Push", not hand-off. An LLM agent following these instructions literally would execute `git checkout -b` on a branch that already exists, causing a confusing error.

2. **Wrong skip target even if the number were correct.** When a developer reuses an existing branch, they still need a context file (Phase 5) before the hand-off (Phase 6). The context file is the primary hand-off artifact — skipping it defeats the purpose of the skill.

**Fix:**
```
If they choose to stay, skip to Phase 5 (Context File). The branch and remote are already set up.
```

**Why critical:** This is an instruction that an LLM agent will follow literally. The wrong phase number will cause a runtime error, and the parenthetical mislabeling compounds the confusion.

---

### 🟡 Important

#### 2. Root README not updated

**File:** `README.md` (root — marketplace entry point)

The root README was not updated. It still shows:

- **Old pipeline diagram** — missing `/start-task` between `/plan-project` and `/plan-feature`
- **Skills table missing start-task** — lists 6 skills but omits the new one
- **Directory structure tree missing `start-task/`** — shows only the original 6 skill directories

Since this is the marketplace-facing document (`/add-marketplace foyzulkarim/skills`), new users discovering the plugin won't see start-task as part of the pipeline. This is a discoverability gap.

**Fix:** Mirror the pipeline diagram, skills table, and structure tree updates from `dev-pipeline/README.md`.

---

#### 3. Context file path missing from Output Conventions

**File:** `dev-pipeline/README.md`, lines 52–58

The Output Conventions section lists:
- Project plans: `/specs/plans/PROJECT-[slug].md`
- Feature plans: `/specs/plans/PLAN-[slug].md`
- Task specs: Embedded in `PLAN-*.md`
- Review reports: `CODE-REVIEW-*.md` at repo root
- Branch naming: `{type}/{task-number}/{slug}`

**Missing:** `Context files: /specs/context/{identifier}.md`

This convention should be documented because downstream skills (`plan-feature`, `generate-tasks`) are expected to read these files. Without it listed, a contributor adding a new downstream skill wouldn't know this path exists.

**Fix:** Add `- Context files: /specs/context/{identifier}.md` to the Output Conventions list.

---

#### 4. `#N` pattern doesn't handle PR numbers

**File:** `dev-pipeline/skills/start-task/SKILL.md`, lines 36 and 84

The detection rule matches `#\d+` as a "GitHub issue number", and Phase 2 only uses `gh issue view`. However, `#87` could reference a **pull request**, not an issue. Running `gh issue view 87` on a PR number produces an unhelpful error.

The skill should:
1. Update the detection rule label to "GitHub issue or PR number"
2. In Phase 2, fall back to `gh pr view <NUMBER> --json title,body,labels` if `gh issue view` fails with a "not found" error (not an auth/network error)

---

### 💡 Minor / Suggestions

#### 5. Phase 2 naming differs from plan

The plan (`PLAN-start-task-skill.md`, line 202) labels Phase 2 as **"Source Merging"** but the implementation calls it **"Fetch & Merge"**. The source merging behavior (asking about local specs after remote fetch) is present in the SKILL.md (lines 90–96) but the naming doesn't match the plan. Minor, but could cause confusion during future audits.

#### 6. Fetch failure handling gap

The skill handles "CLI tool not installed" but not network failures, auth errors, or "ticket not found" after the tool check passes. If `acli jira issue view TASK-42` fails with an auth error, the developer gets a raw error with no guidance. The skill should recommend checking exit codes and reporting actionable error messages.

#### 7. Default branch detection fallback incomplete

The plan (line 100) states: *"If neither works, ask the developer which branch to sync from."* The SKILL.md does not include this fallback. If `git remote show origin | grep 'HEAD branch'` returns nothing, there's no defined behavior.

#### 8. Slug derivation guidance is vague

"2-4 word kebab-case summary derived from the task title" (line 160) can produce wildly different outputs across sessions. Adding concrete derivation rules (drop articles, keep core action + object) would improve consistency.

#### 9. Plan artifact committed with "done" statuses

`specs/plans/PLAN-start-task-skill.md` is a meta-document about building the skill itself, not a consumable feature plan. It lives at `specs/plans/` which is the same path where feature plans go — future contributors may confuse it for a downstream-consumable plan. No harm in keeping it, but worth noting.

#### 10. Description inconsistency between SKILL.md and README

- **SKILL.md line 3:** "gathers task context from Jira, GitHub, or local specs"
- **README line 20:** "gathers task context from Jira (via Atlassian CLI), GitHub (via gh), or local specs"

The README version is better because it signals dependencies upfront. Consider aligning.

---

## Assessment Matrix

| Area | Status | Notes |
|------|--------|-------|
| Plan alignment | ✅ | All 14 FR + 3 NFR covered, all 9 decisions followed |
| Plugin conventions | ✅ | Frontmatter, phases, prompts, "Must NOT" all match |
| Auto-detection | ✅ | Correct priority, confirmation step, CLI checks |
| Branch reuse/mismatch | ⚠️ | Logic sound, but skip target wrong (Critical #1) |
| Dirty working tree | ✅ | Protected with explicit confirmation |
| Context file | ✅ | Correct path, update-in-place behavior |
| Config changes | ✅ | Version bump + descriptions consistent |
| README completeness | ⚠️ | Plugin README updated, root README missed (Important #2) |
| Output conventions | ⚠️ | Context file path not listed (Important #3) |
| Error handling | ⚠️ | CLI missing handled, fetch failures not (Suggestion #6) |

---

## Required Changes Before Merge

1. **Fix Phase 3 skip target** — change "skip to Phase 4 (hand-off)" to "skip to Phase 5 (Context File)"
2. **Update root README** — add start-task to pipeline diagram, skills table, directory tree
3. **Add context file path to Output Conventions** — in `dev-pipeline/README.md`
4. **Handle `#N` as issue or PR** — update detection rule label and add `gh pr view` fallback

## Optional Improvements

5. Align Phase 2 naming with plan
6. Add fetch failure handling with actionable error messages
7. Complete default branch detection fallback
8. Add concrete slug derivation guidance
9. Align SKILL.md and README descriptions

---

## Reviewer: glm
