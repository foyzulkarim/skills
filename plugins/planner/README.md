# planner

Feature-level planning through structured conversation. Uncovers requirements, edge cases, and constraints before implementation begins. Produces plan artifact documents.

## Features

- **5-phase Socratic conversation:** Intent → Deep Dive → Edge Cases → Decisions → Plan Generation
- Surfaces hidden requirements and failure modes
- Captures explicit decisions with alternatives and rationale
- Defines clear scope boundaries (in scope AND out of scope)
- Supports two entry modes: from a project plan or standalone brief
- Supports multi-session planning for large features

## Usage

```bash
# Plan a feature from a project plan
/planner feature F2 from specs/plans/PROJECT-inventory-api.md

# Plan a standalone feature
/planner
```

Then describe the feature or piece of work you want to plan.

## Install

```
/install-plugin foyzulkarim/skills planner
```

## Output

Saves plan artifacts to `/specs/plans/PLAN-[slug].md` with:
- Functional and non-functional requirements
- Detailed specifications with validation rules and error scenarios
- Edge cases and failure modes with decisions
- Scope boundaries and dependencies
- Architecture notes

## Workflow

```
/architect → phased plan
  /planner → feature-level plan  ← you are here
    /taskgen → TDD-ready task specs
      /tdd → implementation
        /review → verification
```
