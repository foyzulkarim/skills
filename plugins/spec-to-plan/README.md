# spec-to-plan

Transform a specification, requirements document, or product brief into a phased project plan with ordered phases, dependency graph, and acceptance criteria.

## Features

- Decomposes projects into meaningful, demonstrable phases
- Orders phases by dependency and risk (infrastructure first, highest-risk next)
- Each phase includes: Goal, Delivers, Acceptance Criteria, Test Strategy
- Produces outcome-focused plans — no file names, no implementation prescriptions
- Generates a phase dependency graph

## Usage

```bash
/spec-to-plan
```

Then point it at your spec or describe what you want to plan.

## Install

```
/install-plugin foyzulkarim/skills spec-to-plan
```

## Workflow

This is part of a development pipeline:

```
/spec-to-plan → phased plan
  /plan-to-phases → detailed phase docs
    /taskgen → TDD-ready task specs
      /tdd → implementation
```
