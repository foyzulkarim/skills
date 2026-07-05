# Mode: test-after — Increment, Then Cover

For work whose shape emerges while coding but is still assertable once written: integration wiring, migrations, refactors over existing coverage. Tests come after each increment, not after the whole task — the loop is small and the coverage debt never exceeds one increment.

## The Increment Loop

1. **Run regression guards first.** If the task has regression-guard scenarios (touched-but-not-changed files, M/H-risk areas), write and run those tests **before changing anything** — they must pass against current behavior, or the baseline assumption is wrong. They are your tripwire for the rest of the task.
2. **Pick the next increment** — the smallest coherent slice of the task (one wiring path, one migration step, one moved module). State what "working" means for it before you write code.
3. **Implement the increment.** Follow the task's pattern references and the project's conventions.
4. **Cover it.** Write the test(s) from the task's Test Plan that this increment enables, plus any assertion needed for behavior you discovered while implementing. An increment without tests is not finished.
5. **Run the full suite** — the new tests pass, the regression guards still pass, nothing else broke.
6. **Collaborative:** show the increment and its evidence; wait for confirmation. **Autonomous:** verify and proceed.

Repeat until every scenario in the task's Test Plan is implemented and covered.

## Mode-Specific Rules

- Never accumulate more than one increment of untested code — "I'll test it all at the end" is the failure mode this loop exists to prevent.
- If an increment turns out to be pure, contract-shaped logic, say so — it likely deserved `tdd`; extract it, write its test first, and note the mismatch for the developer.
- Discovered behavior that the Test Plan doesn't cover gets a test anyway, flagged to the developer as an addition.
- A refactor task is done only when the suite proves behavior is unchanged — new capability appearing during a refactor is scope drift; stop and discuss.
