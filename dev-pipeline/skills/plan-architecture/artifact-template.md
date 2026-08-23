# Architecture: [Feature / System Name]

> **Date:** [today's date]
> **Issue:** #[N] _(omit this row entirely when there is no linked issue — never `#none` or empty)_
> **Phase:** 2 of 5 (System Architecture)
> **Requirements source:** [path to REQ-*.md, or "Standalone brief — see Inferred Requirements"]
> **Tasks:** TASKS-<N>-<slug>.md _(use `TASKS-<slug>.md` when there is no linked issue — never omit this row; it is how implement and review resolve the task specs)_
> **Type:** [feature | refactor | migration | infrastructure]

## Architecture Summary

[3–5 sentences: the shape of the solution. A reader who has the REQ in hand
should understand the *how* from this section alone.]

## Inferred Requirements (if Mode B / no REQ)

[Only present when no REQ-*.md exists. Capture the requirements implicit in
the brief so downstream skills have something to trace tasks against.]

| ID  | Inferred Requirement              | Source                              |
|-----|-----------------------------------|-------------------------------------|
| R1  | [requirement]                     | [brief paragraph / ticket / etc.]   |

## High-Level Structure

[ASCII diagram or text description: layers, services, data flow, what's added
vs modified in the existing system.]

## Tech Choices

| Area           | Decision                | Alternatives Considered    | Rationale                         |
|----------------|-------------------------|----------------------------|-----------------------------------|
| [framework]    | [choice]                | [alternatives]             | [why]                             |
| [storage]      | [choice]                | [alternatives]             | [why]                             |

## Patterns & Conventions

- **[Pattern]** — applied because [reason]; affects [which parts]
- **[Convention]** — from CLAUDE.md / existing code; followed throughout

## Data Models

### [Entity Name]

**Purpose:** [what it represents]

**Key fields:**
| Field          | Type / Constraint           | Notes                              |
|----------------|-----------------------------|------------------------------------|
| [field]        | [type, required/optional]   | [why it matters]                   |

**Relationships:**
- [related entity] — [cardinality, FK direction]

**Lifecycle:**
- [created when] → [transitions] → [archived / deleted when]

## API Contracts / Interfaces

### [Component / Service / Module Name]

**Boundary:** [HTTP API | library API | internal module | event producer/consumer]

**Operations:**

| Method/Op   | Path / Signature           | Purpose            | Errors / Returns                  |
|-------------|----------------------------|--------------------|-----------------------------------|
| [op]        | [signature]                | [what it does]     | [success + error cases]           |

**Auth requirements:** [who can call this]

## Module Boundaries

| Module / Package         | Responsibility                       | Allowed Dependencies              |
|--------------------------|--------------------------------------|-----------------------------------|
| [name]                   | [what it owns]                       | [what it can import]              |

## Change Footprint

_The concrete answer to "where does this land in the codebase?" — produced during the Phase D2 walk._

### New files / modules

| Path                                | Purpose                              | Pattern reference                  |
|-------------------------------------|--------------------------------------|------------------------------------|
| `src/...`                           | [what it owns]                       | [existing file to mirror]          |

### Modified files / modules

| Path                                | What changes here                                      |
|-------------------------------------|--------------------------------------------------------|
| `src/...`                           | [one-line description of the change]                   |

### Deleted / replaced

| Path                                | Reason                                                 |
|-------------------------------------|--------------------------------------------------------|
| `src/...`                           | [why it goes away / what replaces it]                  |

### Touched but not changed (silent-regression hotspots)

| Path                                | Why it matters                                         |
|-------------------------------------|--------------------------------------------------------|
| `src/...`                           | [what behavior it depends on that's shifting]          |

## Areas of Impact

_Broader-than-files impact — modules, services, teams, contracts, cross-cutting effects._

| Area                                | Impact                                | Risk (L/M/H) | Why                       |
|-------------------------------------|---------------------------------------|--------------|---------------------------|
| [module / service / team / system]  | [what changes for them]               | [L/M/H]      | [one-line rationale]      |

**Contract changes:** [list any external/public contract that shifts — API responses, event payloads, public types — and which consumers depend on it.]

**Cross-cutting ripples:** [auth, telemetry, migrations, feature flags, build/deploy — anything that this change reaches into outside the primary modules.]

## Cross-Cutting Concerns

- **Errors:** [propagation, retry, surfacing strategy]
- **Logging & metrics:** [what, level, fields]
- **Auth / authz:** [check location, mechanism]
- **Performance:** [budgets, caching, query patterns]
- **Security:** [validation boundaries, data classification, secrets]
- **Migrations / rollout:** [deployment plan, backward-compat]

## Architecture Decisions Log

| #   | Decision                          | Alternatives                     | Chosen Because                  | Satisfies REQs |
|-----|-----------------------------------|----------------------------------|---------------------------------|----------------|
| A1  | [decision]                        | [alternatives]                   | [reasoning]                     | R1, R3         |
| A2  | [decision]                        | [alternatives]                   | [reasoning]                     | R2             |

## Risk & Stress-Test Scenarios

### Forward — runtime failure scenarios

| Scenario                              | How the Design Handles It                            |
|---------------------------------------|------------------------------------------------------|
| [failure / edge / scale scenario]     | [response, or "GAP — see Open Questions"]            |

### Backward — regression risk per touched area (brownfield only)

| Touched area (from Change Footprint)  | What could regress                | How we'd know / mitigation         |
|---------------------------------------|-----------------------------------|------------------------------------|
| [path or module]                      | [existing behavior at risk]       | [test, monitor, or design choice]  |

## Open Questions

- [Question that wasn't resolved in this session]
  - **Impact if unresolved:** [what happens if we guess]
  - **Suggested default:** [reasonable assumption to revisit]

## Out of Scope

- [explicit exclusion] (reason: [why deferred])

