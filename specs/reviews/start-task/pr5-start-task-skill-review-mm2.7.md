# Code Review: `feat(dev-pipeline): add start-task skill`

**PR:** [#5](https://github.com/foyzulkarim/skills/pull/5)
**Author:** foyzulkarim
**Review Date:** 2026-04-03
**Reviewer:** superpowers:code-reviewer

---

## Summary

A new `start-task` skill for the dev-pipeline plugin that bootstraps task work by auto-detecting the task source (Jira via `acli`, GitHub via `gh`, local files, or ad-hoc), syncing with the default branch, creating a context file in `/specs/context/`, and pushing a branch with the pattern `{type}/{task-number}/{slug}`.

**Verdict:** Ready to merge — with fixes recommended for two Important issues.

---

## What Was Implemented

- **New skill:** `dev-pipeline/skills/start-task/SKILL.md` (239 lines)
- **New plan:** `specs/plans/PLAN-start-task-skill.md` (287 lines)
- **Updated:** `dev-pipeline/README.md` — pipeline diagram + `/start-task` section
- **Version bump:** `1.1.0` → `1.2.0` in `plugin.json` and `marketplace.json`

### 6-Phase Conversation Flow

1. **Detect & Confirm** — Parse user input for Jira key `[A-Z]+-\d+`, GitHub `#\d+`, file paths, or fall through to ad-hoc
2. **Fetch & Merge** — Fetch from confirmed source, check CLI tool availability, ask about local spec layering
3. **Branch Check & Sync** — Detect current branch, offer reuse if matching, stop if mismatching, sync with default branch
4. **Create & Push** — Build `{type}/{task-number}/{slug}` branch name, create, push
5. **Context File** — Write `/specs/context/{identifier}.md` with gathered task info
6. **Hand Off** — Summarize and point to `/plan-feature`

---

## Strengths

1. **SKILL.md is well-structured** — 6-phase flow maps cleanly to the plan
2. **Auto-detection is thorough** — Jira, GitHub, file path, ad-hoc — all with confirmation before fetch
3. **CLI tool checks are correct** — Hard fail when `acli`/`gh` missing, no silent degradation
4. **Branch reuse/mismatch logic is sound** — Prevents orphaning existing work (lines 112–122)
5. **Dirty working tree protected** — Asks before stash (lines 143–147)
6. **Context file placement correct** — `/specs/context/` per plan Decision #5 (not `/specs/plans/`)
7. **Plan document comprehensive** — 14 functional + 3 non-functional requirements, 9 decisions, edge cases table
8. **README pipeline diagram accurate** — Correctly positions `/start-task` before `/plan-feature`
9. **Version bump appropriate** — 1.1.0 → 1.2.0 follows semver
10. **"You Must NOT" section is strong** — Clear prohibitions including no `--force` pushes, no automatic triggering

---

## Issues

### Important

#### 1. Missing fetch failure handling
**File:** `dev-pipeline/skills/start-task/SKILL.md` (lines 76–86)

The skill handles the "CLI tool not installed" case, but does **not** handle network failures, authentication errors, or invalid ticket/issue numbers after the CLI tool check passes.

**What's wrong:** If `acli jira issue view TASK-42` fails with an auth error, network timeout, or "issue not found", the skill will fail without an actionable error message.

**Why it matters:** The developer will get a generic error with no guidance on how to recover.

**How to fix:**
```bash
# After each fetch, check exit code and report actionable error
result=$(acli jira issue view <TICKET-KEY> 2>&1)
if [ $? -ne 0 ]; then
  echo "Failed to fetch <TICKET-KEY>. This could mean:"
  echo "  - The ticket doesn't exist or you don't have access"
  echo "  - There's a network issue"
  echo "  - Authentication with 'acli' needs to be refreshed"
  echo "Please verify the ticket key and your authentication."
  exit 1
fi
```

---

#### 2. Default branch detection fallback gap
**File:** `dev-pipeline/skills/start-task/SKILL.md` (lines 128–141)

The plan (line 100) explicitly states: *"If neither [main nor master] works, ask the developer which branch to sync from."*

**What's wrong:** The SKILL.md does not include this fallback. If `main` doesn't exist and `git remote show origin | grep 'HEAD branch'` returns nothing or an unexpected format, the skill has no defined behavior.

**Why it matters:** The skill will fail or behave unpredictably on repos with non-standard default branch names.

**How to fix:**
Add after line 141:
> *"If the default branch cannot be detected automatically, ask the developer: 'I couldn't detect the default branch. Which branch should I sync from?'"*

---

### Minor

#### 3. `git status` check timing
**File:** `dev-pipeline/skills/start-task/SKILL.md` (line 143)

The dirty working tree check is documented under "Branch Check & Sync", but it only applies when *switching* branches. If the developer is already on `main`/`master` (no switch needed), the stash prompt never fires — even if they have uncommitted changes on the default branch.

**Why it matters:** A developer with uncommitted changes on `main` could proceed through the skill without realizing their work is at risk when the branch is created.

**How to fix:** Always run `git status` before checkout operations, not just when switching for a mismatched branch.

---

#### 4. Slug derivation guidance vague
**File:** `dev-pipeline/skills/start-task/SKILL.md` (line 160)

"2-4 word kebab-case summary derived from the task title" leaves room for wildly different outputs.

**Why it matters:** Inconsistent slug generation across sessions makes branch names unpredictable.

**How to fix:** Add concrete derivation guidance:
> *"Drop articles (a, an, the), prepositions, and helper verbs. Keep the core action and object. Example: 'Add the ability for users to reset their password via email link' → 'add-user-password-reset'."*

---

#### 5. Phase naming inconsistency
**File:** `dev-pipeline/skills/start-task/SKILL.md` vs `specs/plans/PLAN-start-task-skill.md`

The plan labels Phase 2 as "Source Merging" but SKILL.md calls it "Fetch & Merge". The "ask about local specs" behavior (plan lines 51–58) is present in the SKILL.md (lines 90–96) but not named explicitly as its own phase.

**Why it matters:** Could cause confusion during future audits or handoffs.

**How to fix:** Either add "Source Merging" as a sub-heading in Phase 2, or update the plan to match SKILL.md naming.

---

## Recommendations

1. Wrap `acli` and `gh` calls with exit code checks + actionable error messages covering auth, network, and not-found failure modes
2. Complete default branch detection fallback — add explicit "ask developer" step when detection fails
3. Align Phase 2 naming between plan and SKILL.md to avoid future confusion
4. Consider adding a quick "failure modes" reference section to SKILL.md for runtime agent guidance

---

## Assessment

| Area | Status |
|------|--------|
| Plan alignment | ✅ All 14 functional and 3 non-functional requirements addressed |
| SKILL.md completeness | ✅ 6 phases, all behaviors, all constraints covered |
| Auto-detection | ✅ Jira, GitHub, file path, ad-hoc — with confirmation |
| CLI tool checks | ✅ Hard fail with clear message |
| Branch reuse/mismatch | ✅ Correct 3-case handling |
| Dirty working tree | ✅ Protected, but timing could be improved |
| Context file | ✅ Correct path (`/specs/context/`), update-in-place behavior |
| README updates | ✅ Pipeline diagram accurate, description clear |
| Version bump | ✅ 1.1.0 → 1.2.0 appropriate for new feature |
| Plan quality | ✅ Comprehensive with decisions, edge cases, scope boundaries |

**Ready to merge?** Yes — with fixes for the two Important issues.

**Reasoning:** Core implementation is solid and faithful to the plan. The Important issues (fetch failure handling, default branch fallback) are gaps that could cause confusing runtime failures. They are straightforward to fix and don't require re-architecture.

---

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `dev-pipeline/skills/start-task/SKILL.md` | New | +239 |
| `specs/plans/PLAN-start-task-skill.md` | New | +287 |
| `dev-pipeline/README.md` | Updated | +14/-1 |
| `dev-pipeline/.claude-plugin/plugin.json` | Version bump | +2/-2 |
| `.claude-plugin/marketplace.json` | Version bump | +2/-2 |
