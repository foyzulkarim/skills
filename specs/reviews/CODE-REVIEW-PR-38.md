# Review Report

## Metadata

| Field | Value |
|-------|-------|
| **Review Mode** | PR #38 |
| **Target** | https://github.com/foyzulkarim/skills/pull/38 (`feat/37/add-sync-qa-plan-skills` → `master`, closes #37) |
| **Date** | 2026-08-23 13:00 |
| **Tech Stack** | Markdown skill instructions (SKILL.md + YAML frontmatter), bash helpers, JSON plugin manifests; no build/test/lint infrastructure |
| **Checks Run** | Code Quality, Documentation, Config & Dependencies, Migration, Requirement Coverage (vs issue #37) |
| **Checks Skipped** | Task Completion (general mode; #37 folded into Requirement Coverage), Test Coverage (no test infra), Security / Performance / Error Handling / Async / Runtime / TS-Strictness / React / Express / Database / Accessibility (no runtime code beyond a 12-line bash tweak, folded into Code Quality) |
| **Files Changed** | 21 |
| **Lines Changed** | +685 / -~500 (diff 1185 lines) |

## Review Process

- [x] Preflight checks passed
- [x] Diff gathered (21 files, 1185 lines)
- [x] Tech stack detected: Markdown skills + bash + JSON manifests
- [x] Context read (CLAUDE.md, AGENTS.md, PR description, issue #37)
- [x] Triage proposed and developer confirmed (developer added Requirement Coverage)
- [x] 5 checks dispatched: code-quality, documentation, config-dependencies, migration, requirement-coverage
- [x] Results collected and deduplicated (14 raw findings → 10 unique)
- [x] Report compiled
- [x] Verdict determined
- [x] Report saved to specs/reviews/

## Verdict: ⚠️ APPROVE WITH COMMENTS

The QA skills themselves (plan-qa/execute-qa), the falsifiability design, the archive-issue extension, and the manifest version sync are delivered faithfully and consistently — the deliberate pivots (shipping sync-skills with the plugin, unnumbered independent QA gate, dropping run-tests.sh) are internally coherent across all docs. The Critical finding (run-tests.sh / Runtime Evidence Protocol absent) was resolved as a deliberate drop by the developer on 2026-08-23 and demoted to record-keeping. One High remains: an editing accident destroyed the opening paragraph of `implement/SKILL.md`, stripping Phase 4's role statement and core verification contract — a one-paragraph restore, strongly recommended before merge.

### Finding Counts

| Category | 🔴 | 🟠 | 🟡 | 💭 | ⚠️ |
|----------|-----|-----|-----|-----|-----|
| Requirement Coverage | 0 | 0 | 2 | 2 | 0 |
| Code Quality | 0 | 1 | 1 | 0 | 0 |
| Documentation | 0 | 0 | 2 | 3 | 0 |
| Migration | 0 | 0 | 0 | 0 | 0 |
| Config & Dependencies | 0 | 0 | 0 | 0 | 0 |
| **Total** | **0** | **1** | **5** | **5** | **0** |

---

## 1. Requirement Coverage (vs issue #37)

| # | Severity | File | Line | Issue |
|---|----------|------|------|-------|
| 1 | 💭 Low (was 🔴 — drop confirmed deliberate by developer, 2026-08-23) | `dev-pipeline/skills/review/sub-skills/requirement-coverage.md` | 1–10 | `run-tests.sh` + Runtime Evidence Protocol promised and checked as done in issue #37, deliberately dropped — decision unrecorded, acceptance boxes still checked |
| 2 | 🟡 Medium | `dev-pipeline/skills/plan-qa/SKILL.md` | 9–15 | Shipped independent-QA-gate model contradicts issue #37's "Phases 6–7, sequential" requirement text (deliberate, but unrecorded in the issue) |
| 3 | 🟡 Medium | `dev-pipeline/skills/generate-tasks/SKILL.md` | 11–17 | PR acceptance claim "plan-architecture, generate-tasks, implement, review reference the new gate" is false for two of four skills |
| 4 | 💭 Low | `dev-pipeline/skills/sync-skills/SKILL.md` | 1–10 | sync-skills shipping reversal left doc gaps (see Documentation #7, #8) and stale issue §1 text |

**Finding 1 — record the drop (💭, resolved as deliberate).** Issue #37 §3 promised a `run-tests.sh` runner invoker and a Runtime Evidence Protocol in `_protocol.md`; neither exists, and the shipped check files codify the opposite static-only policy ("assertions are read and audited, never executed"). **Developer decision (2026-08-23): the drop is intentional — run-tests.sh is not wanted.** Residual: issue #37's acceptance boxes ("run-tests.sh + Runtime Evidence Protocol wired into review", "run-tests.sh empirically verified: …") remain checked, and no commit or specs/context entry records the reversal. Uncheck/correct the boxes and note the decision in the issue or specs/context/37.md.

**Finding 2 — reconcile the phase model (🟡).** Issue #37's key design decision: "Sequential, not parallel. Phases 5–7 are sequential merge gates." The delivery ships plan-qa/execute-qa as an **unnumbered** gate independent of /review, orderable at the developer's discretion — consistently so across plan-qa/SKILL.md, execute-qa/SKILL.md, CLAUDE.md, both READMEs, review/SKILL.md:213, with no stale "of 7"/"Phase 6"/"16 checks" stragglers (verified). The reversal appears deliberate (commit a7b19bc "neutral QA framing"), but the requirement source still asserts the opposite with boxes checked, and specs/context/37.md:24-28 compounds it by misquoting the issue as having requested "a QA gate that runs in parallel with Phase 5" — the issue says the reverse. Update issue #37's text and correct the context doc.

**Finding 3 — QA-gate wiring claim overstates (🟡).** PR body + specs/context/37.md claim commit 72a20e6 wired the QA gate into plan-architecture, generate-tasks, implement, review. Verified: only implement (lines 10, 87) and review (SKILL.md:213) reference it; `grep -i 'QA|plan-qa|execute-qa'` over plan-architecture/SKILL.md and generate-tasks/SKILL.md returns zero matches (plan-architecture/SKILL.md untouched by the PR; generate-tasks' hunk touches only the `> **Tasks:**` row sentence). Either wire the reference into those two skills or narrow the claim.

**Requirement→delivery matrix (abridged).** Covered: sync-skills skill + alias resolution + discovery fallback (§1, with documented shipping reversal); plan-qa interview/Guards/Coverage Map/P0/handoffs; execute-qa verdicts incl. PASS (judged)/PARTIAL escalation; `[assert]`/`[judge]`-with-criterion falsifiability fully codified in both QA skills; qa-plan removed intra-PR (never released); 17th check present on disk + review/SKILL.md table; archive-issue QA-*/QA-RESULTS-* handling; ARCH `> **Tasks:**` row; version 6.0.0 both manifests. Contradicted: sequential Phases 6–7 (Finding 2). Gap: run-tests.sh + Runtime Evidence Protocol (Finding 1).

## 2. Code Quality

| # | Severity | File | Line | Issue |
|---|----------|------|------|-------|
| 5 | 🟠 High | `dev-pipeline/skills/implement/SKILL.md` | 10 | QA-gate wiring edit replaced the entire opening paragraph with a dangling mid-sentence fragment — role statement, one-task-at-a-time discipline, and no-evidence-no-done rule lost |
| 6 | 🟡 Medium | `dev-pipeline/skills/plan-qa/SKILL.md` | 10–12 | Body opens with lowercase subject-less fragment — missing the "You are a …" role statement every sibling skill carries |

**Finding 5 — restore implement's opening paragraph (🟠).** Flagged independently by 4 of 5 checks. Line 10 now begins mid-sentence: *"the merge gates that follow: review (Phase 5), and — …"*. The deleted text carried the skill's identity and core contract: *"You are a collaborative implementation partner running **Phase 4 of 5: Implementation**. Work through task specs from an ARCH-\*.md document one at a time … every task has a verifiable done-signal, and you never mark a task done without producing its evidence."* Only the tail ("feeds the review skill (Phase 5)") needed updating; the edit dropped everything else. Restore the paragraph verbatim and graft the new gates sentence onto its tail. Affects every /implement invocation — the agent loses its role framing at instruction-priming position.

**Finding 6 — plan-qa opens with a fragment (🟡).** Same editing accident: *"a post-implementation gate, independent of /review — run it when …"* — lowercase, no subject. The removed qa-plan predecessor and sibling execute-qa both open with full role statements. Prepend e.g. *"You are a QA planning partner running the post-implementation QA gate — …"*.

**Clean:** move-to-worktree.sh's echo change is safe in context (`set -euo pipefail`, quoting, path resolution intact); sync-skills/execute-qa frontmatter, imperative voice, `{base_directory}` usage, confirm-gates all conform; 17 sub-skill files + _protocol.md match the updated prose.

## 3. Documentation

| # | Severity | File | Line | Issue |
|---|----------|------|------|-------|
| 7 | 🟡 Medium | `CLAUDE.md` | 51–66, 149–158 | Plugin-structure tree and Supporting-skills list omit the newly shipped sync-skills/ |
| 8 | 🟡 Medium | `dev-pipeline/README.md` | 100–102 | archive-issue summary omits QA plans/results; no `### /sync-skills` section despite the skill being user-facing |
| 9 | 💭 Low | `README.md` | 141–146 | Plugin-structure tree adds plan-qa/execute-qa but not sync-skills/ (skills table at line 93 lists it) |
| 10 | 💭 Low | `specs/context/37.md` | 41–52 | Wrong file list for commit fabbfb4 (claims docs/, omits AGENTS.md + root README); stale "Working tree: D specs/context/37.md" state line now committed as false record |
| — | 💭 Low | `dev-pipeline/skills/sync-skills/SKILL.md` | 36–42 | Alias table lists kimi/codex which sync-targets.json doesn't map — they fall through to the discovery fallback (works; table overstates). Config-deps judged this intentional-by-design; either add the mappings or mark those rows as fallback examples |

**Verified consistent (no findings):** no stale "of 5"/"Phase 5 of 5"/"5-phase" references needing a 7 — the shipped 5-phases-plus-gate model is uniformly applied; no dangling qa-plan references (only accurate historical citations in specs/context/37.md); plan-qa/execute-qa descriptions in both READMEs and CLAUDE.md match SKILL.md behavior; sync-skills SKILL.md matches sync-skills.sh capabilities; archive-issue QA-* claims match its SKILL.md.

## 4. Migration

No unique findings beyond #5/#6 (shared with Code Quality). Verified: qa-plan absent from the final tree (added+removed intra-PR — no deletion in diff is expected, not a gap); phase numbering internally consistent under the shipped model; review skill's 17-check table matches the 17 sub-skill files on disk; archive-issue handles every QA artifact shape plan-qa/execute-qa produce; 6.0.0 major bump correctly signals the breaking removal.

## 5. Config & Dependencies

**Pass, no findings.** plugin.json version (6.0.0) === marketplace.json plugins[0].version (6.0.0) — the repo's explicit two-places sync rule holds; both bumped in the same diff. Both manifests + scripts/sync-targets.json parse as valid JSON. plugin.json `skills` remains `./skills/` (auto-scan) — new skills need no registration per convention. sync-targets.json exists with the documented alias→path shape.

## Manual Checks Required

- [ ] Record the run-tests.sh / Runtime Evidence Protocol drop in issue #37: uncheck the two acceptance boxes (the "empirically verified" one cannot stay checked) and note the decision. Decided 2026-08-23: not wanted.
- [ ] Confirm the independent-QA-gate model is the intended final design (Finding 2) and update issue #37's design-decision text accordingly.

## Prioritized Action Items

### Must Fix (🔴 Critical / 🟠 High)
1. **Finding 5** — restore `implement/SKILL.md`'s opening paragraph; splice only the new merge-gates sentence onto its tail. *(One-paragraph restore; strongly recommended before merge. Finding 1 resolved as a deliberate drop, demoted to record-keeping.)*

### Should Address (🟡 Medium)
3. **Finding 6** — restore plan-qa/SKILL.md's role statement opening.
4. **Finding 2** — record the sequential→independent-gate pivot in issue #37; fix the misquote in specs/context/37.md:24-28.
5. **Finding 3** — wire the QA-gate reference into plan-architecture + generate-tasks, or narrow the claim to implement + review.
6. **Finding 7** — add sync-skills to CLAUDE.md's plugin tree and Supporting-skills list.
7. **Finding 8** — add QA artifacts to dev-pipeline/README.md:102's archive-issue enumeration; add a `### /sync-skills` section.

### Nice to Have (💭 Low)
8. **Finding 9** — add sync-skills/ to README.md's plugin-structure tree.
9. **Finding 10** — correct specs/context/37.md's fabbfb4 file list and stale working-tree line.
10. **sync-skills alias table** — add kimi/codex to sync-targets.json or mark those rows as discovery-fallback examples.

---
*Generated by Review — 2026-08-23 13:00*
