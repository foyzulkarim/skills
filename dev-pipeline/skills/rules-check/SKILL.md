---
name: rules-check
description: Conventions checklist for Node/TypeScript/Express/Prisma projects. Loaded by the rules-checker agent during PR review.
---

Before flagging any convention violation, check the project's CLAUDE.md for project-specific overrides. Project conventions take precedence over these defaults.

## 1. File & Directory Structure (if applicable)

- Files follow established naming convention (kebab-case, PascalCase for classes)
- New files placed in expected directory (routes in routes/, services in services/, etc.)
- No business logic in route/controller files — delegates to service layer
- Test files co-located or in parallel `__tests__` directory matching source structure

## 2. Import Conventions (if applicable)

- Imports ordered: external packages → internal modules → relative imports
- No circular imports
- Path aliases used consistently (if configured)
- Named exports preferred (no default exports for utility/service modules)

## 3. API Conventions (if applicable)

- REST endpoints follow resource naming: plural nouns, no verbs in paths
- HTTP methods match intent (GET reads, POST creates, PATCH partial updates, DELETE deletes)
- Consistent response shape (e.g., `{ data, error, message }` or project convention)
- HTTP status codes correct (201 create, 204 delete, 400 validation, 404 not found)

## 4. Prisma Conventions (if applicable)

- Model names PascalCase singular
- Fields camelCase
- Relations explicitly named
- Soft delete pattern consistent (`deletedAt` field if project uses soft delete)
- Created/updated timestamps present on all models

## 5. Error Handling Conventions (if applicable)

- Consistent error response format across endpoints
- Centralized error handler middleware used (not per-route try/catch returning errors)
- Domain errors distinguished from infrastructure errors

## 6. Code Style (if applicable)

- Matches project's existing patterns (read existing code before flagging)
- No TODO/FIXME/HACK comments without a linked issue
- No console.log for production logging (use a logger)

Report each issue with file path, line(s), convention violated, and suggestion.
