# taskgen

Generate TDD-ready task specifications from plan artifacts. Collaboratively builds test plans and embeds task specs directly in plan documents so the TDD agent has full context in one file.

## Features

- Transforms plan artifacts into actionable task specs
- Collaboratively drafts test plans before writing full specs
- GIVEN/WHEN/THEN format for all test scenarios
- Sizes tasks for tight TDD cycles (3-8 test scenarios)
- Proposes splits for oversized tasks
- Tasks embedded directly in plan documents — no file sprawl

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

Appends task specs to the existing `PLAN-*.md` file with:
- Test plan with file paths, describe blocks, and scenarios
- Implementation notes with pattern references
- Scope boundaries and expected files (new, modified, must-not-touch)
- Dependencies on other tasks
- Task status tracking (not started → in progress → done)

## Workflow

```
/planner → feature-level plan
  /taskgen → TDD-ready task specs  ← you are here
    /tdd → implementation
      /review → verification
```
