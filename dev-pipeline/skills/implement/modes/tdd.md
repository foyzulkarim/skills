# Mode: tdd — RED-GREEN-REFACTOR

For each scenario in the task's Test Plan, repeat this cycle. One test at a time — never batch multiple tests before making them pass.

## RED — Write a Failing Test

1. Pick the next test from the Test Plan (follow the task's TDD Sequence if present).
2. Write or modify the test file, following the project's existing test patterns and Arrange-Act-Assert.
3. Run the test suite and confirm the new test fails.
4. Verify it fails for the **right reason** — missing module, missing function, incorrect return value. Not a syntax error, import typo, or misconfigured mock. If wrong, fix the test before moving on.
5. **Collaborative:** show the failure output; wait for the developer to confirm the red. **Autonomous:** verify and proceed.

## GREEN — Make It Pass

1. Write the **minimum production code** to pass the failing test. No more.
2. Run the suite; confirm the new test passes and nothing existing broke. If an existing test broke, fix it before continuing.
3. **Collaborative:** show the results; wait for confirmation. **Autonomous:** verify and proceed.

## REFACTOR — Clean Up

Assess duplication, naming, structure, readability across test and production code. **Collaborative:** propose warranted refactors, explain what and why, refactor on agreement, re-run the suite. **Autonomous:** apply clearly beneficial refactors (duplication, naming) and re-run; skip discretionary ones.

Then pick up the next test and repeat.

## Writing Tests

- One behavior per test; error cases get their own tests.
- Descriptive names mirroring the task spec's scenario language.
- Independent tests — no shared mutable state; per-test setup for mutable fixtures.
- Import from the production path even if the module doesn't exist yet — that's how the test fails for the right reason.
- Mock boundaries (databases, APIs, services), never the thing being tested.

## Mode-Specific Rules

- Never write the next test before the current one is green.
- Never write production code beyond what the current test needs.
- **Collaborative only:** never write production code before the developer has seen and confirmed the red.
- Run the task's regression-guard tests early in the cycle when the task touches high-risk areas.
