---
description: Guidelines for database layer test files in Node.js projects
paths:
  - "**/models/**/*.test.{js,ts}"
  - "**/models/**/*.spec.{js,ts}"
  - "**/repositories/**/*.test.{js,ts}"
  - "**/repositories/**/*.spec.{js,ts}"
  - "**/*.model.test.{js,ts}"
  - "**/*.model.spec.{js,ts}"
  - "**/*.repository.test.{js,ts}"
  - "**/*.repository.spec.{js,ts}"
---

# Database Test Rules

## What to Test

- CRUD operations return correct data shapes
- Query filters, sorting, and pagination work as expected
- Unique constraints, foreign keys, and validations are enforced
- Edge cases: empty results, large datasets, concurrent writes

## How to Test

- Use a real test database (SQLite in-memory, Docker container, or test-specific instance) — do not mock the database in this layer
- Reset database state before each test (truncate or transaction rollback)
- Test against the actual ORM/query builder, not raw SQL unless that is what production uses

## What NOT to Test Here

- Business logic (belongs in service tests)
- HTTP behavior (belongs in API tests)
- ORM framework internals (trust the library, test your queries)

## Migrations

- Test that migrations apply and roll back cleanly
- Verify schema state after migration (columns exist, constraints applied)
