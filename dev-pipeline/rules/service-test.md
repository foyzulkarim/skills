---
description: Guidelines for service layer test files in Node.js projects
paths:
  - "**/services/**/*.test.{js,ts}"
  - "**/services/**/*.spec.{js,ts}"
  - "**/*.service.test.{js,ts}"
  - "**/*.service.spec.{js,ts}"
---

# Service Test Rules

## What to Test

- Core business logic and domain rules
- Edge cases: empty inputs, boundary values, invalid state transitions
- Error paths: what happens when dependencies fail or return unexpected data
- Interaction between multiple dependencies (orchestration logic)

## How to Test

- Unit tests with mocked dependencies (repositories, external clients)
- Test the public interface of the service, not internal helpers
- Each test should cover one behavior — name it after the behavior, not the method
- Use arrange-act-assert structure

## What NOT to Test Here

- HTTP request/response handling (belongs in API tests)
- Actual database queries (belongs in database tests)
- That mocks were called in a specific order (test outcomes, not implementation)
