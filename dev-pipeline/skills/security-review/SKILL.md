---
name: security-review
description: Security review checklist for Node/TypeScript/Express/Prisma projects. Loaded by the security-reviewer agent during PR review.
---

Check project CLAUDE.md for project-specific overrides before flagging deviations.

## Authentication & Authorization (if applicable)

- Every Express route has `authenticate` middleware applied individually (not just router-level)
- Authorization checks exist where needed (role-based, ownership)
- No auth bypass paths (e.g., middleware ordering issues)

## Input Validation & Injection (if applicable)

- Request body/query/params validated before reaching service layer (no raw `req.body` passthrough)
- Prisma queries use parameterized inputs (no raw SQL string concatenation via `$queryRaw` or `$executeRaw` without tagged template)
- No `eval()`, `Function()`, or dynamic code execution with user input
- File upload paths sanitized, no path traversal

## Data Exposure (if applicable)

- Error handlers don't leak stack traces, DB errors, or internal details to clients
- Sensitive fields (passwords, tokens, secrets) excluded from API responses
- No secrets/credentials hardcoded in source (API keys, DB URLs, JWT secrets)
- Logging doesn't include sensitive data (passwords, tokens, PII)

## HTTP Security (if applicable)

- CORS configured restrictively (not `origin: *` in production)
- Security headers present (helmet or equivalent)
- Rate limiting on auth endpoints
- CSRF protection on state-changing endpoints if using cookies

## Dependency & Config (if applicable)

- No known-vulnerable patterns (e.g., `jsonwebtoken` without algorithm restriction)
- Environment variables used for secrets, not hardcoded values
- Debug/dev endpoints not exposed in production config

Report each issue with file path, line(s), risk description, and one-line fix suggestion.
