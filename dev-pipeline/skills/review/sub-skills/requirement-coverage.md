# Requirement Coverage Check

_Read `_protocol.md` first. This check uses the specialized output format below, not the generic findings table. It is static-only — assertions are read and audited, never executed._

**Scope:** the linked REQ (or ARCH's Inferred Requirements when no REQ exists), the TASKS verification plans, every test file covering changed production code (search the whole test tree, not just the diff), and the changed production files for orphan analysis. Pipeline mode only.
**Report section title:** `Requirement Coverage`

Code coverage measures whether lines execute; this check measures whether **the asserted behavior is the required behavior**. A suite can be green with every branch covered while an acceptance criterion has no test, a test asserts a weaker version of its criterion, or a test asserts what the code does rather than what the requirement says. Trace both directions: every requirement to the assertions that prove it, and every test back to the requirement it serves.

## Severity Calibration

- 🔴 Critical: acceptance criterion with no test that asserts it — nothing fails when the requirement is violated
- 🟠 High: weakly covered criterion — a test exists but its assertions prove less than the criterion states (REQ demands a 409 with an error body; the test asserts only the status)
- 🟡 Medium: decayed trace — a test tagged `_(verifies R5)_` whose assertions no longer match R5; orphan test cluster suggesting uncaptured scope
- 💭 Low: trace hygiene — test names or structure that obscure which requirement they verify
- ⚠️ Manual: criterion not verifiable by automated tests (visual, deploy-time, third-party surface) — route to the QA plan or manual verification

## Focus Areas

- **Assertions, not names or tags.** Judge coverage only by reading assertion bodies. Test titles and `_(verifies …)_` tags from the TASKS plan are claims to audit, never evidence.
- **Criterion semantics, fully.** A criterion is Covered only when every observable it states is asserted: status AND body, value AND format, effect AND side-effect. A partial assertion is Weak, with the missing observable named.
- **Edge-case rows are criteria too.** Every row of REQ's "Edge Cases & Failure Modes" table traces exactly like an acceptance criterion.
- **Static analysis only.** A criterion counts as ✅ Covered only if its test asserts it, and the assertion matches the criterion's full semantics. You do not run the suite; do not claim a test "passes" — claim a test "asserts X." Mark every runtime-dependent status "⚠️ static only" so the developer knows execution was not verified.
- **Orphans are signal, not sin.** Tests tracing to no requirement are either uncaptured inferred requirements (should flow back upstream) or scope creep — group them and say which you suspect, 🟡 at most.
- **Respect verification modes.** Task items routed to `ui`/`checklist` modes owe their own evidence type, not unit tests — trace those criteria to checklist evidence or the QA plan instead of demanding assertions the spec never required.

## Check-Specific Rules

- Read the REQ fully before starting; build your checklist from every acceptance criterion and edge-case row, keeping their IDs.
- False-positive mitigations: a criterion may be proven by an integration/e2e test outside the diff — search the whole test tree before declaring Uncovered; CLAUDE.md may intentionally scope certain layers out of unit testing; a `specs/qa/QA-*.md` plan may own visual or deploy-time criteria — check for one before flagging those as gaps.
- Never edit code, tests, or config — including to make a test pass or to add a missing test. Flag; don't fix.

## Output Format (specialized)

```
## Requirement Coverage

**Suite run:** *(not executed — static analysis only)*
**Criteria:** X/Y covered · N weak · N uncovered · N manual

| Req | Criterion (abridged) | Test evidence | Run | Status |
|-----|----------------------|---------------|-----|--------|
| R1 | duplicate email → 409 + error body | `auth.test.ts:88` — asserts status and body | ✅ pass | ✅ Covered |
| R2 | resume restores values and step | `wizard.test.ts:41` — asserts values only | ✅ pass | 🟠 Weak — current step not asserted |
| R3 | soft-deleted email reactivates | none found (whole test tree searched) | — | 🔴 Uncovered |
| E2 | dependency down 30s → retry | `client.test.ts:112` — mocks failure, asserts recovery | ✅ pass | ✅ Covered |
| N1 | banner copy reads correctly | QA plan case QA-7 | — | ⚠️ Manual — owned by QA plan |

**Orphan tests** (no requirement trace):
| Test | File:line | Likely intent |
|------|-----------|---------------|
| "caches lookups for 5 min" | `service.test.ts:203` | uncaptured inferred requirement — consider adding to REQ/ARCH |
```

Zero-findings variant: the same header block with all criteria ✅ and `**Result:** ✅ Every criterion covered by a passing, semantically matching test.` The coverage checklist lists every criterion ID with its verdict and the suite-run line.
