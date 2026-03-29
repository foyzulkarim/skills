# review

Comprehensive code review with a triage-first approach. Proposes relevant checks, runs them in parallel as agents, and produces a combined report. Works with any repository, language, or framework.

## Features

- **Triage-first:** Proposes which checks to run before spending tokens — developer confirms scope
- **Up to 14 specialized checks** (grouped below)
- **Two review modes:** Pipeline (verify implementation against a plan, always includes Task Completion Verification) and General (PR, branch, staged, diff)
- **2-Level Tracing Protocol** for deep analysis on TypeScript, runtime, async, React/Next.js, Express, and database patterns
- **Tech stack auto-detection:** Languages, frameworks, databases, testing frameworks
- **Language-agnostic:** Adapts advice to the detected stack
- **Structured report:** Full markdown report with severity-ranked findings and verdict

## Checks

### General Checks (1-8)
1. **Task Completion Verification** — verifies implementation against plan/task spec (pipeline mode only)
2. **Code Quality & Patterns** — conventions, structure, DRY, naming, complexity
3. **Test Coverage & Quality** — coverage gaps, edge cases, test isolation, mock appropriateness
4. **Performance** — algorithmic complexity, N+1 queries, caching, bundle size
5. **Security** — input validation, injection risks, auth, OWASP Top 10
6. **Error Handling & Observability** — try-catch, logging, graceful degradation
7. **Documentation** — README, API docs, code comments, migration guides
8. **Configuration & Dependencies** — env vars, new dependencies, CVEs, build config

### Deep Analysis Checks (9-14, use 2-Level Tracing)
9. **TypeScript Strictness** — `any` usage, type assertions, generics, `strictNullChecks`
10. **Runtime Behavior** — hidden classes, event loop, memory leaks, prototype pollution
11. **Async Patterns** — unhandled rejections, race conditions, resource cleanup
12. **React / Next.js Patterns** — hooks rules, stale closures, hydration, server/client boundaries
13. **Express Patterns** — middleware ordering, async handlers, CORS, rate limiting
14. **Database Patterns** — N+1 queries, transactions, connection pools, query injection

## Usage

```bash
# Pipeline mode — verify implementation against a plan
/review specs/plans/PLAN-auth-login-flow.md

# General mode — review a pull request
/review pr 123

# Compare a branch against default branch
/review branch feature/auth-redesign

# Review staged changes (default)
/review staged

# Review a diff file
/review diff changes.diff

# No arguments defaults to staged
/review
```

## Install

```
/install-plugin foyzulkarim/skills review
```

## Workflow

This is the final stage of the development pipeline:

```
/architect → phased plan (optional)
  /planner → feature-level plan
    /taskgen → TDD-ready task specs
      /tdd → implementation
        /review → verification  ← you are here
```

## Output

Generates a `CODE-REVIEW-*.md` report with:
- Metadata (tech stack, checks run/skipped, files/lines changed)
- Verdict: PASS / PASS WITH FINDINGS / FAIL (pipeline) or APPROVE / APPROVE WITH COMMENTS / REQUEST CHANGES (general)
- Findings by category with 4 severity levels (Critical, High, Medium, Low) plus Manual checks flagged for developer verification
- Inline review comments with suggested fixes in collaborative tone
- Manual checks required
- Prioritized action items
