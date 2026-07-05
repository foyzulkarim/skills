# Mode: checklist — Execute, Then Prove with Commands

For config changes, dependency bumps, docs, scripts, and chores — work whose done-signal is command outcomes, not tests. The task's Verification Checklist lists the commands to run and the outcomes that count as pass.

## The Loop

1. **Read the Verification Checklist.** Each item should be a command (or observable outcome) with its expected result — "build passes", "app boots and /health returns 200", "migration applies and rolls back cleanly", "lint is clean". If an item is vague, tighten it with the developer first.
2. **Make the change** exactly as scoped — config value, version bump, script, doc edit.
3. **Run every verification command** and capture the actual output.
4. **Compare expected vs. actual** for each item. Any mismatch is a failure to resolve before the task is done — not a footnote.
5. **Collaborative:** show the outputs; wait for confirmation. **Autonomous:** include the command outputs in the task summary.

## Mode-Specific Rules

- Never claim an outcome you didn't run — "should still build" is not verification; the command output is.
- Dependency bumps: run the project's full test suite and build as part of verification even if the checklist doesn't say so, and skim the changelog for breaking changes in the jumped range.
- Config changes touching secrets, auth, or deploy targets are high-risk by default — in autonomous runs, stop for sign-off (see the whole-plan stop conditions).
- If a "chore" starts requiring production-code edits to keep commands green, the task was mis-classified — stop and discuss re-scoping.
