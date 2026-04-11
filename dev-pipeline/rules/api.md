---
description: Guidelines for API route and controller files in Node.js projects
paths:
  - "**/routes/**/*.{js,ts}"
  - "**/controllers/**/*.{js,ts}"
  - "**/*.controller.{js,ts}"
  - "**/*.route.{js,ts}"
---

# API Layer Rules

## Responsibilities

API files handle HTTP concerns only: request parsing, input validation, response formatting, and status codes. They must NOT contain business logic or direct database access.

## Structure

- Validate incoming request data at the boundary (params, query, body)
- Delegate all business logic to the service layer
- Return consistent response shapes (`{ data, error, message }`)
- Use appropriate HTTP status codes (don't default everything to 200/500)

## Security

- Never trust user input — validate and sanitize at this layer
- Apply authentication/authorization middleware before handlers
- Avoid leaking internal error details in responses (use generic messages in production)
- Set appropriate rate limiting on public endpoints

## Error Handling

- Catch service-layer errors and map them to HTTP status codes
- Use a centralized error-handling middleware rather than try/catch in every handler
- Log the full error server-side; return a safe summary to the client
