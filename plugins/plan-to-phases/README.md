# plan-to-phases

Expand a high-level project plan into detailed phase documents — domain briefings that transfer the knowledge needed to make good implementation decisions.

## Features

- Produces **domain briefings**, not implementation specs
- Describes behaviors, business rules, and edge cases
- Calls out downstream impact between phases
- Identifies locked constraints vs. open decisions
- Quality checklist prevents plan echo and implementation drift

## Usage

```bash
/plan-to-phases
```

Then point it at your plan and specify which phase(s) to detail.

## Install

```
/install-plugin foyzulkarim/skills plan-to-phases
```

## Workflow

This is part of a development pipeline:

```
/architect → phased plan (greenfield)
  OR
/spec-to-plan → phased plan (from existing spec)

  ↓
  /plan-to-phases → detailed phase docs  ← you are here
    /taskgen → TDD-ready task specs
      /tdd → implementation
```
