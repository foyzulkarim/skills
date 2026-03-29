# architect

Strategic project planning through collaborative conversation. Explores the problem space, maps the domain, identifies constraints, and decomposes the project into ordered phases with dependencies.

## Features

- **5-phase conversation:** Project Scope → Domain Exploration → Architecture Direction → Phasing & Sequencing → Plan Generation
- Produces phased project plans with dependency trees
- Focuses on outcomes, not implementation details
- Identifies risk areas and critical paths
- Supports two input modes: conversational (raw concept) or document-based (existing spec/PRD)
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

This is the optional entry point of the development pipeline:

```
/architect → phased plan  ← you are here
  /planner → feature-level plans
    /taskgen → TDD-ready task specs
      /tdd → implementation
        /review → verification
```
