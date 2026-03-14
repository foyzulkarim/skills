---
allowed-tools: Read, Write, Glob, Grep
description: Expand a high-level project plan into detailed phase documents with domain briefings, behaviors, and constraints
---

# Plan to Phases

## Overview

Phase details are **domain briefings** — they transfer the knowledge needed to make good implementation decisions during discovery. They answer "what do I need to understand about this domain?" not "what code should I write?"

**The plan says WHAT. The phase detail says WHY and WHEN it matters.**

Phase details sit between two failure modes:

- **Too thin:** paraphrases the plan, adds no value — the developer still has to figure out every domain rule, edge case, and behavioral nuance from scratch
- **Too thick:** prescribes file names, function signatures, test values, implementation steps — fights the code and makes the developer feel guilty deviating

**The sweet spot is a domain briefing.** The phase detail explains the problem space well enough that a developer can make good implementation decisions during discovery.

## When to Use

- User asks to write, expand, or detail a phase from a project plan
- Creating specifications for upcoming development work in a phased project
- Translating high-level plan entries into actionable development guidance
- User says "detail Phase X", "write the phase spec", "expand this phase"

**When NOT to use:**
- Writing the high-level plan itself (use `spec-to-plan`)
- Implementing/executing a phase (that's development)

## Prerequisites

1. A **high-level plan** with phase entries (Goal, Delivers, Acceptance Criteria, Test Strategy)
2. Access to any **project spec or requirements** that inform the domain
3. Any **preceding phase details** — to understand what's already been decided and what downstream impact looks like

## Core Principles

**1. Domain knowledge is the value-add.**
A phase detail should contain things a developer would otherwise have to discover by reading the spec carefully, asking questions, or making mistakes:
- Business rules and their reasoning
- What's optional vs. required and why
- How this phase's decisions affect downstream phases
- Edge cases that are easy to miss
- User interaction patterns

**2. Behaviors, not implementations.**
Describe what the system does, not how it's built. "The wizard auto-saves progress so users can close the browser and resume later" is a behavior. "Create a `useAutoSave` hook that calls `localStorage.setItem` on a debounced timer" is an implementation.

**3. Constraints are the exception.**
Some architectural decisions ARE made during planning — they're constraints that shape the phase, not details that emerge during development. These belong in the phase detail because violating them would cause problems in later phases.

## Phase Detail Anatomy

### Goal
Same as the plan. One or two sentences. Don't embellish.

### Depends on
Which phases must be complete. More useful than a dependency graph when reading a single phase in isolation.

### Delivers
4-6 bullets of high-level outcomes. A quick scope reminder, not a plan copy-paste. If you're writing more than 6, you're drifting into Behaviors.

### Behaviors

**This is where the phase detail earns its existence.** Organized by feature area with subheadings, this section describes the domain rules, interaction patterns, and edge cases that a developer needs to understand.

**Good behaviors:**
- Explain the *why* behind rules ("1-28 range to avoid month-length edge cases with 29/30/31")
- Note downstream impact ("Phase 2 uses this date as the anchor for pay schedule generation")
- Call out what's optional vs required and the implications of each
- Describe user-facing interaction patterns without naming components
- Identify domain edge *categories* without writing test cases

**Bad behaviors:**
- Restate what the plan already says in slightly different words
- Name functions, components, files, or modules
- Include specific test values or expected outputs
- Dictate UI layout, styling, or technology choices

**Structure:** Use subheadings per feature area (e.g., "Income Step", "Draft Persistence", "Wizard Navigation"). Write in natural prose or short paragraphs. Avoid deeply nested bullet lists — they drift toward implementation specs.

### Key Constraints
Non-negotiable architectural or design decisions **set during planning**, not discovered during development. These exist because violating them would cause problems in later phases or across the system.

Every constraint must answer: "What would go wrong if someone didn't know this?"

- Good: "Form sections must be standalone with props/callbacks — Phase 5 imports them directly. Page-specific dependencies would force duplication."
- Bad: "Use React context for state management." (Implementation choice — belongs in discovery.)

If a phase has no constraints beyond what's obvious from the plan, omit this section entirely.

### Acceptance Criteria
Brief, behavioral pass/fail checkboxes. Come mostly from the plan but can be slightly more specific now that Behaviors is written. Don't duplicate the Behaviors section.

### Test Strategy
Which test layers cover which behavior groups. One or two lines per layer.

## Writing Process

```
1. Read plan entry + spec
         |
         v
2. Ask: what would go wrong on first attempt?
         |
         v
3. Ask: what decisions are locked vs open?
         |
         v
4. Write Behaviors FIRST
         |
         v
5. Fill in Goal, Depends on, Delivers, AC, Test Strategy
         |
         v
6. Review by deletion
```

### Step 1: Read the plan entry and the spec
Understand what this phase delivers and why it exists in the dependency order. Read any preceding phase details to understand what's already been decided.

### Step 2: Ask "what would a developer get wrong on their first attempt?"
This is the key question. Every answer is a candidate for the Behaviors section:
- Domain rules not obvious from the UI description
- Edge cases that only surface when you think about real data
- Interactions between this phase and downstream phases
- Things that seem optional but aren't (or vice versa)

### Step 3: Ask "what decisions are locked vs open?"
Locked decisions become Key Constraints. Open decisions stay out of the document — they'll be made during discovery when the codebase is in front of you.

### Step 4: Write Behaviors first
This is the hard part and the core value. Goal, Depends on, Delivers, AC, and Test Strategy are mostly derived from the plan with minor refinement. Writing them first leads to accidentally repeating the plan.

### Step 5: Fill in the rest
Derive Goal, Depends on, Delivers, Acceptance Criteria, and Test Strategy from the plan entry. Refine slightly based on what you learned writing Behaviors.

### Step 6: Review by deletion
Read each sentence and ask: "If I deleted this, would a developer make a worse decision during discovery?" If no, delete it. Phase details should be as short as possible while still transferring the domain knowledge that matters.

## Quality Checklist

- [ ] Every Behaviors paragraph contains information the plan doesn't have
- [ ] No function names, component names, or file paths appear anywhere
- [ ] No specific test values or expected outputs (those emerge during TDD)
- [ ] Downstream impact is called out where this phase's decisions affect later phases
- [ ] Optional vs required is explicit for every feature area
- [ ] Key Constraints only contain decisions that would cause cross-phase problems if violated
- [ ] The document could survive renaming every file in the project without needing edits
- [ ] A developer (or agent) reading this would make better decisions than one reading only the plan

## Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|---|---|---|
| **Plan echo** | Behaviors restates Delivers in different words | Write Behaviors first; verify each paragraph adds info the plan doesn't have |
| **Disguised implementation spec** | "The confirmation dialog (ConfirmModal) traps focus" — parenthetical is the tell | Remove all code-level names; if you can't describe behavior without naming the implementation, it's not a behavior |
| **Exhaustive edge enumeration** | Listing every invalid input and error message | Identify *categories* of edges and explain why they matter, not enumerate every case |
| **Missing downstream context** | Describes what happens but never why it matters for later phases | Highest-value content — prevents locally-reasonable but globally-wrong decisions |
| **Constraint creep** | "Use Zod for validation" in Key Constraints | Test: would violating this cause a problem in a later phase? No = preference for discovery, not a constraint |

## Red Flags — You're Drifting

- You've named a function, component, class, or file
- You're writing what feels like a test case with specific inputs/outputs
- Your Behaviors section reads like a task list
- You can't explain *why* a rule exists
- Every paragraph starts with "The system should..."
- You're listing 10+ acceptance criteria (some belong in Behaviors as explanations)

## Batching Multiple Phases

When writing multiple phase details in one session:

1. Read the **full plan** and **dependency graph** first — understand the whole before detailing the parts
2. Write phases in **dependency order** when possible — earlier phases inform downstream context in later ones
3. Phases without dependencies between them can be written in **parallel**
4. After writing all phases, do a **cross-phase review** — check that downstream impact references are consistent and accurate
