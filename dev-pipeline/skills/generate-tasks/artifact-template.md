# Tasks

## Task T1: [Clear, Specific Title]

> **Status:** not started
> **Effort:** [xs | s | m | l | xl]
> **Priority:** [critical | high | medium | low]
> **Depends on:** [T2, T3, or "None"]
> **Satisfies REQs:** [R1, R2, ... or "N/A — no REQ linked"]
> **Footprint slice:** [which subset of ARCH's Change Footprint this task owns — e.g., "New: AuthService, AuthController; Modified: UserRepo (add findByEmail)"]
> **High-risk areas touched:** [Areas of Impact entries with M/H risk this task touches, or "None"]

### Description

[2-3 sentences: WHAT this delivers and WHY. Context for a developer who has
never seen the codebase.]

### Test Plan

#### Test File(s)
- `tests/...` [path based on project conventions]

#### Test Scenarios

##### [Describe Block — e.g., "User Registration"]

- **[test name]** — GIVEN [precondition] WHEN [action] THEN [expected outcome] _(verifies R1)_
- **[test name]** — GIVEN [precondition] WHEN [action] THEN [expected outcome] _(verifies R2)_

##### [Describe Block — e.g., "Registration Validation"]

- **[test name]** — GIVEN [precondition] WHEN [action] THEN [expected outcome] _(verifies R3)_

##### [Describe Block — e.g., "Registration Error Handling"]

- **[test name]** — GIVEN [error condition] WHEN [action] THEN [error handling behavior] _(verifies REQ edge case)_

##### [Describe Block — e.g., "Resilience"]

- **[test name]** — GIVEN [transient failure] WHEN [action] THEN [recovery behavior] _(verifies ARCH forward stress-test)_

##### [Describe Block — e.g., "Regression Guard"]

- **[test name]** — GIVEN [existing behavior on touched-but-not-changed file] WHEN [action] THEN [behavior is preserved] _(guards ARCH backward-regression risk for `path/to/file`)_

[All scenarios pulled from REQ acceptance criteria, REQ edge cases, ARCH forward
stress-test scenarios, and ARCH backward-regression risks for touched-but-not-
changed files. Each test should be independently meaningful and runnable.]

### Implementation Notes

- **Module(s):** [from ARCH's Module Boundaries]
- **Pattern reference:** [existing file to follow — found by scanning src/]
- **Key decisions:** [from ARCH's Architecture Decisions Log — pull only those that constrain this task]
- **Libraries:** [specific packages — from ARCH's Tech Choices and package.json]
- **High-risk callouts:** [for any M/H Area of Impact this task touches: one-line note on what to watch for and how the test plan addresses it]

### Scope Boundaries

- Do NOT [from ARCH's Out of Scope section]
- Do NOT [agent-added boundaries to prevent gold-plating]
- Only implement [exact boundary from ARCH's structure]

### Files Expected

_Anchored on ARCH's Change Footprint — every entry below should map back to a
specific Footprint row, and every Footprint row claimed by this task should
appear here._

**New files:** _(from ARCH "New files / modules")_
- `src/...` [purpose, mirroring ARCH's "Pattern reference" column]
- `tests/...`

**Modified files:** _(from ARCH "Modified files / modules")_
- `src/...` ([what changes here, carried from ARCH])

**Must NOT modify:** _(from ARCH "Touched but not changed", plus task-scoped boundaries)_
- `src/...` (silent-regression hotspot — covered by regression-guard tests above)
- `src/...` (out of scope per ARCH "Out of Scope")

### TDD Sequence (optional)

[If the order of test implementation matters — e.g., build the base class before
testing inheritance — suggest a sequence here. Otherwise omit this section.]

---

_Multiple tasks: repeat the full `## Task T[n]` structure above under the single
`# Tasks` heading._

_Status values: `not started` (defined, not picked up) | `in progress` (TDD cycle
underway) | `done` (all tests pass) | `blocked` (cannot proceed — see notes).
The tdd skill updates this field as it works._
