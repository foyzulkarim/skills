# Task Completion Check

_Read `_protocol.md` first. This check uses the specialized output format below, not the generic findings table._

**Scope:** files changed in the implementation, plus the ARCH document (Change Footprint, Areas of Impact), the task specs (Verification, Files Expected, Must NOT modify, Satisfies REQs, verification plan — from the linked TASKS-`<N>-<slug>.md` in modern mode, or from ARCH's embedded `# Tasks` section in pre-5.0.0 ARCH), and the linked REQ. Pipeline mode only.
**Report section title:** `Task Completion`

Trace every requirement from REQ → ARCH → task spec → implementation, verifying completeness and correctness.

## Severity Calibration

- 🔴 Critical: Missing acceptance criteria, broken core functionality, must-fix before merge
- 🟠 High: Significant gap vs spec, auth/authz issue, type safety hole
- 🟡 Medium: Minor deviation from spec, missing edge case verification
- 💭 Low: Suggestion or minor inconsistency
- ⚠️ Manual: Cannot verify from code — developer must check manually

## Focus Areas

- Every REQ-ID listed in the task's "Satisfies REQs" field is verified by at least one piece of passing evidence
- **Verification evidence matches the task's `Verification` mode:** `tdd`/`test-after` tasks — every Test Plan scenario has a corresponding test that exists and passes; `ui` tasks — the Verification Checklist has evidence (screenshots/observations) plus tests for the listed testable seams; `checklist` tasks — every command/outcome item shows actual output. Do NOT flag a `ui`/`checklist` task for missing unit tests the spec never required — flag missing *evidence* instead
- **Change Footprint adherence:** every file in the task's Files Expected matches the ARCH Change Footprint, and every Change Footprint row owned by the task is present in the diff
- No file in "Must NOT modify" was touched (these are silent-regression hotspots — verify a regression-guard test exists and asserts the unchanged behavior; do not run it)
- No unexpected files were created beyond what the task spec lists — flag scope drift
- **Areas of Impact coverage:** for any M/H risk area touched, confirm the High-Risk Callouts in Implementation Notes were addressed and that the regression-guard or stress test exists with matching assertions (static-only — not run)
- Scope boundaries from the task spec were respected
- Key decisions from ARCH's Architecture Decisions Log were followed
- Things that cannot be verified from code are flagged as manual checks

## Check-Specific Rules

- Read the ARCH and REQ documents fully before starting; build your checklist from REQ-IDs, verification items, and Change Footprint rows.
- Test existence and assertion content is read statically, never executed. Do not claim a test "passes"; claim a test "exists and asserts X." If a task's verification mode is `tdd`/`test-after`, the test's *existence* with matching assertions is the evidence; trust the developer's claim of execution.
- False-positive addition: if an unexpected file appears, confirm it is not listed in an "also touches" note in the task spec.

## Output Format (specialized)

```
## Task Completion

**REQs:** [X/Y verified]
| REQ | Status | Evidence |
|-----|--------|----------|
| R1 | ✅ Verified | [test file:test name / checklist item + evidence] |
| R2 | ⚠️ Manual check | [what to verify manually] |

**Verification Plan ({mode}):** [X/Y items verified]
| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | [from task spec] | ✅ Verified | [test name / screenshot / command output] |
| 2 | [from task spec] | ❌ Missing | [evidence not found] |

**Change Footprint Adherence:**
| ARCH Footprint Row | In Diff? | Notes |
|--------------------|----------|-------|
| New: src/auth/AuthService.ts | ✅ | matches |
| Modified: src/users/UserRepo.ts | ✅ | matches |
| Touched-not-changed: src/api/routes.ts | ✅ untouched | regression-guard test exists + asserts unchanged behavior (🛑 static only — not run) |
| (unexpected) src/api/middleware.ts | ❌ | NOT in Footprint — scope drift |

**Areas of Impact (M/H risk):**
| Area | Risk | Callout addressed? | Regression-guard tests? |
|------|------|--------------------|------------------------|
| UserService callers | M | ✅ | 🛑 static only — regression-guard test exists + asserts |

**Scope:** [✅ Respected | ❌ Violated — explanation]
**ARCH Decisions:** [✅ Followed | ❌ Deviated — explanation]
```

Zero-findings variant: same header block with all ✅ counts and `**Result:** ✅ All requirements verified.` Coverage checklist lists REQ-IDs, verification items, Footprint rows, Must-NOT-modify status, and Areas of Impact status.
