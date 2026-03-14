---
allowed-tools: Read, Write, Glob, Grep
description: Transform a spec or requirements document into a phased project plan with ordered phases, dependency graph, and acceptance criteria
---

# Spec to Plan

## Overview

Transform a specification or requirements document into a **phased project plan**. Each phase delivers a working slice of the product. The plan describes *outcomes* — never file names, directory structures, or implementation decisions. Those emerge during development when you have the most context.

## When to Use

- User has a spec, requirements doc, PRD, or product brief and wants a development plan
- User says "plan this", "break this into phases", "create a plan from this spec"
- Starting a new project that needs structure before implementation
- Restructuring existing work into ordered phases

**When NOT to use:**
- Expanding a plan into detailed phase documents (use `plan-to-phases`)
- Implementing/executing a phase (that's development)
- Writing the spec itself (this skill assumes a spec exists)

## Core Principles

**1. Plans describe outcomes, not implementation.**
A phase says *what* it delivers and *how you know it's done*. It never prescribes file names, directory structures, or component boundaries. Those decisions are made during development when you have the most context.

**2. Discovery happens at phase entry, not during planning.**
When a developer starts a phase, they study the spec, identify behaviors, and break them into tasks. Trying to do this during planning produces plans that fight the code instead of guiding it.

**3. Each phase builds on a tested foundation.**
Phase N trusts that Phase N-1 works because it has passing tests. You extend, you don't re-verify what's already green. This ordering must be respected in the plan.

## Phase Anatomy

Every phase in the plan contains these sections:

### Goal
One or two sentences. Why does this phase exist? What capability does the product gain when it's done?

### Delivers
A bullet list of outcomes — capabilities, behaviors, and qualities the phase produces. Written from the user's or system's perspective, not the developer's.

- Good: "Draft auto-save to persistent storage (resume after browser close)"
- Bad: "Create `lib/storage.ts` with `saveDraft()` and `loadDraft()` functions"

### Acceptance Criteria
Observable, testable conditions that must all be true for the phase to be complete. These are behavior assertions, not implementation checks.

- Good: "Refreshing mid-setup restores all progress"
- Bad: "localStorage contains a key called `budgetPlan_draft`"

### Test Strategy
Which categories of tests this phase needs and what behaviors they cover. Not test file names or specific test case signatures — just enough to know what the test suite should prove.

- Good: "Unit: Currency formatting handles thousands separators, short notation, zero, negatives, and round-trip parsing"
- Bad: "Unit: `lib/format.ts` — `fmt(1234.56)` → `$1,234.56`"

## Planning Process

### Step 1: Read and internalize the spec
Understand the full scope, the user journeys, and the domain. Identify the core capabilities the product must have.

### Step 2: Identify natural phase boundaries
Look for:
- Capabilities that can stand alone and be tested independently
- Natural dependency chains (X must exist before Y can work)
- Risk clusters (uncertain or complex areas)

### Step 3: Order phases by dependency and risk
1. **Deployment / infrastructure first** — prove the foundation works before building on it
2. **Highest-risk features next** — tackle uncertainty early while you have the most room to pivot
3. **Features that enable reuse before features that consume reuse** — build the shared components before the pages that use them
4. **Polish and cross-cutting concerns last** — accessibility, error handling, and UX polish apply across the whole app and are most efficient to do in one pass

### Step 4: Size each phase
A phase should be:
- **Large enough** to deliver a meaningful, demonstrable capability
- **Small enough** to complete with confidence before moving on
- **Independent enough** that its tests don't require the next phase to exist

If a phase would produce more than ~15 implementation tasks during discovery, consider splitting it. If fewer than 3, consider merging it with an adjacent phase.

### Step 5: Document the dependency graph
Which phases depend on which. This serves two purposes:
- Prevents starting a phase before its foundation is solid
- Identifies phases that can be worked in parallel

### Step 6: Write each phase entry
For each phase, write: Goal, Delivers, Acceptance Criteria, Test Strategy. Review each against the principles — no implementation details, no file names, no prescribed architecture.

### Step 7: Review by coherence
- Does each phase deliver something meaningful on its own?
- Is the dependency order correct — could you demo after each phase?
- Are acceptance criteria testable without knowing the implementation?
- Could you rename every file in the project without editing the plan?

## What NOT to Put in a Plan

- File names, directory structures, or module boundaries
- Specific function signatures or class hierarchies
- Line count targets or file count estimates
- Technology-specific implementation patterns (those go in a tech spec or ADR, not the plan)
- Anything that makes the plan brittle if you rename a file

## Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|---|---|---|
| **Prescriptive planning** | Plan specifies file names, component names, directory structures | Describe outcomes and behaviors, not code artifacts |
| **Monolith phases** | A single phase tries to deliver everything | Split by capability boundary — each phase should be demonstrable |
| **Thin phases** | Phase delivers something too small to be meaningful | Merge with adjacent phase |
| **Wrong ordering** | High-risk work deferred to late phases | Front-load uncertainty — tackle risky things early |
| **Implementation-flavored criteria** | "localStorage contains key X" instead of "progress survives browser restart" | Rewrite as observable behaviors, not implementation checks |
| **Missing dependency graph** | Phases reference each other's work but dependencies aren't documented | Explicitly state which phases each phase depends on |

## Red Flags — You're Drifting

- You've named a file, function, class, or component in a phase entry
- Your Delivers section reads like a task list instead of capabilities
- Acceptance criteria reference specific data structures or API shapes
- A phase can't be explained without referencing the implementation
- You're writing Test Strategy with test file names or specific test values
