# Review Report

## Metadata

| Field | Value |
|-------|-------|
| **Review Mode** | Staged / uncommitted changes |
| **Target** | `git diff HEAD` — branch `feature/refactor-upgrade-skills` |
| **Date** | 2026-03-29 |
| **Tech Stack** | Markdown, JSON (documentation and configuration only — no production code) |
| **Checks Run** | Code Quality & Patterns, Documentation |
| **Checks Skipped** | Task Completion (general mode), Test Coverage, Performance, Security, Error Handling, Config & Dependencies, TypeScript, Runtime, Async, React, Express, Database — no code in changeset |
| **Files Changed** | 17 |
| **Lines Changed** | +159 / -162 |

## Verdict: ⚠️ APPROVE WITH COMMENTS

The rename is coherent and well-executed — all deprecated plugin names are removed, `(fs-N)` prefixes are consistently applied across all `plugin.json` and `marketplace.json` entries, and cross-references are correctly updated throughout. No stale references to old compound skill names remain in any critical path.

Three High items are worth addressing before merge: the `review` skill's persona still names itself with the old identity label, the `planner` marketplace description drops "failure modes" (a core deliverable), and the `tdd` README workflow diagram is the only one that truncates the upstream pipeline. Eight Medium items relate to README completeness and minor description inconsistencies.

### Finding Counts

| Category | 🔴 | 🟠 | 🟡 | 💭 | ⚠️ |
|----------|-----|-----|-----|-----|-----|
| Code Quality & Patterns | 0 | 1 | 2 | 2 | 0 |
| Documentation | 0 | 2 | 6 | 3 | 0 |
| **Total** | **0** | **3** | **8** | **5** | **0** |

---

## Code Quality & Patterns

### Findings Table

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟠 High | `plugins/review/commands/SKILL.md` | 10 | Persona self-identifies as "You are a review orchestrator" — the exact phrase matching the old skill name `review-orchestrator` | Change to "You are a code reviewer" or "You are a triage-first code reviewer" |
| 2 | 🟡 Medium | `plugins/architect/commands/SKILL.md` | 99, 262 | Two occurrences of "feature-level requirements engineering" — the phrase `requirements engineering` exactly mirrors the removed skill name `requirements-engineering` | Replace both with "feature-level planning" |
| 3 | 🟡 Medium | `plugins/review/README.md` | (absent) | Missing `## Workflow` section — every other plugin README has one; `review` has none | Add a Workflow section showing the full pipeline with "← you are here" |
| 4 | 💭 Low | `plugins/taskgen/README.md` | 41–46 | Workflow diagram starts at `/planner`, omitting the optional `/architect` step shown in other READMEs | Add optional `architect` step at the top, consistent with other READMEs |

---

##### #1: review SKILL.md persona retains old identity label
File: `plugins/review/commands/SKILL.md:10`

> I noticed the file opens with "You are a review orchestrator." — `review-orchestrator` was the exact old skill name before this refactor renamed it to `review`. This is the first behavioral instruction the model reads, anchoring the agent's self-identity to the deprecated name. A developer reading the source or seeing it in logs will encounter the stale label. Would it make sense to change this to "You are a code reviewer" or "You are a triage-first code reviewer"?

---

##### #2: "requirements engineering" prose in architect SKILL.md
File: `plugins/architect/commands/SKILL.md:99` and `:262`

> Both occurrences read "that happens during feature-level requirements engineering." While this reads as generic prose rather than a skill invocation, `requirements engineering` exactly mirrors the removed skill name and is the only place in the codebase where it still appears. Replacing both with "feature-level planning" would eliminate any ambiguity about which skill to use next. What do you think?

---

##### #3: review README missing Workflow section
File: `plugins/review/README.md` (section absent)

> Every other plugin README (`architect`, `planner`, `taskgen`, `tdd`) has a `## Workflow` section with an ASCII diagram and a "← you are here" marker. `review/README.md` has none, so a developer browsing the plugin can't see where it sits in the pipeline. A minimal addition would be:
>
> ```
> /architect → phased plan
>   /planner → feature-level plan
>     /taskgen → TDD-ready task specs
>       /tdd → implementation
>         /review → verification  ← you are here
> ```
>
> Just a thought — easy win for consistency.

---

##### #4: taskgen README workflow omits optional /architect step
File: `plugins/taskgen/README.md:41`

> The workflow block starts at `/planner`. The `architect` and `planner` READMEs both include an optional `/architect` at the top. Adding a commented optional line would align with the pattern the other READMEs establish. Not a blocker at all.

---

## Documentation

### Findings Table

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 5 | 🟠 High | `.claude-plugin/marketplace.json` | 22 | planner description omits "failure modes" — a core Phase 3 deliverable listed in the SKILL.md description and README | Add "failure modes" to the list: "…requirements, edge cases, failure modes, and constraints" |
| 6 | 🟠 High | `plugins/tdd/README.md` | 44 | Workflow diagram is the only one that truncates upstream pipeline — shows only `taskgen` and below | Show full pipeline or use `…` to indicate upstream stages |
| 7 | 🟡 Medium | `.claude-plugin/marketplace.json` | 12 | architect description wording diverges from `plugin.json`: marketplace omits "with dependencies" phrase | Align with plugin.json: add "with dependencies" to the marketplace description |
| 8 | 🟡 Medium | `.claude-plugin/marketplace.json` | 32 | taskgen description drops "collaborative test planning" — understating the skill's defining behavior | Add "collaborative test planning" to the description |
| 9 | 🟡 Medium | `plugins/architect/README.md` | 6 | "dependency graphs" overstates the artifact — SKILL.md produces an indented ASCII dependency tree, not a graph | Change to "dependency trees" or "feature dependency maps" |
| 10 | 🟡 Medium | `plugins/planner/README.md` | 5 | Phase 4 listed as "Decisions" — SKILL.md names it "Behaviors, Decisions & Tradeoffs" | Update to "Behaviors & Decisions" |
| 11 | 🟡 Medium | `plugins/taskgen/README.md` | 9 | "Proposes splits for oversized tasks" could imply autonomous splitting — SKILL.md requires developer agreement | Add "(with developer agreement)" qualifier |
| 12 | 🟡 Medium | `plugins/taskgen/README.md` | 36 | Output section missing "TDD Sequence (optional)" and "Dependencies on other tasks" — both in the SKILL.md task format | Add the two missing output fields |
| 13 | 🟡 Medium | `plugins/review/README.md` | 68 | "5-level severity ratings (Critical, High, Medium, Low, Manual)" groups Manual with severity levels — it is an action flag, not a severity | Reword: "4 severity levels (Critical, High, Medium, Low) plus Manual checks flagged for developer verification" |
| 14 | 🟡 Medium | `plugins/review/README.md` | 8 | Pipeline mode's mandatory Task Completion check is not mentioned | Add a note: "Pipeline mode always includes Task Completion Verification" |
| 15 | 💭 Low | `plugins/planner/README.md` | 38 | Output section missing "Open Questions" — present in the SKILL.md artifact format | Add "Open questions (if any)" to the Output list |
| 16 | 💭 Low | `plugins/tdd/README.md` | 7 | Missing status-update behavior: tdd sets task status to `in progress`, then `done` in the plan document | Add a feature bullet for this side-effect |
| 17 | 💭 Low | `README.md` | 55 | Stage 4 table description omits `auto` mode — all other description surfaces mention it | Add "(collaborative or auto)" |
| 18 | 💭 Low | `plugins/architect/commands/SKILL.md` | 230 | Artifact template's Next Steps reads `Planner for:` (capitalized) — could be misread as a literal command | Normalize to lowercase `planner` or prefix with `/planner` |

---

##### #5: planner marketplace description omits "failure modes"
File: `.claude-plugin/marketplace.json:22`

> The marketplace entry reads "…to uncover requirements, edge cases, and constraints." The SKILL.md description — which is used for skill routing — explicitly says "requirements, edge cases, failure modes, and constraints." Phase 3 of the conversation is titled "Edge Cases & Failure Modes." Dropping this from the marketplace entry means a developer searching for failure-mode analysis wouldn't identify the `planner` skill as the right tool.
>
> Suggested fix:
> ```json
> "description": "(fs-2) Feature-level planning — 5-phase Socratic conversation to uncover requirements, edge cases, failure modes, and constraints before implementation"
> ```
>
> What do you think?

---

##### #6: tdd README workflow truncates upstream pipeline
File: `plugins/tdd/README.md:44`

> The tdd workflow shows:
> ```
> /taskgen → TDD-ready task specs
>   /tdd → implementation  ← you are here
>     /review → verification
> ```
> Every other plugin README shows the pipeline from a higher vantage point. A new user landing on the tdd README can't tell this is stage 4 of 5 without checking another file. Even adding `…` above `taskgen` or the full chain would help:
> ```
> /architect → phased plan (optional)
>   /planner → feature-level plan
>     /taskgen → TDD-ready task specs
>       /tdd → implementation  ← you are here
>         /review → verification
> ```
> Thoughts?

---

##### #7: architect marketplace description inconsistent with plugin.json
File: `.claude-plugin/marketplace.json:12`

> The marketplace entry says "…decomposes into ordered phases" while `plugin.json` says "…decomposes into ordered phases with dependencies." The "with dependencies" phrase is meaningful — the artifact includes a dependency tree between phases. The marketplace is the primary user-facing surface and should be the most precise. Just a thought, not a blocker.

---

##### #8: taskgen marketplace description drops "collaborative"
File: `.claude-plugin/marketplace.json:32`

> The marketplace entry says "Generate TDD-ready task specifications from plan artifacts — tasks embedded directly in plan documents." The `plugin.json` includes "collaborative test planning" — the draft-and-confirm conversation step that is the skill's defining behavior. Without it, the entry reads like a batch generator. Would it make sense to keep the "collaborative test planning" phrase?

---

##### #9: "dependency graphs" overstates the architect artifact
File: `plugins/architect/README.md:6`

> The README promises "phased project plans with dependency graphs." The SKILL.md artifact format generates an indented ASCII tree (e.g., `F1 (foundation) ├── F2`), not a graph with nodes and edges. "Dependency trees" or "feature dependency maps" would be more accurate and avoid setting expectations about a visual graph artifact.

---

##### #10: planner README phase 4 name is incomplete
File: `plugins/planner/README.md:5`

> The phase list reads "Intent → Deep Dive → Edge Cases → Decisions → Plan Generation." Phase 4 in the SKILL.md is "Behaviors, Decisions & Tradeoffs" — it covers domain behaviors, the "why" behind rules, and tradeoff capture, not just decision logging. "Behaviors & Decisions" or "Behaviors, Decisions & Tradeoffs" would be more accurate. Just a thought!

---

##### #11: taskgen README "proposes splits" could imply autonomy
File: `plugins/taskgen/README.md:9`

> "Proposes splits for oversized tasks" is accurate but the SKILL.md is emphatic: "Do not split without the developer's agreement." Adding a qualifier would prevent surprise:
>
> ```
> - Proposes splits for oversized tasks (with developer agreement)
> ```

---

##### #12: taskgen README output section missing two fields
File: `plugins/taskgen/README.md:36`

> The Output section lists four bullets but the SKILL.md task format includes two more: "TDD Sequence (optional)" — a suggested test-implementation ordering when order matters — and the task's "Dependencies on other tasks." Both are relevant for a user evaluating whether taskgen meets their needs.

---

##### #13: review README "Manual" grouped with severity levels
File: `plugins/review/README.md:68`

> Listing "Manual" as a 5th severity level alongside Critical/High/Medium/Low implies it sits on the same scale. In the SKILL.md it has its own ⚠️ icon and "Developer action needed" impact — it means something different from a severity rating. A user may triage it as "low priority" rather than understanding it requires active verification. Suggested rewording:
>
> ```
> 4 severity levels (Critical, High, Medium, Low) plus Manual checks flagged for developer verification
> ```

---

##### #14: review README silent on mandatory Task Completion check in Pipeline mode
File: `plugins/review/README.md:8`

> The Two Modes description does not mention that Pipeline mode always runs Task Completion Verification and cannot be skipped (unless the developer explicitly opts out). This is a behavioral guarantee that distinguishes Pipeline from General mode. Worth adding a parenthetical:
>
> ```
> **Pipeline** (verify implementation against a plan) — always includes Task Completion Verification
> ```

---

##### #15: planner README output missing Open Questions
File: `plugins/review/README.md:38`

> The SKILL.md artifact format includes an "Open Questions (if any)" section for unresolved design issues with suggested defaults. The README Output list ends at "Architecture notes" without mentioning it. Minor — just a completeness gap.

---

##### #16: tdd README missing status-update side-effect
File: `plugins/tdd/README.md:7`

> The tdd skill modifies the plan document in two places: sets task status to `in progress` at start, and `done` at completion. The README describes the cycle steps but not this side-effect, which could surprise users inspecting their plan file. A single bullet would do:
>
> ```
> - Updates task status in the plan document (not started → in progress → done)
> ```

---

##### #17: root README Stage 4 description omits auto mode
File: `README.md:55`

> The table says "reads plan + task from one document, implements one test at a time." All other description surfaces (marketplace.json, plugin.json, tdd README) mention "collaborative or autonomous." A small addition aligns it:
>
> ```
> Collaborative or autonomous TDD cycle — reads plan + task from one document, implements one test at a time
> ```

---

##### #18: architect SKILL.md template uses capitalized "Planner"
File: `plugins/architect/commands/SKILL.md:230`

> The artifact's Next Steps template reads: `` Start with: `Planner for: [feature name]...` `` — using a capital "P". Elsewhere, skills are referenced as "the Planner skill" (fine) or `/planner` (command). In a copy-paste template, "Planner for:" may be read as a literal command string. Normalizing to `/planner for:` or lowercase `planner for:` would avoid confusion. Not a blocker.

---

## Manual Checks Required

*None — this is a documentation-only changeset.*

## Prioritized Action Items

### Must Fix (🔴 Critical / 🟠 High)
- [ ] **#1** — `plugins/review/commands/SKILL.md:10` — Remove stale "review orchestrator" persona label
- [ ] **#5** — `marketplace.json:22` — Add "failure modes" to planner description
- [ ] **#6** — `plugins/tdd/README.md:44` — Expand workflow diagram to show full pipeline

### Should Address (🟡 Medium)
- [ ] **#2** — `plugins/architect/commands/SKILL.md:99,262` — Replace "requirements engineering" prose with "feature-level planning"
- [ ] **#3** — `plugins/review/README.md` — Add missing `## Workflow` section
- [ ] **#7** — `marketplace.json:12` — Add "with dependencies" to architect description
- [ ] **#8** — `marketplace.json:32` — Restore "collaborative test planning" to taskgen description
- [ ] **#9** — `plugins/architect/README.md:6` — Change "dependency graphs" to "dependency trees"
- [ ] **#10** — `plugins/planner/README.md:5` — Update Phase 4 name to include "Behaviors"
- [ ] **#11** — `plugins/taskgen/README.md:9` — Add "(with developer agreement)" to split proposal bullet
- [ ] **#12** — `plugins/taskgen/README.md:36` — Add missing output fields (TDD Sequence, Dependencies)
- [ ] **#13** — `plugins/review/README.md:68` — Clarify Manual is an action flag, not a severity level
- [ ] **#14** — `plugins/review/README.md:8` — Note mandatory Task Completion check in Pipeline mode

### Nice to Have (💭 Low)
- [ ] **#4** — `plugins/taskgen/README.md:41` — Add optional `/architect` step to workflow diagram
- [ ] **#15** — `plugins/planner/README.md:38` — Add "Open Questions" to output list
- [ ] **#16** — `plugins/tdd/README.md:7` — Add status-update behavior bullet
- [ ] **#17** — `README.md:55` — Add "(collaborative or auto)" to Stage 4 description
- [ ] **#18** — `plugins/architect/commands/SKILL.md:230` — Normalize "Planner" capitalization in template

---
*Generated by Review — 2026-03-29*
