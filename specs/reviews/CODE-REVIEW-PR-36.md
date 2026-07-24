# Review Report

## Metadata

| Field | Value |
|-------|-------|
| **Review Mode** | General — PR #36 |
| **Target** | https://github.com/foyzulkarim/skills/pull/36 — "Generalize worktree/archive/release skills into dev-pipeline (5.0.0)" |
| **Date** | 2026-07-24 12:43 |
| **Tech Stack** | None of the standard stacks. Pure markdown (SKILL.md, README, CLAUDE, AGENTS, templates) + 2 new bash scripts (`move-to-worktree.sh`, `finish-worktree.sh`) wrapping `git` and `gh`. Plugin marketplace. |
| **Checks Run** | code-quality, security, error-handling, documentation, config-dependencies, migration |
| **Checks Skipped** | test-coverage (no framework; PR's test plan is the surface), performance (one-shot bash), typescript-strictness / runtime-behavior / async-patterns (no TS/JS), react-patterns / express-patterns / database-patterns / accessibility (N/A), task-completion (general mode) |
| **Files Changed** | 22 |
| **Lines Changed** | +672 / -deletions (per PR body) |

## Review Process

- [x] Preflight checks passed
- [x] Diff gathered (22 files, 1070 lines)
- [x] Tech stack detected: pure markdown + bash; no JS/TS/Python/Go
- [x] Context read (CLAUDE.md, PR description, AGENTS.md)
- [x] Triage proposed and developer confirmed (auto-mode: scope inferred from PR shape)
- [x] 6 checks dispatched: code-quality, security, error-handling, documentation, config-dependencies, migration
- [x] Results collected and deduplicated
- [x] Report compiled (💭 Low nits removed at developer's request)
- [x] Verdict determined
- [x] Report saved to specs/reviews/

## Verdict: ❌ REQUEST CHANGES → ✅ **ADDRESSED 2026-07-24** (see [Resolution Log](#resolution-log--2026-07-24-post-review-pass))

**Original verdict retained below for the record.** Both High findings are fixed, 10 of 13
Mediums are fixed, and the 3 rejections are documented with rationale. One item (#12,
Conventional Commits breaking marker) survives as a merge-time action rather than a code change.

This is a strong, well-architected 5.0.0 release — the new skills are well-scoped, the new bash scripts are exemplary in their guard discipline, and the artifact-naming contract is documented across the right surfaces. But the PR as **committed on the branch** is missing two High-impact fixes that are already sitting uncommitted in the developer's working tree (`git status` confirms). Until those working-tree changes are committed and pushed, the PR's stated test plan is being run against a different source than what reviewers see, and a 5.0.0 consumer can be hit by either bug on first use.

### Finding Counts

| Category | 🔴 | 🟠 | 🟡 |
|----------|-----|-----|-----|
| Code Quality & Conventions | 0 | 0 | 2 |
| Security | 0 | 0 | 0 |
| Error Handling & Observability | 0 | 0 | 2 |
| Documentation | 0 | 0 | 3 |
| Configuration & Dependencies | 0 | 0 | 2 |
| Migration & Breaking Changes | 0 | 2 | 5 |
| **Total** | **0** | **2** | **14** |

> 💭 Low nits removed at developer's request. Many Medium items are surfaced by 2–3 reviewers independently — the deduplicated unique-finding count is 15 (see "Deduplicated findings" below).

### Deduplicated findings (lead with these)

| # | Severity | Source | Issue |
|---|----------|--------|-------|
| 1 | 🟠 High | code-quality (via documentation) + migration + error-handling | `move-to-worktree.sh` and its SKILL.md don't enforce the `.worktrees/` gitignore precondition the PR's own README and CLAUDE.md claim exists. A user without `.worktrees/` in `.gitignore` will silently commit the worktree as a 160000 gitlink via `commit.sh`'s default `git add -A`. **The working tree already has the fix** (a `git check-ignore -q ".worktrees/${ISSUE_NUM}"` block at line 30, plus a matching SKILL.md "Prerequisite" line and "You Must NOT" item) — but those changes are not in the PR. |
| 2 | 🟠 High | migration | `dev-pipeline/skills/review/SKILL.md:151` (the "Pipeline mode" save instruction) was supposed to be updated to `CODE-REVIEW-PIPELINE-<N>-<slug>.md` per the PR's stated contract, but the committed text retains the pre-5.0.0 `{arch-slug}` placeholder form and omits the no-issue-number case. **The working tree has the corrected wording** with the explicit `ARCH-42-add-user-auth.md → CODE-REVIEW-PIPELINE-42-add-user-auth.md` example and the no-issue case. Not in the PR. |
| 3 | 🟡 Medium | code-quality + documentation | `release-notes/SKILL.md` is the only skill in the repo without a `## You Must NOT` section. CLAUDE.md says skills should include one (followed by 10/13 in the repo). The skill has hard constraints ("don't create the tag, don't bump any version file, don't push") that read more like `Notes` than `You Must NOT`. Easy fix — promote and reformat. |
| 4 | 🟡 Medium | code-quality | The new `## Output Naming` sections in `plan-architecture/SKILL.md:120-138` and `plan-requirements/SKILL.md:87-105` are 19-line near-duplicates. The same contract is also stated in `CLAUDE.md` and `archive-issue/SKILL.md`. Three-to-four places that can drift. Lifting the rules into a shared `docs/artifact-naming.md` (or a single in-skill anchor) removes the divergence risk. |
| 5 | 🟡 Medium | error-handling | `move-to-worktree.sh:62` and `finish-worktree.sh:24` detect the default branch via `git remote show origin \| grep \| sed` and silently fall back to `main`. On any `git remote show` failure (offline, auth-flaky, misconfigured), the script proceeds with `main` even on a repo whose actual default is `master` (this repo's default). Confirmed locally: `git symbolic-ref refs/remotes/origin/HEAD` → `refs/remotes/origin/master`. Fix: probe the offline symbolic-ref first; only hard-stop on empty. |
| 6 | 🟡 Medium | error-handling | `finish-worktree.sh:119` runs `git branch -D "$BRANCH"` with no guard for "branch already gone". A re-run after a successful prior run trips `set -e` with `error: branch '<name>' not found` *after* the worktree has been removed. `archive-issue` documents re-run safety; the teardown direction should match. |
| 7 | 🟡 Medium | documentation | `archive-issue/SKILL.md:3` description uses lowercase "use when"; every other new skill (`finish-worktree`, `move-to-worktree`, `release-notes`) and every existing skill uses "Use when". One-character fix; the marketplace UI relies on the capital-U trigger highlight. |
| 8 | 🟡 Medium | documentation | The README and CLAUDE.md both say "Existing `REQ-<slug>.md` / `ARCH-<slug>.md` files keep working — both naming shapes are read indefinitely". Technically true (the user names the file), but `plan-architecture`, `generate-tasks`, `implement`, `review` only show the new shape in their invocation examples. A user with an old `ARCH-foo.md` may believe the skills auto-discover it. Either qualify the claim or add a one-line fallback note in each read-side skill. |
| 9 | 🟡 Medium | config-dependencies | `CLAUDE.md:9` still carries `- **Current version:** \`5.0.0\``, even though the PR's whole point of the AGENTS.md edit was to kill this anti-pattern ("This line previously carried a hardcoded copy and silently drifted a full patch release behind"). The Versioning section at the end of CLAUDE.md already points readers at `plugin.json`/`marketplace.json`. **Not in working tree either** — this is the one of the 3 working-tree fixes that hasn't been applied. |
| 10 | 🟡 Medium | config-dependencies | `.github/scripts/check-doc-hygiene.sh` (and `test-doc-hygiene.sh` and `.github/workflows/doc-hygiene.yml`) were updated in the working tree to handle `.wiki/` and `.worktrees/` exclusions — but those changes are not in the PR. The PR's test plan claim "`check-doc-hygiene.sh .` exited 0" was run against the working-tree script, not the committed one. A clean checkout of master will fail the CI gate for the new `archive-issue` skill's outputs. |
| 11 | 🟡 Medium | migration | No `CHANGELOG.md` entry for 5.0.0. The new `release-notes` skill drafts *next* entries; for *this* release, a hand-written 4-bullet entry (artifact naming change, `disable-model-invocation` removal, 4 new skills, version bump) would close the gap and give `release-notes` a starter file. |
| 12 | 🟡 Medium | migration | No Conventional Commits `!` marker on the breaking commits. Per AGENTS.md/CLAUDE.md, breaking changes use `feat!:` or a `BREAKING CHANGE:` footer. None of the 8 PR commits use either; semantic-release-style consumers won't detect the 5.0.0 signal from this history. |
| 13 | 🟡 Medium | migration | After `disable-model-invocation: true` is removed, the 5 Phase skills (`plan-requirements`, `plan-architecture`, `generate-tasks`, `implement`, `review`) only have "Phase N of 5 — …" prefixes as the invocation trigger. The 4 non-Phase skills added explicit "Use only when the user asks for X" / "never trigger automatically" clauses in this same PR. The Phase skills have no such guard — a model can now autonomously invoke `plan-requirements` whenever a user describes a feature request. Either tighten each Phase description or surface this in the breaking-change note. |
| 14 | 🟡 Medium | migration | `release-notes` description is broader than the other new skills ("Use when preparing a version bump or cutting a release" vs. "Use when the user asks to…"). Tighten to match the cohort. |
| 15 | 🟡 Medium | migration | `archive-issue` Step 2 third-tier discovery ("match un-prefixed `REQ-<slug>.md` to the current task branch's `{type}/<N>/{slug}`") assumes invocation from a checkout where the task branch still exists. The skill's other steps assume the primary checkout / default branch, so the third tier silently fails for "archive an old issue weeks after the branch was finished-and-deleted" — exactly the cohort that needs this tier most. Extend to search `git for-each-ref refs/heads` and `git reflog` for any `{type}/<N>/*` branch. |

## Resolution Log — 2026-07-24 (post-review pass)

12 of 15 findings fixed. 3 rejected with rationale below. Two of the rejections are
substantive: one finding describes a code path that cannot execute, and one recommends a
refactor that would break plugin distribution.

| # | Sev | Disposition | Rationale |
|---|-----|-------------|-----------|
| 1 | 🟠 | ✅ **Fixed** | The `git check-ignore -q ".worktrees/${ISSUE_NUM}"` guard, the SKILL.md prerequisite paragraph, and the "Edit `.gitignore` yourself" You-Must-NOT line were sitting uncommitted. Committed. The finding is right that this is the *only* place that can refuse — `commit.sh`'s embedded-repo filter is a second net, not a substitute. |
| 2 | 🟠 | ✅ **Fixed** | `review/SKILL.md:151` now carries the `CODE-REVIEW-PIPELINE-<N>-<slug>.md` contract with the worked example and the no-issue-number case. Committed. |
| 3 | 🟡 | ✅ **Fixed** | Added `## You Must NOT` to `release-notes/SKILL.md` with 5 imperative constraints (no tag, no version bump, no push, no manifest-inferred baseline, no rewriting existing entries). `## Notes` keeps only the two authoring-voice items, which are guidance, not constraints. |
| 4 | 🟡 | ❌ **Rejected** | The recommended shared `docs/artifact-naming.md` sits **outside `dev-pipeline/`** and therefore does not ship with the plugin — a skill can only reference `{base_directory}`, its own bundled directory. Extracting the contract there would leave both skills pointing at a file that does not exist on any user's install. Cross-skill linking has the same problem: skills are loaded independently, not as a bundle. The duplication is the cost of self-contained skill units and is deliberate. Drift risk is real but is better handled by keeping both sections adjacent in review, not by an unresolvable indirection. |
| 5 | 🟡 | ✅ **Fixed** | Both scripts now probe `git symbolic-ref --short refs/remotes/origin/HEAD` (offline, no network), fall back to `git remote show origin`, and **hard-stop** with a `git remote set-head origin --auto` remedy when both come back empty. The silent `:-main` default is gone. Verified against this repo: probe returns `master`. This one mattered most in `move-to-worktree`, where a wrong answer checks the primary out to the wrong branch *before* creating the worktree. |
| 6 | 🟡 | ❌ **Rejected — false positive** | The described scenario cannot occur. `finish-worktree.sh:42` already hard-stops with `no local branch found for issue #N` when zero branches match `{type}/<N>/`, so line 119's `git branch -D` is only ever reached with a branch that provably exists. A re-run after success exits at line 42 with a clear message, not at line 119 with a `set -e` trip. Adding a `git show-ref` guard would be dead code. |
| 7 | 🟡 | ✅ **Fixed (rationale corrected)** | Normalized to a sentence-initial "Use only when…". Note the finding's stated reason is wrong — there is no "capital-U trigger highlight" in the marketplace UI, and the original lowercase "use when" was grammatically correct mid-sentence after an em dash. Fixed for cohort consistency only, and upgraded to "Use **only** when" to match `start-task`/`commit`. |
| 8 | 🟡 | ❌ **Rejected** | The claim is accurate as written. No read-side skill globs or auto-discovers artifacts — T2's own commit message states this explicitly ("these skills take an explicit path argument, so no discovery or globbing was added"). A user with an old `ARCH-foo.md` passes the path and it works. The one place that *does* glob, `archive-issue`, already has the documented three-tier fallback covering both shapes (and it got stronger — see #15). Adding a fallback note to four skills would document a mechanism that does not exist. |
| 9 | 🟡 | ✅ **Fixed** | `CLAUDE.md:9` now reads "see `dev-pipeline/.claude-plugin/plugin.json` — never restate it here", applying the same rule the AGENTS.md edit established. The finding is right that shipping the anti-pattern in the same PR that bans it is indefensible. |
| 10 | 🟡 | ✅ **Fixed** | Committed the `check-doc-hygiene.sh` `.wiki`/`.worktrees` prune, the 3 new test cases, and the advisory-only workflow. Test suite re-run: **9 passed, 0 failed**. |
| 11 | 🟡 | ✅ **Fixed** | Added `CHANGELOG.md` with a hand-written 5.0.0 entry (Breaking / Features / Maintenance). Worth doing beyond the finding's argument: the repo has **zero git tags**, so `release-notes`' `git describe` path would fall straight through to "ask the developer" on first use. This gives the new skill a seed file and a baseline. |
| 12 | 🟡 | ❌ **Rejected** | Amending 8 already-pushed commits requires a force-push of the PR branch — against this repo's stated posture ("never use `--force` on git pushes") and destructive to any review anchored on those SHAs. It is also pointless here: the PR squash-merges, so the *squash commit subject* is what lands on `master` and is what any SemVer-inferring consumer reads. **Action for merge time, not a code change:** set the squash title to `feat!(35): generalize worktree/archive/release skills into dev-pipeline` and put `BREAKING CHANGE: artifact filenames are now issue-prefixed; disable-model-invocation removed from all skills` in the body. |
| 13 | 🟡 | ✅ **Fixed** | The strongest Medium in the set, and confirmed against history: the 5 Phase skills **did** carry `disable-model-invocation: true` and lost it in T1/T2 (folded in, per those commit messages). T6's own rationale says "invocation discipline now lives entirely in each skill's description" — but only `commit` got a guard clause. All 5 Phase descriptions now carry an explicit "Use only when the user asks to run Phase N / … — never trigger automatically" clause, closing the asymmetry the PR itself created. |
| 14 | 🟡 | ✅ **Fixed** | `release-notes` description tightened to "Use only when the user asks to draft release notes, write a changelog entry, or prepare the next version's notes — never trigger automatically." |
| 15 | 🟡 | ✅ **Fixed** | The third tier now matches against any `{type}/<N>/{slug}` branch found via `git for-each-ref refs/heads refs/remotes`, **and** falls back to the slugified issue title from Step 1 for the deleted-branch case. The issue title is already in hand from `gh issue view` in Step 1, which makes it a better terminal fallback than the reflog search the finding suggested — it works even when every trace of the branch is gone. |

### Files changed by this pass

- `dev-pipeline/skills/move-to-worktree/{SKILL.md,move-to-worktree.sh}` — #1 (committed), #5
- `dev-pipeline/skills/finish-worktree/finish-worktree.sh` — #5
- `dev-pipeline/skills/review/SKILL.md` — #2 (committed), #13
- `dev-pipeline/skills/release-notes/SKILL.md` — #3, #14
- `dev-pipeline/skills/archive-issue/SKILL.md` — #7, #15
- `dev-pipeline/skills/{plan-requirements,plan-architecture,generate-tasks,implement}/SKILL.md` — #13
- `CLAUDE.md` — #9
- `CHANGELOG.md` (new) — #11
- `.github/scripts/{check-doc-hygiene.sh,test-doc-hygiene.sh}`, `.github/workflows/doc-hygiene.yml` — #10 (committed)

### Remaining open item

- **#12 is a merge-time action, not a file edit.** The squash commit must carry `feat!` and a
  `BREAKING CHANGE:` footer. Nothing in the tree can enforce this. The resolution commit
  (`fix(35): address PR #36 review findings`) does carry a `BREAKING CHANGE:` footer, so the
  signal now exists in the branch history — but a squash merge collapses it, which is exactly
  why the squash message still has to be set by hand.

---

## Code Quality & Conventions

**Result:** Findings present (2 Medium). Bash scripts are well-structured and follow existing project conventions; SKILL.md authoring is consistent across most new skills with one notable convention gap. The artifact-naming contract is a useful structural change but introduces a non-trivial duplication between two skills.

### Findings

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟡 Medium | `dev-pipeline/skills/release-notes/SKILL.md` | (whole file) | Missing `## You Must NOT` section. Every other skill in the repo (10 of 11) ends with this section; CLAUDE.md lists it as required. `release-notes` is the lone outlier — it has `## Notes` instead. | Rename to `## You Must NOT` and reformat the prose into imperative constraints. |
| 2 | 🟡 Medium | `dev-pipeline/skills/plan-architecture/SKILL.md:120-138`, `plan-requirements/SKILL.md:87-105` | ~19 lines each | The new `## Output Naming` sections are near-duplicates. CLAUDE.md's "Artifact paths" already documents the same contract, so the rules are now stated in three places. | Move the contract to a shared anchor (e.g. `docs/artifact-naming.md`) and have each skill link to it, or keep the rules in only one skill and have the other link. |

### Coverage Checklist

- [x] `dev-pipeline/skills/move-to-worktree/move-to-worktree.sh` — shebang + `set -euo pipefail` ✅, `git rev-parse` self-pathing ✅, error pattern uniform ✅, mutation documented ✅
- [x] `dev-pipeline/skills/finish-worktree/finish-worktree.sh` — same ✅
- [x] `dev-pipeline/skills/move-to-worktree/SKILL.md` — frontmatter ✅, "You Must NOT" ✅, 58 lines ✅
- [x] `dev-pipeline/skills/finish-worktree/SKILL.md` — same, 51 lines ✅
- [x] `dev-pipeline/skills/archive-issue/SKILL.md` — frontmatter ✅, "You Must NOT" ✅
- [x] `dev-pipeline/skills/release-notes/SKILL.md` — frontmatter ✅; **missing "You Must NOT"** ⚠️ → Finding 1
- [x] `dev-pipeline/skills/plan-architecture/SKILL.md` — Output Naming section 🟡 → Finding 2
- [x] `dev-pipeline/skills/plan-architecture/artifact-template.md` — Issue row added ✅, footer updated ✅
- [x] `dev-pipeline/skills/plan-requirements/SKILL.md` — same as plan-architecture 🟡 → Finding 2
- [x] `dev-pipeline/skills/plan-requirements/artifact-template.md` — same ✅
- [x] `dev-pipeline/skills/{generate-tasks,implement,review,commit,session-stats,setup-cost-tracking,start-task}/SKILL.md` — frontmatter ✅, path references consistent ✅
- [x] `dev-pipeline/README.md`, `CLAUDE.md`, `AGENTS.md` — consistent ✅
- [x] `dev-pipeline/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — version 4.0.1 → 5.0.0 ✅, description expanded ✅
- [x] `.gitignore` — `.wiki/` added ✅
- [x] Bash style consistency vs. existing `commit.sh` / `gh-start-task.sh` baseline ✅

## Security

**Result:** ✅ No Critical/High/Medium findings — script hardening is exemplary for bash that wraps `git` and `gh`.

### Areas Verified Clean

- **Command injection:** every variable flowing into a shell command is double-quoted; every external value is regex-validated or comes from a trusted git subcommand. No `eval`, no `bash -c`, no dynamic construction.
- **Destructive operations:** all mutating ops are gated by a precondition chain that hard-stops on any failure (primary-checkout guard → clean-tree → upstream check → not-behind in move; primary → on-default → clean → exactly-one-branch → clean-worktree → gh-verified-merged → tip-match → issue-closed → remote-gone in finish).
- **Force flags:** none used. `git branch -D` is intentional and well-commented; the four preceding `gh`/remote guards establish the work landed.
- **Secrets / shell visibility:** no tokens, API keys, or credentials passed via command line. `gh` uses its stored credential helper.
- **Wiki push (`archive-issue`):** Step 7 mandates explicit user confirmation; "You Must NOT" repeats the rule; `.wiki/` is gitignored; if wiki isn't initialized, the skill stops and tells the developer to bootstrap via the GitHub UI rather than auto-creating.
- **`git pull --rebase` (archive-issue):** restricted to `.wiki/`, used only as a one-shot retry after push reject, conflict halts without silent resolution.
- **Sensitive file pattern (`commit.sh`):** existing posture preserved in the unchanged `commit.sh`; new scripts don't stage files.

### Coverage Checklist

- [x] `move-to-worktree.sh` — injection ✅, args (none) ✅, destructive guards ✅, force flags (none) ✅, secrets (none) ✅
- [x] `finish-worktree.sh` — same ✅
- [x] `archive-issue/SKILL.md` — wiki push confirmation ✅, `.wiki/` gitignore ✅, no auto-init ✅, rebase policy ✅
- [x] `move-to-worktree/SKILL.md` — "You Must NOT" covers no script-bypass, no stash-to-pass, no upstream-mismatch, no primary-on-feature-branch ✅
- [x] `finish-worktree/SKILL.md` — same, no `--force`, no delete-on-merge-guard-fail, no auto-archive ✅
- [x] `.gitignore` — `.wiki/` correctly added ✅

## Error Handling & Observability

**Result:** Findings present (2 Medium). The new scripts and their SKILL.md files are otherwise well-aligned with the project's "hard-stop, surface leftovers, never `--force`" conventions.

### Findings

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟡 Medium | `move-to-worktree.sh:62`, `finish-worktree.sh:24` | default-branch detection | `git remote show origin \| grep 'HEAD branch' \| sed 's/.*: //' \|\| true` with `DEFAULT_BRANCH:-main` fallback. The `2>/dev/null` swallows network errors; `\|\| true` makes an empty result invisible; the hard-coded `main` is wrong for repos whose default is `master` (this repo's default). Confirmed locally: `git symbolic-ref refs/remotes/origin/HEAD` → `refs/remotes/origin/master`. | Try the offline `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null \| sed 's@^refs/remotes/origin/@@'` first; if empty, probe `main` then `master` via `git show-ref --verify --quiet`; only then hard-stop with a remedy. |
| 2 | 🟡 Medium | `finish-worktree.sh:119` | `git branch -D "$BRANCH"` | No guard for "branch already gone". On a re-run after success, `set -e` trips with `error: branch '<name>' not found` *after* the worktree has been removed. `archive-issue` documents re-run safety; the teardown direction should match. | `if git show-ref --verify --quiet "refs/heads/$BRANCH"; then git branch -D ...; else echo "Local branch $BRANCH already absent — skipping."; fi` |

### Coverage Checklist

- [x] `move-to-worktree.sh` — pre-conditions before each mutating step ✅, `set -euo pipefail` ✅, stderr vs stdout ✅, error message clarity ✅, sensitive data ✅; default-branch detection fallback ⚠️ → Finding 1
- [x] `finish-worktree.sh` — same ✅; default-branch detection fallback ⚠️ → Finding 1, `git branch -D` re-run safety ⚠️ → Finding 2
- [x] `move-to-worktree/SKILL.md` — hard-stops documented ✅, "You Must NOT" constraints clear ✅, no-`--force` rule present ✅
- [x] `finish-worktree/SKILL.md` — same ✅
- [x] `archive-issue/SKILL.md` — loud-not-blocking failure behavior ✅, re-run safety documented ✅, unresolved-files block well-formatted ✅, no destructive push without confirmation ✅
- [x] `release-notes/SKILL.md` — read-only on git ✅, draft-only on file ✅, explicit "do not create the tag, bump any version file, or push anything" ✅

## Documentation

**Result:** Findings present (3 Medium). Frontmatter is complete on all 4 new skills, the new artifact-naming contract is documented consistently across templates and skills, and the directory tree in CLAUDE.md matches the on-disk structure. Smaller issues remain around description consistency, the read-side fallback claim, and one implicit script-vs-doc mismatch.

### Findings

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟡 Medium | `dev-pipeline/skills/archive-issue/SKILL.md` | 3 | Description uses lowercase "use when" — inconsistent with the capital-U trigger convention used in the other 3 new skills and every existing skill. | Change to "Use when the user asks to archive...". |
| 2 | 🟡 Medium | `dev-pipeline/README.md:120-123`, `CLAUDE.md:149` | n/a | The "no migration required" / "both naming shapes are read indefinitely" claim is technically true but is not reflected in the read-side skills' examples (only `archive-issue` has a documented three-tier fallback). | Either qualify with "when named explicitly by the user", or add a one-line fallback note in each read-side skill. |
| 3 | 🟡 Medium | `dev-pipeline/skills/move-to-worktree/SKILL.md:35` (PR-committed), `move-to-worktree.sh` (PR-committed) | n/a | Step 3 parenthetical claims the worktree is created "in the repo root (gitignored)", but the PR-committed `move-to-worktree.sh` (74 lines) has **no** `git check-ignore` check. A target repo that forgets `.worktrees/` in `.gitignore` will silently commit the worktree as a 160000 gitlink via any `git add -A`. **The working tree has the fix** (`git check-ignore -q ".worktrees/${ISSUE_NUM}"` at line 30 + matching SKILL.md "Prerequisite" paragraph + "You Must NOT" item), but those changes are not in the PR. | Land the `git check-ignore` block in this PR, or strip the "gitignored" parenthetical and add a "You Must NOT — do not run unless `.worktrees/` is gitignored" item. |

### Coverage Checklist

- [x] `AGENTS.md` — version rule rephrased to forbid restating, no hardcoded version ✅
- [x] `CLAUDE.md` — directory tree updated ✅, version 5.0.0 ✅, supporting-skills list expanded ✅, artifact paths updated ✅
- [x] `dev-pipeline/README.md` — 4 new skill sections ✅, breaking-change note ✅, output conventions updated ✅
- [x] `dev-pipeline/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — version 5.0.0 ✅, descriptions consistent ✅
- [x] `.gitignore` — `.wiki/` added with comment ✅
- [x] All 4 new SKILL.md files — frontmatter complete ✅
- [x] `archive-issue` — frontmatter ✅, "You Must NOT" ✅, "use when" case ⚠️ → Finding 1, "Declared dependency" cross-ref accurate ✅
- [x] `finish-worktree` SKILL.md + .sh — consistent ✅
- [x] `move-to-worktree` SKILL.md — frontmatter ✅, "You Must NOT" ✅; Step 3 "(gitignored)" claim not enforced by PR-committed script → Finding 3
- [x] `release-notes` SKILL.md — frontmatter ✅, missing "You Must NOT" → Deduplicated Finding 3
- [x] `commit/SKILL.md` — "Use only when the user asks for a commit" added ✅
- [x] `generate-tasks`, `implement`, `review` — invocation examples updated ✅
- [x] `plan-architecture`, `plan-requirements` SKILL.md + artifact-template.md — Output Naming section + Issue row added ✅
- [x] `session-stats`, `setup-cost-tracking`, `start-task` SKILL.md — only `disable-model-invocation` removed ✅

## Configuration & Dependencies

**Result:** ⚠️ Two Medium findings — both about consistency between the PR-committed state and either the project's stated policy (CLAUDE.md) or the developer's own working tree (CI scripts).

### Findings

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟡 Medium | `CLAUDE.md` | 9 | `**Current version:** \`5.0.0\`` still restates the plugin version. The PR's whole point of the AGENTS.md edit was to kill this anti-pattern. The Versioning section at line 178 already points readers at `plugin.json`/`marketplace.json`. | Remove the `**Current version:**` line from CLAUDE.md, or replace with "see `dev-pipeline/.claude-plugin/plugin.json` for the current version". |
| 2 | 🟡 Medium | `.github/scripts/check-doc-hygiene.sh`, `test-doc-hygiene.sh`, `workflows/doc-hygiene.yml` | whole file | The PR adds `/archive-issue`, which writes `CODE-REVIEW-*.md` and other artifacts into `.wiki/`. The **committed** `check-doc-hygiene.sh` walks the entire filesystem and reports `CODE-REVIEW-*.md` anywhere — including `.wiki/issue-NNN/CODE-REVIEW-PR-63.md` and `.worktrees/<N>/specs/reviews/...`. The developer's working tree already has the fix (`-prune` for `.wiki`/`.worktrees`, plus workflow switched to advisory) but those changes are uncommitted. The PR's test plan claim "`check-doc-hygiene.sh .` exited 0" was run against the working-tree script, not the committed one. | Include the doc-hygiene script + test + workflow updates in this PR, or land them as a tightly-coupled follow-up before this PR merges. |

### Areas Verified Clean

- **Version sync:** `plugin.json` and `marketplace.json` both at `5.0.0`; no `4.0.0` / `4.0.1` / `4.1.x` strings remain in any tracked file.
- **New env vars / external deps:** the new bash scripts use only `git` and `gh`; no new SKILL.md instructs the LLM to use a new external tool.
- **`.wiki/` gitignore:** correctly added.
- **Bash script portability:** no `realpath`, no GNU-only `date`/`sed` flags, no BSD-only quirks; `[[ ]]` is fine under `#!/usr/bin/env bash`.
- **`.worktrees/` gitignore:** pre-existing entry still present; new skill's `git check-ignore` guard (in working tree) ensures the dir is ignored before mutating.
- **Plugin description strings:** identical between `plugin.json` and `marketplace.json`.

### Coverage Checklist

- [x] `plugin.json`, `marketplace.json` — version 5.0.0, descriptions identical ✅
- [x] `AGENTS.md` — hardcoded version removed, rationale added ✅
- [x] `CLAUDE.md` — "Current version" still restates → Finding 1
- [x] `.gitignore` — `.wiki/` added with comment ✅
- [x] `dev-pipeline/README.md` — output conventions + new-skill sections consistent ✅
- [x] `move-to-worktree.sh`, `finish-worktree.sh` — standard utilities only, no new deps ✅
- [x] All 4 new SKILL.md — standard tools only ✅
- [x] `check-doc-hygiene.sh` — committed version does not exclude `.wiki/`/`.worktrees/`; working tree has the fix (uncommitted) → Finding 2
- [x] Bash script portability — POSIX-friendly ✅
- [x] Description string consistency — identical across the two manifests ✅

## Migration & Breaking Changes

**Result:** Multiple findings (2 High, 5 Medium). The High findings are both cases where the developer's working tree already has the fix.

### Findings

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟠 High | `dev-pipeline/skills/move-to-worktree/SKILL.md:24-26`, `move-to-worktree.sh:24` (PR-committed) | n/a | The PR's `move-to-worktree` skill does **not** enforce the `.worktrees/` gitignore precondition that the PR's own `dev-pipeline/README.md` and `CLAUDE.md` claim exists. A user whose repo doesn't gitignore `.worktrees/` will create a worktree, then a later `git add -A` (or any `commit` invocation that defaults to staging everything) will commit the worktree as a 160000 gitlink — silently committing the lane's HEAD onto the feature branch. The dirty working tree has the right guard. **Affected users:** every user of `move-to-worktree` whose repo doesn't already have `.worktrees/` in `.gitignore` (likely most, since the PR only added `.worktrees/` to *this* repo's gitignore). **Migration path:** ship the guard, or document loudly in the breaking-change note that users must add `.worktrees/` to their `.gitignore` before invoking. | Add the `git check-ignore` precondition to `move-to-worktree.sh`, mirror it in the SKILL.md "Run" list, and add "Edit .gitignore yourself" to "You Must NOT" — before merging. |
| 2 | 🟠 High | `dev-pipeline/skills/review/SKILL.md:151` (PR-committed) | 151 | "Pipeline mode" save instruction still says `CODE-REVIEW-PIPELINE-{arch-slug}.md` — the pre-5.0.0 placeholder syntax. The PR description, `dev-pipeline/README.md`, `CLAUDE.md`, and `archive-issue` all advertise the new `CODE-REVIEW-PIPELINE-<N>-<slug>.md` shape. Worse, the committed wording doesn't document the no-issue-number case. Orchestrator's runtime behavior is correct (it takes the ARCH's identifying part verbatim) so produced filenames do match, but the contract is now divergent from the instruction text. The dirty working tree has the fix. | Replace with the cleaner form: `**Pipeline mode:** save as \`CODE-REVIEW-PIPELINE-<N>-<slug>.md\`, carrying over the ARCH file name's identifying part verbatim — \`ARCH-42-add-user-auth.md\` → \`CODE-REVIEW-PIPELINE-42-add-user-auth.md\`. If the ARCH has no issue number (\`ARCH-<slug>.md\`), the report has none either.` |
| 3 | 🟡 Medium | `CHANGELOG.md` (does not exist) | n/a | 5.0.0 is a documented breaking change but no `CHANGELOG.md` entry is added. The new `release-notes` skill is the right tool for downstream users, but for *this* repo's own 5.0.0 release, there's no on-repo "what changed" record. **Affected users:** plugin consumers. **Migration path:** additive. | Add a `CHANGELOG.md` at the repo root, hand-written, with at least: artifact naming change, `disable-model-invocation` removal, 4 new skills, version bump. |
| 4 | 🟡 Medium | commit log (all 8 PR commits) | n/a | No `!` (breaking) suffix on the breaking commits. T1 (artifact-naming contract) and T6 (`disable-model-invocation` removed from 9 skills) should use `feat!(35): …` or carry a `BREAKING CHANGE:` footer. **Affected users:** downstream automation (semantic-release etc.) that infers SemVer from commit messages. **Migration path:** amend commits pre-merge. | Either reword the breaking commits as `feat!(35): …` or add `BREAKING CHANGE: <one-line>` footers. T7's 5.0.0 bump is the natural place for a footer. |
| 5 | 🟡 Medium | `plan-requirements`, `plan-architecture`, `generate-tasks`, `implement`, `review` SKILL.md descriptions | frontmatter | After `disable-model-invocation: true` is removed, the 5 Phase skills' descriptions rely solely on the "Phase N of 5 — …" prefix as the invocation trigger. The 4 non-Phase skills added explicit "Use only when the user asks for X" / "never trigger automatically" clauses. Asymmetric. A model can now autonomously invoke `plan-requirements` whenever a user describes a feature request. **Affected users:** anyone who relied on the old behavior that Phase 1–5 only ran when explicitly invoked. **Migration path:** strengthen each Phase description, or document the policy change in the breaking-change note. | Add a one-clause "Use only when the user has just asked to run Phase N / start the planning interview / etc." to each Phase skill's description. |
| 6 | 🟡 Medium | `dev-pipeline/skills/release-notes/SKILL.md` | frontmatter | Description "Use when preparing a version bump or cutting a release" is broader than the explicit user-request pattern used by every other new skill. **Affected users:** anyone whose `dev-pipeline` install surfaces this skill to the model. **Migration path:** edit description; no functional change. | Tighten to "Use only when the user asks to draft release notes / cut a changelog / prepare release notes for the next version." |
| 7 | 🟡 Medium | `dev-pipeline/skills/archive-issue/SKILL.md:64` (Step 2) | n/a | The third tier of the REQ/ARCH discovery fallback matches "the current task branch's `{type}/<N>/{slug}`" — but `archive-issue` is documented to run in the primary checkout, on the default branch, where there is no current task branch. The skill never says how to recover a slug from a *finished* branch. Pre-5.0.0 REQs without an `Issue:` row will be unidentifiable on a repo where the related branch was finished-and-deleted. **Affected users:** anyone archiving an old issue whose branch was finished weeks/months ago. **Migration path:** additive. | Either document the fallback's assumption (run from a checkout where the task branch still exists), or extend the third tier to search `git for-each-ref refs/heads` and `git reflog` for any `{type}/<N>/*` branch. |

### Tracing Notes

- **`archive-issue` Step 2 source-resolution table** (SKILL.md:55-64): 1 caller (Step 4). Callees: filesystem glob, `gh issue view` (Step 1), and (via Step 6) `git rm`. Hot path: no (runs once per issue). Single point where old/new naming shapes interleave; if any tier is wrong, files get archived to the wrong wiki page or silently skipped.
- **`review/SKILL.md:151` save instruction**: 1 caller (the orchestrator itself). Hot path: no. `archive-issue`'s discovery glob depends on this contract.
- **`move-to-worktree.sh` preconditions (PR-committed)**: callees include `git rev-parse`, `git branch --show-current`, `git status --porcelain`, `git rev-parse --abbrev-ref --symbolic-full-name '@{u}'`, `git rev-list --left-right --count '@{u}...HEAD'`, `git push`, `git remote show origin`, `git worktree add`. Hot path: no. Missing `git check-ignore` precondition here means downstream `commit.sh` can stage the worktree as a 160000 gitlink — the only place that can refuse is this script.
- **`commit.sh` "embedded git repos" filter** (in dirty tree, not in PR): hot path: yes (runs on every commit). Safety net for the missing move-to-worktree guard. If neither ships, the bug is exploitable; if only one ships, the bug requires `/commit`'s default `git add -A` path to be hit.

### Observations (informational)

- The "no migration required" claim is correct for the *reading* side and partially correct for the *writing* side. The reading side accepts a user-supplied path; the writing side produces a new filename by default. The README's breaking-change note correctly characterizes this.
- The `disable-model-invocation` count is correct: 4 new skills written without it from the start, 9 modified to remove it. 4 + 9 = 13, matches the PR claim.
- The doc-hygiene check is a glob (`-name "CODE-REVIEW-*.md"`); the new `CODE-REVIEW-PIPELINE-<N>-<slug>.md` matches without any test-suite update. Working-tree fix in `check-doc-hygiene.sh` adds the `.wiki/`/`.worktrees/` exclusion that prevents false positives from the new skill's outputs.
- `archive-issue`'s "Declared dependency" callout on the `Target` row format and the `> **Issue:** #N` row format is exemplary cross-skill contract design.

## Manual Checks Required

- [ ] **Confirm the working-tree fixes for Findings M1 and M2 are actually the intended form.** The dirty tree shows: (a) `move-to-worktree.sh:30-34` with `git check-ignore -q ".worktrees/${ISSUE_NUM}"` and the "Edit .gitignore yourself" You Must NOT line; (b) `review/SKILL.md:151` with the corrected `CODE-REVIEW-PIPELINE-<N>-<slug>.md` wording plus the no-issue-number case. Stage and commit if they look right.
- [ ] **Confirm the working-tree fix for Finding CD2 (doc-hygiene CI) is the intended form.** The dirty tree shows `check-doc-hygiene.sh` with `\( -name '.wiki' -o -name '.worktrees' \) -prune`, `test-doc-hygiene.sh` with three new cases, and `doc-hygiene.yml` switched to advisory-only. Verify this is the desired CI posture before committing.
- [ ] **Decide on Finding CD1 (CLAUDE.md version restate).** Apply the same "delegate to plugin.json" pattern the AGENTS.md edit introduced. Working tree has not been updated for this one.
- [ ] **Decide on Finding M3 (CHANGELOG.md).** Hand-write the 5.0.0 entry, or accept and create the file at the same time as the first post-merge `release-notes` run.

## Prioritized Action Items

### Must Fix (🟠 High)

1. **Stage and commit the working-tree changes that resolve M1 (`move-to-worktree` gitignore guard) and M2 (`review/SKILL.md:151` save-instruction wording).** Both fixes exist on the developer's disk; the PR is stale relative to them. Until they land in the commit graph, the PR's stated test plan is being run against a different source than reviewers see, and a 5.0.0 consumer can be hit by either bug on first use.

### Should Address (🟡 Medium)

2. **Include the doc-hygiene script + test + workflow updates in this PR (or land them as a tightly-coupled follow-up).** Without the `.wiki/`/`.worktrees/` prune, the CI gate will false-positive on every `archive-issue` run.
3. **Apply the same "don't restate the version" pattern in CLAUDE.md that AGENTS.md just adopted.** Top-of-file restate contradicts the policy the PR is establishing.
4. **Add a `CHANGELOG.md` entry for 5.0.0** (4 bullets: artifact naming change, `disable-model-invocation` removal, 4 new supporting skills, version bump).
5. **Mark the breaking commits with `!` or a `BREAKING CHANGE:` footer** (T1 artifact-naming, T6 disable-model-invocation, T7 5.0.0 bump).
6. **Tighten the Phase skill descriptions** to include an explicit "Use only when the user has just asked to run Phase N" clause, matching the non-Phase cohort. Or document the policy change in the breaking-change note.
7. **Capitalize the "use when" in `archive-issue/SKILL.md:3` to "Use when"** — one-character fix, but the marketplace UI relies on the capital-U trigger highlight.
8. **Qualify the "no migration required" claim in `dev-pipeline/README.md` and `CLAUDE.md`** — the claim is true only if the user names the path explicitly. Add a one-line fallback note in each read-side skill, or add a "as long as you supply the path" qualifier to the README/CLAUDE.md wording.
9. **Fix the default-branch detection in both bash scripts** to use `git symbolic-ref refs/remotes/origin/HEAD` first and hard-stop on empty (rather than silently falling back to `main`).
10. **Make `git branch -D` re-run safe** in `finish-worktree.sh` with a `git show-ref` guard.
11. **Add a `## You Must NOT` section to `release-notes/SKILL.md`**, replacing or supplementing the current `## Notes`.
12. **Tighten `release-notes`'s description** to the "Use only when the user asks to…" pattern.
13. **Extend `archive-issue` Step 2 third-tier discovery** to search `git for-each-ref refs/heads` and `git reflog` for any `{type}/<N>/*` branch — closes the gap for "archive an old issue after the branch was finished-and-deleted."
14. **Deduplicate the `## Output Naming` section** between `plan-architecture` and `plan-requirements` (and CLAUDE.md) — either move to a shared anchor or keep in one and have the other link.

---
*Generated by Review — 2026-07-24 12:43*