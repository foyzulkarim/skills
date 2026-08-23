# Review Report

## Metadata

| Field | Value |
|-------|-------|
| **Review Mode** | General: PR #38 |
| **Target** | <https://github.com/foyzulkarim/skills/pull/38> |
| **Date** | 2026-08-23 12:50 |
| **Tech Stack** | Markdown + YAML frontmatter + Bash; no build, no tests, no compiled code |
| **Checks Run** | documentation, code-quality, config-dependencies |
| **Checks Skipped** | task-completion, requirement-coverage (pipeline mode only — general mode with no linked REQ); react / express / async / database / runtime / typescript-strictness / security / error-handling / accessibility / test-coverage / performance / migration (no relevant surface in a docs + bash diff) |
| **Files Changed** | 21 |
| **Lines Changed** | +685 / −64 |

## Review Process

- [x] Preflight checks passed
- [x] Diff gathered (21 files, 1185 lines, saved to `/tmp/pr38.diff`)
- [x] Tech stack detected: Markdown + YAML + Bash (per CLAUDE.md)
- [x] Context read (CLAUDE.md, AGENTS.md, PR description, all 8 commits)
- [x] Triage proposed and developer confirmed (proceeded with 3 checks)
- [x] 3 checks dispatched: documentation, code-quality, config-dependencies
- [x] Results collected and deduplicated
- [x] Report compiled
- [x] Verdict determined
- [x] Report saved to specs/reviews/

## Verdict: ❌ REQUEST CHANGES

**Two 🔴 Critical broken-sentence fragments in the new skill bodies block merge.** Both `dev-pipeline/skills/implement/SKILL.md:10` and `dev-pipeline/skills/plan-qa/SKILL.md:10` lost their "You are a …" role statement in this PR — the bodies now open with sentence fragments (a lowercase "the" and a lowercase "a" respectively), violating the convention codified in `CLAUDE.md:198` and the established pattern in every other phase / gate skill in this repo. The fixes are small (restore the original one-sentence lead in each file, then keep the new merge-gate text as a follow-up paragraph) but they are not optional — a skill body without a role statement has no agent to direct. Three 🟡 Medium items (CHANGELOG, dev-pipeline/README migration note, one-character diagram drift) should ride along; four 💭 Low cosmetic items can land in a follow-up. The JSON version files, bash script change, and 16 → 17 check count propagation are all clean.

### Finding Counts

| Category | 🔴 | 🟠 | 🟡 | 💭 | ⚠️ |
|----------|-----|-----|-----|-----|-----|
| Documentation | 2 | 0 | 3 | 3 | 0 |
| Code-Quality | 0 | 2 | 0 | 2 | 0 |
| Config-Dependencies | 0 | 0 | 0 | 0 | 0 |
| **Total** | **2** | **2** | **3** | **5** | **0** |

> The two Critical findings in Documentation are also confirmed by Code-Quality (which rated them 🟠 High rather than 🔴 Critical). They are kept once under Documentation with cross-reference to Code-Quality's evidence (`grep "You are"` returns zero matches in both files). The two ratings reflect the same underlying defect seen through two different lenses; per the parent severity scale, "broken core functionality" maps to 🔴 Critical, which is the severity used here.

## Documentation

**Result:** 2 Critical, 3 Medium, 3 Low.

**Files reviewed (on disk):** `dev-pipeline/skills/implement/SKILL.md`, `dev-pipeline/skills/plan-qa/SKILL.md`, `dev-pipeline/skills/plan-qa/artifact-template.md`, `dev-pipeline/skills/execute-qa/SKILL.md`, `dev-pipeline/skills/execute-qa/artifact-template.md`, `dev-pipeline/skills/sync-skills/SKILL.md`, `dev-pipeline/skills/review/sub-skills/requirement-coverage.md`, `dev-pipeline/skills/review/sub-skills/task-completion.md`, `dev-pipeline/skills/review/SKILL.md`, `dev-pipeline/skills/archive-issue/SKILL.md`, `dev-pipeline/skills/generate-tasks/SKILL.md`, `dev-pipeline/skills/move-to-worktree/SKILL.md`, `dev-pipeline/skills/plan-architecture/artifact-template.md`, `CLAUDE.md`, `AGENTS.md`, `README.md`, `dev-pipeline/README.md`, `CHANGELOG.md`, `specs/context/37.md`.

### Findings Table

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🔴 Critical | `dev-pipeline/skills/implement/SKILL.md` | 10 | Body opens with a sentence fragment ("the merge gates that follow: review (Phase 5), and — when the change has a running surface worth driving — QA…") instead of a "You are a …" role statement. The previous opening ("You are a collaborative implementation partner running **Phase 4 of 5: Implementation**…") is gone — `grep "You are"` returns zero matches in the file. Violates the convention in `CLAUDE.md:198` and the parallel opening in `execute-qa:10`, `plan-requirements:10`, `plan-architecture:10`, `generate-tasks:10`, `review:10`. **Confirmed by both Documentation and Code-Quality sub-agents.** | Restore the original role-statement lead, then keep the new merge-gate text as a follow-up paragraph: `You are a collaborative implementation partner running **Phase 4 of 5: Implementation**. Work through task specs from an ARCH-*.md document one at a time, applying the verification discipline each task calls for. Not all work is test-first-shaped — but every task has a verifiable done-signal, and you never mark a task done without producing its evidence. Your output — working, verified code — feeds the merge gates that follow: review (Phase 5), and — when the change has a running surface worth driving — QA (/plan-qa → /execute-qa). Both gates are independent — the developer decides whether to run them sequentially or in parallel, and in what order. The developer invokes those, not you.` |
| 2 | 🔴 Critical | `dev-pipeline/skills/plan-qa/SKILL.md` | 10 | Body opens with a sentence fragment starting with a lowercase "a" — "a post-implementation gate, independent of `/review` — run it when the change has a running surface worth driving, in whatever order fits the work." No "You are a QA planner …" or similar agent-role statement anywhere in the file. `grep "You are"` returns zero matches. Sister skill `execute-qa:10` (added in the same PR) opens with `You are a QA executor running the **QA Execution** skill`; `plan-qa` is the only new phase-equivalent missing it. **Confirmed by both Documentation and Code-Quality sub-agents.** | Add a role statement before line 10, parallel to the `execute-qa` lead: `You are a collaborative QA planning partner running the **post-implementation QA gate** — a declaration skill, not a numbered phase. Independent of /review (Phase 5), the developer decides the order. The QA gate covers the three blind spots automated suites cannot reach: what a human sees, whole-request behavior, and deploy-time risk.` Then keep the "three blind spots" enumeration and downstream sections as they are. |
| 3 | 🟡 Medium | `CHANGELOG.md` | 3 | No `## v6.0.0` entry. The PR bumps the major version 5.1.0 → 6.0.0 (commit `9542437`) and ships 2 new skills (`plan-qa`, `execute-qa`), promotes `sync-skills` from repo-local to plugin-shipped, adds the 17th review check, and substantially rewrites the plugin `description`. The v5.0.0 entry was added in its own PR to call out the artifact-naming breaking change; a v6.0.0 entry is the conventional place to record the new artifact paths (`specs/qa/QA-*.md`, `specs/qa/QA-RESULTS-*.md`) and the new skills. | Run `/release-notes` against the `feat/37/...` branch tip before merge to prepend a `## v6.0.0 — <date>` block, or add a stub entry in this PR documenting the new skills, the new artifact paths, and the bumped description. |
| 4 | 🟡 Medium | `dev-pipeline/README.md` | 147 | The 5.0.0 breaking-change note (artifact-naming) is preserved, but there is no parallel 6.0.0 note even though the major version bump signals user-visible changes. The 5.0.0 note helps 5.x readers see the delta; a parallel 6.0.0 note (short — the `CHANGELOG.md` entry carries the detail) would help anyone reading the README understand the scope of the 6.x series. | Add a `**What's new in 6.0.0:**` block under the existing 5.0.0 note — one paragraph listing the additive user-visible changes (QA gate ships; `sync-skills` moves from repo-local to plugin-shipped; plugin description now mentions the QA gate; review sub-skill count is now 17). |
| 5 | 🟡 Medium | `README.md` | 36 | The pipeline diagram in the top-level `README.md:36` has one extra space inside the `Pre: /start-task` box (`│  Pre: /start-task → issue → branch + context  (opt-in)     │`, 5 trailing spaces before `│`) compared to `CLAUDE.md:93` and `dev-pipeline/README.md:9` (4 trailing spaces). The diagram is duplicated 3 times and is supposed to be identical; one box is 1 character wider than the other two. | Drop one space so the three diagrams match. |
| 6 | 💭 Low | `dev-pipeline/README.md` | 80–81 | Double blank line between the `/plan-qa (QA gate)` and `/execute-qa (QA gate)` sections — every other section break in the file uses a single blank line. Cosmetic. | Collapse to a single blank line. |
| 7 | 💭 Low | `dev-pipeline/skills/sync-skills/SKILL.md:8` & `dev-pipeline/skills/plan-qa/SKILL.md:8` & `dev-pipeline/skills/execute-qa/SKILL.md:8` | 8 | H1 casing inconsistency across the three new skills. `plan-qa` is `# Plan-QA Skill`, `execute-qa` is `# Execute-QA Skill`, `sync-skills` is `# Sync-Skills`. Internally consistent (all three keep the acronym/hyphen case) but the supporting-skill lane mostly uses natural title-casing (`# Commit`, `# Release Notes`, `# Session Stats`). Cosmetic only — does not affect dispatch. | Pick one form (e.g. `# Plan QA` / `# Execute QA` / `# Sync Skills`) and apply uniformly to the three new files. Skip if not worth touching. |
| 8 | 💭 Low | `.claude-plugin/marketplace.json` & `dev-pipeline/.claude-plugin/plugin.json` | 12 / 3 | The `description` is now ~520 characters; the "plus supporting skills for …" enumeration names seven pre-existing supporting skills but omits `sync-skills` (now plugin-shipped) and `finish-worktree` (already missing pre-PR). The list was non-exhaustive before; not a new bug, but the omission is more visible now that `sync-skills` ships with the plugin. | Optionally append `… and multi-harness skill sync` (and `finish-worktree` if you want completeness). Confirm the marketplace UI card does not truncate at ~280 chars. |

### Cross-reference consistency (zero-finding items)

- The pipeline diagram is otherwise identical across `CLAUDE.md:91–137`, `README.md:34–80`, and `dev-pipeline/README.md:7–53` — only Finding #5 is off.
- The "QA gate that runs independently of review" wording is consistent across `CLAUDE.md:7, 24, 26, 166`, `README.md:3, 7`, `dev-pipeline/README.md:3, 127`, and the `plan-qa` / `execute-qa` descriptions. No drift.
- The 16 → 17 check count is consistent across `CLAUDE.md:70, 145`, `dev-pipeline/README.md:75`, `README.md:13, 88, 137`, `review/SKILL.md:3, 132–133, 203`, and `AGENTS.md:65`. No drift.
- The new `specs/qa/QA-<N>-<slug>.md` and `specs/qa/QA-RESULTS-<N>-<slug>.md` artifact paths are consistent across `CLAUDE.md:175–176`, `dev-pipeline/README.md:141–142`, `archive-issue/SKILL.md:17, 67–68`, `plan-qa/SKILL.md:137–141`, `plan-qa/artifact-template.md:9`, `execute-qa/SKILL.md:57`, and `execute-qa/artifact-template.md:3`. No drift.
- `plan-qa/SKILL.md:137` `SLUG` reference resolves to `start-task/SKILL.md:55–57`. `archive-issue/SKILL.md:67` `QA-PR-<number>.md` fallback is internally consistent with `plan-qa/SKILL.md:139`.
- `execute-qa/artifact-template.md:3` relative `./QA-<N>-<slug>.md` link resolves correctly (both files live in `specs/qa/`).
- `archive-issue/SKILL.md` correctly extends the artifact-naming contract with the QA paths and the no-issue fallbacks (lines 17, 67–68) and the Step 6 `git rm` paths include `specs/qa/`.
- New skill files have required YAML frontmatter and required sections: `execute-qa` has "You Must NOT" + "Reminders"; `plan-qa` has "You Must NOT" + "Readiness Gate" + "Reminders"; `sync-skills` has "You Must NOT".
- `requirement-coverage.md` follows the same shape as the other 16 check files (calls out `_protocol.md`, defines `**Scope:**` / `**Report section title:**`, severity calibration, focus areas, check-specific rules, specialized output format with a zero-findings variant).
- `task-completion.md` updates the "regression-guard test passes" wording to "exists and asserts" with a `🛑 static only` marker — consistent with the new `requirement-coverage.md` static-only discipline.
- `specs/context/37.md` correctly notes that the QA gate is likely skipped for this change (line 50: "The `sync-skills` change is shell + docs only, so the QA gate is likely **skipped** here").
- The `description` strings in `plugin.json` and `marketplace.json` are byte-identical (both 519 characters on the `description` line) — parity preserved.

### Review Comments

**Finding #1 — 🔴 Critical — `dev-pipeline/skills/implement/SKILL.md:10`**

> I noticed the `implement` skill body now opens with a sentence fragment — `the merge gates that follow: review (Phase 5), and — when the change has a running surface worth driving — QA (…)` — with the lowercase "the" leading into a sentence that assumes a previous clause. The previous opening (`You are a collaborative implementation partner running **Phase 4 of 5: Implementation**. Work through task specs …`) is gone, and `grep "You are"` confirms there is no role statement anywhere else in the file. Every other phase / gate skill in this repo (`plan-requirements:10`, `plan-architecture:10`, `generate-tasks:10`, `review:10`, and the new `execute-qa:10` you added in this same PR) opens with a `You are a …` framing, and `CLAUDE.md:198` codifies that as the convention. A minimal fix is to restore the original one-sentence lead and keep the new merge-gate text as a follow-up paragraph. Without a role statement, the rest of the body has no agent to direct — readers will land on `## Precondition: the Tasks contract must be resolvable` with no framing for who they are or what they're doing. Thoughts?

**Finding #2 — 🔴 Critical — `dev-pipeline/skills/plan-qa/SKILL.md:10`**

> I noticed the new `plan-qa` skill body opens with a fragment that begins with a lowercase "a" — `a post-implementation gate, independent of /review — run it when the change has a running surface worth driving, in whatever order fits the work.` — with no `You are a QA planner …` or similar agent-role framing anywhere in the body. The sister skill `execute-qa:10` you added in the same PR opens with `You are a QA executor running the **QA Execution** skill`, and the existing phase skills all open with a `You are a … running Phase X` framing. A parallel lead for `plan-qa` would read like `You are a collaborative QA planning partner running the post-implementation QA gate — a declaration skill, not a numbered phase. Independent of /review (Phase 5), the developer decides the order.`, and the existing "three blind spots" paragraph can move to follow it. The asymmetry between the two new skills' openings is a small but real readability hit for whichever agent gets dispatched to plan vs. execute. Thoughts on aligning them?

**Finding #3 — 🟡 Medium — `CHANGELOG.md`**

> I noticed the version bump in this PR (5.1.0 → 6.0.0, commit `9542437`) is not reflected in `CHANGELOG.md` — the file only carries the v5.0.0 entry. The PR ships two new skills, promotes `sync-skills` from repo-local to plugin-shipped, adds the 17th review check, and substantially rewrites the plugin `description`. The v5.0.0 entry was added in its own PR to call out the artifact-naming breaking change; a v6.0.0 entry is the conventional way to record the new artifact paths and the new skills. The simplest fix is to run `/release-notes` against the branch tip before merge — the skill's "prepend a `## v6.0.0 — <date>` block to `CHANGELOG.md`" matches this PR exactly. Thoughts?

**Finding #4 — 🟡 Medium — `dev-pipeline/README.md:147`**

> I noticed the 5.0.0 breaking-change note is preserved, but there's no parallel 6.0.0 note even though the major version bump signals user-visible changes. A 6.0.0 note of similar length would be a one-paragraph addition — something like `**What's new in 6.0.0:** /plan-qa and /execute-qa ship as an optional QA gate, independent of /review. sync-skills is now plugin-shipped (was repo-local in 5.x). The plugin description now mentions the QA gate.` — placed right under the existing 5.0.0 block. Would you add it, or is the `CHANGELOG.md` entry (Finding #3) sufficient?

**Finding #5 — 🟡 Medium — `README.md:36`**

> I noticed the pipeline diagram in the top-level `README.md:36` has one extra space inside the `Pre: /start-task` box compared to the otherwise-identical copies in `CLAUDE.md:93` and `dev-pipeline/README.md:9`. The box is 1 character wider than the other two. Trivial to align — drop one space before the closing `│` so the three diagrams match. The diagram is duplicated 3 times and should be identical; a 1-character drift is worth fixing.

**Finding #6 — 💭 Low — `dev-pipeline/README.md:80–81`**

> I noticed there's a double blank line between the `/plan-qa (QA gate)` and `/execute-qa (QA gate)` sections in `dev-pipeline/README.md` (lines 80 and 81 are both blank). Every other section break in the file uses a single blank line. Cosmetic; one keystroke to collapse.

**Finding #7 — 💭 Low — H1 casing across new skill files**

> I noticed the three new SKILL.md H1s use slightly different conventions: `# Plan-QA Skill`, `# Execute-QA Skill`, `# Sync-Skills`. They're internally consistent (all three keep the acronym/hyphen case) but the supporting-skill lane mostly uses natural title-casing (`# Commit`, `# Release Notes`, `# Session Stats`, `# Move-to-Worktree`). Cosmetic — doesn't affect dispatch — but if you want to tighten, pick one form and apply it across the three new files.

**Finding #8 — 💭 Low — plugin description enumerates supporting skills**

> I noticed the `description` in both `plugin.json:3` and `marketplace.json:12` grew to ~520 characters and lists the supporting skills by name. `sync-skills` (now plugin-shipped) isn't in the enumeration, and `finish-worktree` (already missing pre-PR) isn't either. Not a bug — the list was already non-exhaustive — but the marketplace UI card may also truncate at ~280 chars, which would be worth confirming. If both are concerns, appending `… and multi-harness skill sync` (and optionally the finish-worktree note) is a one-line fix.

### Coverage Checklist

```
- [x] dev-pipeline/skills/implement/SKILL.md            — YAML frontmatter ✅; opening role statement 🔴 Finding #1; QA-gate wiring ✅; Resuming section ✅; You Must NOT ✅; Phase 4 Gate ✅
- [x] dev-pipeline/skills/plan-qa/SKILL.md              — YAML frontmatter ✅; opening role statement 🔴 Finding #2; Two Entry Modes ✅; Preflight ✅; Conversation Flow (Phases A/B/C) ✅; Coverage Map ✅; Guards ✅; Case Format ✅; Operator Handoffs ✅; Output Naming ✅; "## Structure of the Output Plan" ✅; You Must NOT ✅; Readiness Gate ✅; Reminders ✅
- [x] dev-pipeline/skills/plan-qa/artifact-template.md  — header rows ✅; "## 0. Scope" → "## N+3. Out of Scope" structure ✅; relative links resolve ✅
- [x] dev-pipeline/skills/execute-qa/SKILL.md           — YAML frontmatter ✅; "You are a QA executor …" opening ✅; Invocation ✅; Execution Protocol (8 steps) ✅; Verdicts ✅; Results Artifact path matches CLAUDE.md ✅; You Must NOT ✅; Reminders ✅
- [x] dev-pipeline/skills/execute-qa/artifact-template.md — relative `./QA-<N>-<slug>.md` link resolves ✅; example row demonstrates [judge] ambiguity-escalation rule ✅
- [x] dev-pipeline/skills/sync-skills/SKILL.md          — YAML frontmatter ✅; Prereqs (jq) ✅; Resolve repo+script ✅; canonical alias table ✅; Run ✅; discovery fallback ✅; "Confirm before running when" ✅; You Must NOT ✅ (Reminders/Gate not present — consistent with other supporting-skill files)
- [x] dev-pipeline/skills/review/sub-skills/requirement-coverage.md — "_Read `_protocol.md` first" ✅; Scope + Report section title ✅; severity calibration ✅; Focus Areas ✅; specialized output format with zero-findings variant ✅
- [x] dev-pipeline/skills/review/sub-skills/task-completion.md — updated to "static-only" / "exists and asserts" wording ✅
- [x] dev-pipeline/skills/review/SKILL.md               — check table row 17 added ✅; "all 17 checks" wording updated ✅; "Review is not the last gate" reminder added ✅
- [x] dev-pipeline/skills/archive-issue/SKILL.md        — YAML description updated to include "review/QA docs" ✅; Step 0 mentions QA docs ✅; Step 2 table adds two QA rows ✅; Step 4 carries "review/QA content" ✅; Step 6 includes `specs/qa/` in the git rm paths ✅
- [x] dev-pipeline/skills/generate-tasks/SKILL.md       — added "TASKS filename always shares the ARCH filename's stem" rule ✅
- [x] dev-pipeline/skills/move-to-worktree/SKILL.md     — "Claude session" → "agent session" ✅
- [x] dev-pipeline/skills/plan-architecture/artifact-template.md — `> **Tasks:**` row comment now says "use `TASKS-<slug>.md` when there is no linked issue — never omit this row" ✅
- [x] CLAUDE.md                                         — What-this-repo-is updated to mention QA gate ✅; pipeline diagram updated to 2-track Phase 5/QA gate ✅; Phase skills list adds plan-qa + execute-qa ✅; pipeline entry points adds the QA-gate sentence ✅; Artifact paths adds QA + QA-RESULTS rows ✅; sync-skills note updated to be shipped with the plugin ✅
- [x] AGENTS.md                                         — "5-phase" reference removed from the opening line ✅; 16 → "check files" wording ✅
- [x] README.md                                         — top blurb + Why use this? + skill table adds /plan-qa, /execute-qa, /sync-skills rows ✅; pipeline diagram updated 🟡 Finding #5; plugin structure adds plan-qa/execute-qa nodes ✅
- [x] dev-pipeline/README.md                           — top blurb ✅; pipeline diagram updated ✅; /plan-qa + /execute-qa section bodies added 💭 Finding #6; Pipeline entry points adds the QA-gate sentence ✅; Output Conventions adds QA + QA-RESULTS rows ✅; 5.0.0 breaking-change note preserved (no 6.0.0 note — Finding #4)
- [x] CHANGELOG.md                                      — only the v5.0.0 entry is present 🟡 Finding #3
- [x] .claude-plugin/marketplace.json & dev-pipeline/.claude-plugin/plugin.json — `description` is byte-identical ✅; version is 6.0.0 in both ✅; description length ~520 chars 💭 Finding #8
- [x] specs/context/37.md                               — context file ✅; correctly notes QA gate likely skipped
```

## Code-Quality

**Result:** 0 Critical, 2 High, 0 Medium, 2 Low. The two High findings duplicate Documentation Findings #1 and #2 and are referenced there. Code-Quality sub-agent also confirmed both via `grep "You are"` returning zero matches in each affected file.

### Findings Table

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟠 High | `dev-pipeline/skills/implement/SKILL.md` | 10 | Same defect as Documentation #1. Body opens with sentence fragment; no "You are a…" role statement. `grep "You are"` returns 0 matches. | See Documentation #1 for the proposed restoration. |
| 2 | 🟠 High | `dev-pipeline/skills/plan-qa/SKILL.md` | 10 | Same defect as Documentation #2. Body opens with lowercase "a" sentence fragment; no "You are a…" role statement. `grep "You are"` returns 0 matches. | See Documentation #2 for the proposed lead. |
| 3 | 💭 Low | `dev-pipeline/skills/plan-qa/SKILL.md` & `execute-qa/SKILL.md` | 8 | H1 casing inconsistency (`# Plan-QA Skill` vs `# Execute-QA Skill`). Cosmetic. | See Documentation #7. |
| 4 | 💭 Low | `dev-pipeline/skills/sync-skills/SKILL.md` | 8 | H1 `# Sync-Skills` (kebab-cased in title) is slightly different from how `move-to-worktree` (the closest neighbor) renders (`# Move-to-Worktree`). Cosmetic only. | See Documentation #7. |

### Non-findings (false-positive guardrails)

- The `sync-skills/SKILL.md:5` `color: orange` matches `plan-requirements` and `setup-cost-tracking`. The two QA skills use `color: lightyellow` together — consistent with each other.
- The `move-to-worktree.sh:120` "Claude session" → "agent session" wording fix was applied consistently in `SKILL.md:13, 48` and the script. A repo-wide grep for `Claude session` returns zero matches — no other sites were missed.
- The 16 → 17 review-check count is consistent across `CLAUDE.md:70, 145`, `dev-pipeline/README.md:75`, `README.md:13, 137`, `dev-pipeline/skills/review/SKILL.md:3, 203`, `AGENTS.md:65`, and the sub-skill count table at `review/SKILL.md:132–133`. The `AGENTS.md` rewording ("The check files under" instead of "The 16 files under") is grammatically clean and reflects the now-dynamic count.
- `sync-skills/SKILL.md` has no "You are a…" role statement, but other *supporting* skills (`move-to-worktree`, `commit`, `start-task`, `finish-worktree`, `archive-issue`, `release-notes`, `session-stats`, `setup-cost-tracking`) also open with descriptive paragraphs, not role statements. The "You are a…" convention is for phase / gate skills only — `sync-skills` is following its lane's convention, not violating it.
- The two new artifact templates (`plan-qa/artifact-template.md`, `execute-qa/artifact-template.md`) follow the existing `plan-architecture/artifact-template.md` shape — header blockquote rows, numbered sections, tables. Consistent with the existing template family.
- The pipeline diagram in `CLAUDE.md` and the two `README.md` files is structurally identical — only the one-character drift in Finding #5 (Documentation) is off.

### Review Comments

**Finding #1 — 🟠 High — `dev-pipeline/skills/implement/SKILL.md:10`**

> I noticed the body of `implement/SKILL.md` no longer opens with a "You are a …" role statement — it now starts mid-thought with "the merge gates that follow: review (Phase 5), and — when the change has a running surface worth driving — QA…" `grep "You are"` returns zero matches in the file, so the previous "You are a collaborative implementation partner running **Phase 4 of 5: Implementation**…" lead looks like it was lost when the closing paragraph was retargeted. All five other phase / gate skills (`plan-requirements`, `plan-architecture`, `generate-tasks`, `review`, `execute-qa`) open with `You are a …` — `implement` is the only phase skill now missing that lead. The fix is small: restore the original one-sentence lead and either keep the new "merge gates" paragraph at the end of the lead or move it to where the "When the last task is done" pointer already lives (line 87, which was correctly updated). What do you think — restore the lead, or fold the two into one?

**Finding #2 — 🟠 High — `dev-pipeline/skills/plan-qa/SKILL.md:10`**

> I noticed the body of `plan-qa/SKILL.md` opens with a sentence fragment starting lowercase ("a post-implementation gate, independent of `/review`…"). It looks like a continuation of a missing lead — and `grep "You are"` confirms there's no role statement anywhere in the file. The sibling `execute-qa/SKILL.md:10` opens correctly with "You are a QA executor running the **QA Execution** skill…", so the pattern is established in the same PR. A parallel lead for `plan-qa` would read like "You are a QA planner running the post-implementation QA gate — the first half of a two-phase gate; the second half is `/execute-qa`…" and the existing "three blind spots" paragraph can move to follow it. The asymmetry between the two skills' openings is a small but real readability hit for whichever agent gets dispatched to plan vs. execute. Thoughts on aligning them?

### Coverage Checklist

```
- [x] dev-pipeline/skills/implement/SKILL.md            — naming ✅, structure ⚠️ → Finding #1, conventions ⚠️ → Finding #1
- [x] dev-pipeline/skills/plan-qa/SKILL.md              — naming ✅, structure ⚠️ → Finding #2, conventions ⚠️ → Finding #2
- [x] dev-pipeline/skills/plan-qa/artifact-template.md  — naming ✅, structure ✅, conventions ✅
- [x] dev-pipeline/skills/execute-qa/SKILL.md           — naming ✅ (You are…), structure ✅, conventions ✅
- [x] dev-pipeline/skills/execute-qa/artifact-template.md — naming ✅, structure ✅, conventions ✅
- [x] dev-pipeline/skills/sync-skills/SKILL.md          — naming 💭 → Finding #4, structure ✅, conventions ✅ (color/role-statement scoped to phase)
- [x] dev-pipeline/skills/move-to-worktree/SKILL.md     — wording fix ✅, conventions ✅
- [x] dev-pipeline/skills/move-to-worktree/move-to-worktree.sh — wording fix ✅ at line 120
- [x] dev-pipeline/skills/plan-architecture/artifact-template.md — header row clarified ✅
- [x] dev-pipeline/skills/review/SKILL.md               — count 16→17 propagated ✅, parallel-sub-agent terminology ✅
- [x] dev-pipeline/skills/review/sub-skills/requirement-coverage.md — new check, structure ✅, conventions ✅
- [x] dev-pipeline/skills/review/sub-skills/task-completion.md — static-only clarification ✅
- [x] dev-pipeline/skills/archive-issue/SKILL.md        — extended to QA artifacts ✅
- [x] dev-pipeline/skills/generate-tasks/SKILL.md       — stem-naming clarification ✅
- [x] dev-pipeline/README.md, README.md, CLAUDE.md, AGENTS.md, .claude-plugin/plugin.json, .claude-plugin/marketplace.json — version + diagram + count propagation ✅
- [x] specs/context/37.md                               — context file ✅
```

## Config-Dependencies

**Result:** ✅ No findings.

**Files reviewed:** `.claude-plugin/marketplace.json`, `dev-pipeline/.claude-plugin/plugin.json`.

### Findings Table

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| — | — | — | — | No issues found | — |

### Specific Question Answers

1. **Are the two JSON files' `version` fields in sync at 6.0.0?** **Y.**
   - `.claude-plugin/marketplace.json:13` → `"version": "6.0.0"`
   - `dev-pipeline/.claude-plugin/plugin.json:4` → `"version": "6.0.0"`
   - Per `CLAUDE.md` "Versioning — keep two files in sync": satisfied.
2. **Are the two JSON files' `description` fields identical?** **Y** — byte-for-byte. Both files (marketplace.json:12, plugin.json:3) carry the exact same ~519-character string.
3. **Is the 6.0.0 semver bump justified?** **Y.** Two new top-level skills enter the marketplace (`/plan-qa`, `/execute-qa`); the pipeline structure changes from one merge gate (review) to two independent gates (review + QA), which changes which commands a developer runs after `/implement` and when; the plugin description, `CLAUDE.md`, `README.md`, and `dev-pipeline/README.md` all reflect the new structure. For a plugin marketplace, a structural change in the user-facing command set is plausibly breaking for anyone who scripted the "run `/review` to gate merge" mental model. Major bump is defensible.
4. **Does the marketplace.json top-level `description` need a sync with the inner plugin description?** **N** (per the false-positive guardrail). The outer description is intentionally a higher-level abstraction ("Claude Code plugin marketplace with a structured development pipeline"); the inner description carries the QA-gate mention. If a 6.0.0 release cares about marketplace-list clarity, the outer description could be widened to "…structured development pipeline with an independent QA gate" — but this is a polish call, not a config-drift issue.

### Coverage Checklist

```
- [x] .claude-plugin/marketplace.json                   — version 6.0.0 (line 13) ✅; description byte-identical to plugin.json (line 12) ✅
- [x] dev-pipeline/.claude-plugin/plugin.json           — version 6.0.0 (line 4) ✅; description byte-identical to marketplace.json (line 3) ✅
- [x] Repo-wide version drift scan                      — no other place hardcodes the live version; remaining 5.x references in CHANGELOG.md, docs/skill-refiner-guide.md, dev-pipeline/README.md:147, and the review/legacy docs are historical context (pre-5.0.0, "Breaking change in 5.0.0") ✅
- [x] Semver justification                              — major bump justified by real user-visible changes ✅
- [x] CHANGELOG entry                                   — not updated by this PR; landing post-merge is the established pattern (existing v5.0.0 entry is the latest) ✅ (Documentation Finding #3 covers the gap)
```

## Manual Checks Required

- [ ] None. All findings are verifiable from the diff and on-disk files.

## Prioritized Action Items

### Must Fix (🔴 Critical)

1. **`dev-pipeline/skills/implement/SKILL.md:10`** — Restore the "You are a collaborative implementation partner running **Phase 4 of 5: Implementation**…" role statement. The body currently opens with a sentence fragment (lowercase "the") and has no agent-role framing. (Documentation #1 / Code-Quality #1)
2. **`dev-pipeline/skills/plan-qa/SKILL.md:10`** — Add a "You are a collaborative QA planning partner running the **post-implementation QA gate**…" role statement. The body currently opens with a sentence fragment (lowercase "a"). Sister `execute-qa:10` has the lead; `plan-qa` should match. (Documentation #2 / Code-Quality #2)

### Should Address (🟡 Medium)

3. **`CHANGELOG.md`** — Add a `## v6.0.0 — 2026-08-23` block (via `/release-notes` against the branch tip, or by hand) covering: new skills (`plan-qa`, `execute-qa`, promoted `sync-skills`); new artifact paths (`specs/qa/QA-*.md`, `specs/qa/QA-RESULTS-*.md`); new review sub-skill (`requirement-coverage`); pipeline topology change (one merge gate → two independent gates).
4. **`dev-pipeline/README.md:147`** — Add a one-paragraph "What's new in 6.0.0" note alongside the existing 5.0.0 breaking-change note, listing the additive user-visible changes.
5. **`README.md:36`** — Drop one trailing space in the `Pre: /start-task` box so the diagram matches `CLAUDE.md:93` and `dev-pipeline/README.md:9`.

### Nice to Have (💭 Low)

6. `dev-pipeline/README.md:80–81` — Collapse the double blank line between the `/plan-qa` and `/execute-qa` sections.
7. `dev-pipeline/skills/plan-qa/SKILL.md:8`, `execute-qa/SKILL.md:8`, `sync-skills/SKILL.md:8` — Pick one H1 casing convention and apply uniformly to the three new skill files.
8. `.claude-plugin/marketplace.json:12` & `dev-pipeline/.claude-plugin/plugin.json:3` — Optionally append `… and multi-harness skill sync` to the supporting-skills enumeration; confirm the marketplace UI does not truncate at ~280 chars.

---
*Generated by Review — 2026-08-23 12:50*
