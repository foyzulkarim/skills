---
name: code-quality-review
description: Code quality review checklist for Node/TypeScript projects. Loaded by the code-quality-reviewer agent during PR review.
---

Code quality review checklist. Check project CLAUDE.md for project-specific overrides before flagging deviations. Skip any section not applicable to the files being reviewed.

## 1. Naming & Readability (if applicable)

- Variables/functions named for what they represent, not generic (`data`, `result`, `item`)
- Boolean variables/functions use `is`/`has`/`should`/`can` prefixes
- No single-letter variables outside loop indices
- Function names describe the action (verb-first)

## 2. Complexity & Structure (if applicable)

- Functions under ~40 lines; long functions flagged for potential extraction
- No deeply nested conditionals (>3 levels) — suggest early returns or extraction
- No god functions doing multiple unrelated things
- Clear separation: controllers handle HTTP, services handle business logic, repositories handle data

## 3. TypeScript Usage (if applicable)

- No `any` types — use proper types or `unknown` with narrowing
- Interfaces/types defined for function parameters and return values (not inline object shapes repeated)
- Enums or union types used instead of magic strings/numbers
- Nullability handled explicitly (no non-null assertions `!` without justification)

## 4. Error Handling (if applicable)

- Errors caught at appropriate boundaries, not swallowed silently
- Custom error types or error codes used for domain errors (not generic `throw new Error("...")`)
- Async errors properly propagated (no missing `await`, no unhandled promise rejections)
- Error messages include context useful for debugging

## 5. Duplication & Abstraction (if applicable)

- No copy-pasted logic blocks — shared code extracted when pattern repeats 3+ times
- Abstractions match the domain, not forced DRY (don't over-abstract for 2 uses)
- Utility functions live in appropriate shared modules

## 6. Testing Signals (if applicable)

- New business logic has corresponding tests (or the PR notes why not)
- Test names describe the expected behavior, not the implementation
- No test code in production files, no production code in test files

Report each issue with file path, line(s), quality concern, and one-line suggestion.
