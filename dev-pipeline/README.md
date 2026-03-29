# dev-pipeline

A structured development pipeline for Claude Code — from project planning through code review.

## Skills

```
/plan-project → phased project plan    (optional, for multi-feature work)
  /plan-feature → feature-level plan
    /generate-tasks → TDD-ready task specs
      /tdd → implementation
        /review → verification
```

### /plan-project

Strategic project planning through a 5-phase conversation. Explores the problem space, maps the domain, identifies constraints, and decomposes the project into ordered phases with dependencies. Use when the work spans multiple features.

### /plan-feature

Feature-level planning through a 5-phase Socratic conversation. Uncovers requirements, edge cases, failure modes, and constraints before implementation. Produces a plan artifact (`PLAN-*.md`).

### /generate-tasks

Transforms plan artifacts into TDD-ready task specifications. Collaboratively drafts test plans and embeds task specs directly in the plan document so the TDD skill has full context in one file.

### /tdd

Test-driven development partner. Works through RED-GREEN-REFACTOR one test at a time. Supports collaborative mode (pauses at every step) and autonomous mode (`/tdd auto`).

### /review

Comprehensive code review with a triage-first approach. Proposes relevant checks, runs them as parallel agents, and produces a combined report. Up to 14 specialized checks. Works with any language or framework.

## Install

```
/install-plugin foyzulkarim/skills dev-pipeline
```

## Output Conventions

- Project plans: `/specs/plans/PROJECT-[slug].md`
- Feature plans: `/specs/plans/PLAN-[slug].md`
- Task specs: Embedded in `PLAN-*.md` documents
- Review reports: `CODE-REVIEW-*.md` at repo root
