---
description: Guidelines for API route and controller test files in Node.js projects
paths:
  - "**/routes/**/*.test.{js,ts}"
  - "**/routes/**/*.spec.{js,ts}"
  - "**/controllers/**/*.test.{js,ts}"
  - "**/controllers/**/*.spec.{js,ts}"
  - "**/*.controller.test.{js,ts}"
  - "**/*.controller.spec.{js,ts}"
  - "**/*.route.test.{js,ts}"
  - "**/*.route.spec.{js,ts}"
---

# API Test Rules

## What to Test

- Request validation: missing fields, wrong types, boundary values
- Authentication/authorization: unauthenticated, unauthorized, and authorized requests
- Response shape and status codes for success and error paths
- Route-level middleware execution order

## How to Test

- Use supertest (or equivalent) for HTTP-level integration tests
- Mock the service layer — API tests should not hit real business logic or databases
- Test each HTTP method and path separately
- Assert on status code, response body structure, and headers where relevant

## What NOT to Test Here

- Business logic correctness (belongs in service tests)
- Database behavior (belongs in database tests)
- Third-party API behavior (use contract tests or mocks)
