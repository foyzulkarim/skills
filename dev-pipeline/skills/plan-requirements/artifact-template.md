# Requirements: [Feature / Bugfix Name]

> **Date:** [today's date]
> **Type:** [feature | bugfix | refactor | infrastructure]
> **Source:** [verbal brief | PRD path | ticket key | RCA doc]
> **Phase:** 1 of 5 (Requirement Engineering)

## Summary

[2–3 sentences: what we're building or fixing, and why. A reader who has never
seen this project should understand the *what* and *why* from this section alone.]

## Problem & Motivation

[Why this work matters. Trigger (customer ask, incident, strategic bet).
Who benefits and how. What happens if we don't do it.]

## Users & Consumers

- [User type / consuming service] — [what they need from this]

## Functional Requirements

Each requirement is specific, testable, and assigned an ID for traceability.

| ID  | Requirement                                  | Acceptance Criterion                              |
|-----|----------------------------------------------|---------------------------------------------------|
| R1  | [specific behavior]                          | [verifiable done signal]                          |
| R2  | [specific behavior]                          | [verifiable done signal]                          |

## Non-Functional Requirements

| ID  | Requirement                                  | Acceptance Criterion                              |
|-----|----------------------------------------------|---------------------------------------------------|
| N1  | [performance / security / reliability]       | [verifiable measurement]                          |

## Behaviors & Domain Rules

[Organized by area, with subheadings if useful.]

**Why these rules matter:**
- [Explain the *why* behind each non-obvious rule — what it prevents or enables]
- [Note downstream impact — how this affects other features or parts of the system]

**Common mistakes:**
- [What a developer would likely get wrong on a first attempt]

## Edge Cases & Failure Modes

| Scenario                              | Decision                          | Rationale                          |
|---------------------------------------|-----------------------------------|------------------------------------|
| [edge case description]               | [what should happen]              | [why]                              |
| [failure mode]                        | [how it should be handled]        | [why]                              |

## Decisions Log

| #   | Decision                          | Alternatives Considered            | Chosen Because                     |
|-----|-----------------------------------|------------------------------------|------------------------------------|
| 1   | [decision]                        | [alternatives]                     | [reasoning]                        |

## Scope Boundaries

### In Scope
- [explicit inclusion]

### Out of Scope
- [explicit exclusion] (reason: [why deferred])

## Open Questions

- [Question that wasn't resolved in this session]
  - **Impact if unresolved:** [what happens if we guess]
  - **Suggested default:** [reasonable assumption to revisit later]

---
_This requirements document is the input for the **plan-architecture** skill._
_Next step: `/plan-architecture from: specs/requirements/REQ-<slug>.md`_
