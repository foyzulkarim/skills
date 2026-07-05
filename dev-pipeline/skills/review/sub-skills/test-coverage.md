# Test Coverage & Quality Check

_Read `_protocol.md` first._

**Scope:** test files and the production files they should cover.
**Report section title:** `Test Coverage & Quality`

## Severity Calibration

| Severity | Criteria |
|----------|----------|
| 🔴 Critical | No tests for critical path / security-sensitive logic |
| 🟠 High | Missing error scenario tests, untested public API |
| 🟡 Medium | Missing edge case, flaky pattern, weak assertion |
| 💭 Low | Naming inconsistency, minor structural improvement |
| ⚠️ Manual | Cannot verify from code — developer must check manually |

## Focus Areas

- Presence of unit tests for new/modified production code
- Edge case coverage (null, empty, boundary values, unexpected input)
- Error and exception scenario testing (what happens when things go wrong)
- Test isolation and independence (no shared mutable state, no order dependencies)
- Test names clearly describe the behavior being tested (not the implementation)
- Arrange-Act-Assert pattern followed
- Mock appropriateness — mock at boundaries (external services, DB), not the thing being tested
- No flaky patterns (hardcoded timeouts, race conditions, external network dependencies)
- Assertions are specific, not just "expect result to exist" or `expect(true).toBe(true)`
- Regression test coverage for bug fixes — is there a test that would have caught the original bug?
- For each untested function or code path, provide a concrete example of what a test would look like

## Check-Specific Rules

- False-positive additions: an untested path may be covered by an integration test not visible in the diff; CLAUDE.md may intentionally skip unit tests for certain layers. In pipeline mode, tasks with `ui`/`checklist` verification modes only owe tests for their listed testable seams — don't demand full unit coverage the task spec never required.
- When suggesting a missing test, be concrete: provide the test name, the scenario, and the key assertion. Not "add tests for error handling" — but "add a test for `createUser` that verifies it throws `UserAlreadyExistsError` when the email is already registered."
- Checklist protocol addition: for each changed production file, identify the changed functions and check each has corresponding coverage.

## Comment Guidance

- Be specific: name the function, the scenario, and the missing assertion; provide a test stub where helpful.
