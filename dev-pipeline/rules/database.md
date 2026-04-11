---
description: Guidelines for database layer files (models, repositories, migrations) in Node.js projects
paths:
  - "**/models/**/*.{js,ts}"
  - "**/repositories/**/*.{js,ts}"
  - "**/migrations/**/*.{js,ts}"
  - "**/*.model.{js,ts}"
  - "**/*.repository.{js,ts}"
  - "**/*.schema.{js,ts}"
---

# Database Layer Rules

## Responsibilities

Database files handle data persistence: schema definitions, queries, and migrations. They must NOT contain business logic or HTTP concerns.

## Structure

- Repositories wrap raw queries and expose domain-oriented methods (e.g., `findActiveUsers()` not `query("SELECT * FROM users WHERE active = 1")`)
- Models/schemas define the data shape and constraints — keep validation at the schema level where the ORM supports it
- Migrations must be reversible (include both `up` and `down`)

## Query Safety

- Use parameterized queries or ORM methods — never interpolate user input into query strings
- Add database indexes for fields used in WHERE, JOIN, and ORDER BY clauses
- Be mindful of N+1 queries — use eager loading or batch fetching where appropriate

## Migrations

- Each migration does one thing (add a table, add a column, add an index)
- Never modify a migration that has already been applied in shared environments
- Add NOT NULL constraints with default values to avoid breaking existing rows
- Test migrations against a copy of production-like data when possible
