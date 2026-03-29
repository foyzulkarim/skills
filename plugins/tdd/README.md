# tdd

Test-driven development partner. Works through the RED-GREEN-REFACTOR cycle — one test at a time. Supports collaborative mode (pauses at every red/green) and autonomous mode (runs without pausing).

## Features

- **Strict TDD cycle:** RED (failing test) → GREEN (minimum code to pass) → REFACTOR
- One test at a time — never batches or jumps ahead
- Updates task status in the plan document (not started → in progress → done)
- **Two modes:** collaborative (default, pauses for confirmation) and autonomous (`auto`, runs without pausing)
- Reads plan + task spec from a single document for full context
- Auto-detects testing framework and project conventions
- Respects task spec scope boundaries and file restrictions
- Supports session resumption for partially completed tasks

## Usage

```bash
# Implement a task from a plan document (collaborative mode)
/tdd T1 from specs/plans/PLAN-auth-login-flow.md

# Run autonomously without pausing
/tdd auto T1 from specs/plans/PLAN-auth-login-flow.md

# Resume a partially completed task
/tdd T2 from specs/plans/PLAN-user-types-and-validation.md
```

## Install

```
/install-plugin foyzulkarim/skills tdd
```

## The Cycle

1. **RED:** Writes a failing test, runs it, confirms it fails for the right reason
2. **GREEN:** Writes minimum production code, runs tests, confirms all pass
3. **REFACTOR:** Proposes cleanup if needed, runs tests to confirm nothing breaks
4. Repeat for each test scenario in the task spec

## Workflow

```
/architect → phased plan (optional)
  /planner → feature-level plan
    /taskgen → TDD-ready task specs
      /tdd → implementation  ← you are here
        /review → verification
```
