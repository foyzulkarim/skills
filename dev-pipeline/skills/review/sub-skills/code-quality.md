# Code Quality & Conventions Check

_Read `_protocol.md` first._

**Scope:** all changed production and test files.
**Report section title:** `Code Quality & Conventions`

## Severity Calibration

| Severity | Criteria |
|----------|----------|
| 🔴 Critical | Broken core functionality, layer boundary violation causing data integrity risk |
| 🟠 High | Significant structural problem, circular dependency, god function owning multiple concerns |
| 🟡 Medium | Code smell, DRY violation at 3+ repetitions, deep nesting, naming inconsistency |
| 💭 Low | Style inconsistency, minor refactoring opportunity, single-location magic number |
| ⚠️ Manual | Cannot verify from code — developer must check manually |

## Focus Areas

### Naming & Readability

- Variables/functions named for what they represent, not generic (`data`, `result`, `item`)
- Boolean variables/functions use `is`/`has`/`should`/`can` prefixes
- No single-letter variables outside loop indices
- Function names describe the action (verb-first)
- Clear, consistent, descriptive names throughout

### Complexity & Structure

- Functions under ~40 lines; long functions flagged for potential extraction
- No deeply nested conditionals (> 3 levels) — suggest early returns or extraction
- No god functions doing multiple unrelated things
- Single Responsibility Principle — each function/class has one reason to change
- Dead code and unused imports removed

### TypeScript Usage (if applicable)

- No `any` types — use proper types or `unknown` with narrowing
- Interfaces/types defined for function parameters and return values (not inline object shapes repeated)
- Enums or union types used instead of magic strings/numbers
- Nullability handled explicitly (no non-null assertions `!` without justification)

### Error Handling Patterns

- Errors caught at appropriate boundaries, not swallowed silently
- Custom error types or error codes used for domain errors (not generic `throw new Error("...")`)
- Async errors properly propagated (no missing `await`, no unhandled promise rejections)
- Error messages include context useful for debugging

### Duplication & Abstraction

- No copy-pasted logic blocks — shared code extracted when pattern repeats 3+ times
- Abstractions match the domain, not forced DRY (don't over-abstract for 2 uses)
- Utility functions live in appropriate shared modules

### Testing Signals

- New business logic has corresponding tests (or the PR notes why not)
- Test names describe the expected behavior, not the implementation
- No test code in production files, no production code in test files

### File & Directory Structure

- Files follow established naming convention (kebab-case for modules, PascalCase for classes)
- New files placed in expected directory (routes in routes/, services in services/, etc.)
- No business logic in route/controller files — delegates to service layer
- Test files co-located or in parallel `__tests__` directory matching source structure

### Import Conventions

- Imports ordered: external packages → internal modules → relative imports
- No circular imports introduced
- Path aliases used consistently (if configured in tsconfig)
- Named exports preferred (no default exports for utility/service modules)

### API Conventions (if applicable)

- REST endpoints follow resource naming: plural nouns, no verbs in paths
- HTTP methods match intent (GET reads, POST creates, PATCH partial updates, DELETE deletes)
- Consistent response shape (e.g., `{ data, error, message }` or project convention)
- HTTP status codes correct (201 create, 204 delete, 400 validation, 404 not found)

### ORM / Schema Conventions (if applicable)

- Model names PascalCase singular (Prisma convention)
- Fields camelCase; relations explicitly named
- Soft delete pattern consistent (`deletedAt` field if project uses soft delete)
- Created/updated timestamps present on all models

### Code Style

- Matches project's existing patterns (read existing code before flagging)
- No TODO/FIXME/HACK comments without a linked issue
- No `console.log` for production logging (use a logger)

### Layer Boundaries

- Controllers handle HTTP concerns only; services handle business logic; repositories handle data
- No circular dependencies introduced
- Import style matches project convention (relative vs absolute, barrel files)
- Code matches pattern references cited in task spec Implementation Notes (pipeline mode)
