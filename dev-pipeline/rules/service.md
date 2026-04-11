---
description: Guidelines for service layer files in Node.js projects
paths:
  - "**/services/**/*.{js,ts}"
  - "**/*.service.{js,ts}"
---

# Service Layer Rules

## Responsibilities

Service files contain business logic. They orchestrate between data access (repositories/models) and external integrations. They must NOT depend on HTTP concepts (req, res, status codes) or access the database directly.

## Structure

- Accept plain data objects as input, not Express request objects
- Return plain data or throw domain-specific errors (not HTTP errors)
- Keep methods focused — one business operation per method
- Inject dependencies (repositories, external clients) rather than importing them directly when testability matters

## Error Handling

- Throw typed/domain errors (e.g., `NotFoundError`, `ValidationError`) — let the API layer map these to HTTP
- Fail fast on invalid preconditions rather than proceeding with bad data
- Log at the appropriate level (info for expected flows, error for unexpected)

## Side Effects

- Isolate side effects (emails, queues, external APIs) so they can be mocked in tests
- Consider idempotency for operations that may be retried
