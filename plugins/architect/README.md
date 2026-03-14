# architect

Strategic project planning through collaborative conversation. Explores the problem space, maps the domain, identifies constraints, and decomposes the project into ordered phases with dependencies.

## Features

- **6-phase conversation:** Vision → Domain → Constraints → Scope → Decomposition → Plan Generation
- Produces phased project plans with dependency graphs
- Focuses on outcomes, not implementation details
- Identifies risk areas and critical paths
- Respects developer decisions — suggests, doesn't prescribe

## Usage

```bash
/architect
```

Then describe your project concept or idea. The architect will guide you through a structured conversation.

## Install

```
/install-plugin foyzulkarim/skills architect
```

## Workflow

This is the entry point of the development pipeline:

```
/architect → phased plan  ← you are here
  /plan-to-phases → detailed phase docs
    /planner → feature-level plans (optional)
      /taskgen → TDD-ready task specs
        /tdd → implementation
```
