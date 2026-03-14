# tdd

Test-driven development partner. Works through the RED-GREEN-REFACTOR cycle collaboratively — one test at a time, with developer confirmation at every checkpoint.

## Features

- **Strict TDD cycle:** RED (failing test) → GREEN (minimum code to pass) → REFACTOR
- One test at a time — never batches or jumps ahead
- Pauses for developer confirmation at every red and green
- Auto-detects testing framework and project conventions
- Respects task spec scope boundaries and file restrictions

## Usage

```bash
# Implement a task spec
/tdd specs/tasks/P2-E3-T1-app-error-base-class.md

# Resume a partially completed task
/tdd specs/tasks/P3-E1-T1-user-types-and-validation.md
```

## Install

```
/install-plugin foyzulkarim/skills tdd
```

## The Cycle

1. **RED:** Writes a failing test, runs it, shows the failure, waits for confirmation
2. **GREEN:** Writes minimum production code, runs tests, shows results, waits for confirmation
3. **REFACTOR:** Proposes cleanup if needed, runs tests to confirm nothing breaks
4. Repeat for each test scenario in the task spec

## Workflow

```
/taskgen → TDD-ready task specs
  /tdd → implementation  ← you are here
```
