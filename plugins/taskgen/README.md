# taskgen

Generate TDD-ready task specifications from plan artifacts. Collaboratively builds test plans and produces structured task files that drive test-driven development.

## Features

- Transforms plan artifacts into actionable task specs
- Collaboratively drafts test plans before writing full specs
- GIVEN/WHEN/THEN format for all test scenarios
- Sizes tasks for tight TDD cycles (3-8 test scenarios)
- Proposes splits for oversized tasks

## Usage

```bash
# From a plan artifact
/taskgen specs/plans/PLAN-auth-login-flow.md

# For simple tasks without a full plan
/taskgen add a health check endpoint
```

## Install

```
/install-plugin foyzulkarim/skills taskgen
```

## Output

Saves task specs to `/specs/tasks/PHASE-EPIC-TASK-slug.md` with:
- Test plan with file paths, describe blocks, and scenarios
- Implementation notes with pattern references
- Scope boundaries and expected files
- Dependencies on other tasks

## Workflow

```
/planner → feature-level plan
  /taskgen → TDD-ready task specs  ← you are here
    /tdd → implementation
```
