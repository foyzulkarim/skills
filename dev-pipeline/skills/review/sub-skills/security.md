# Security Check

_Read `_protocol.md` first._

**Scope:** route handlers, middleware, auth logic, validation code, config files, dependency manifests.
**Report section title:** `Security`

## Severity Calibration

- 🔴 Critical: SQL injection, XSS, exposed credentials, auth bypass, data loss risk
- 🟠 High: Missing auth check, CORS misconfiguration, rate limiting gap on sensitive route
- 🟡 Medium: Sensitive data in logs, missing security header, overly permissive input
- 💭 Low: Minor hardening opportunity, defense-in-depth suggestion
- ⚠️ Manual: Cannot verify from code — developer must test manually (e.g., pen test a flow)

For Critical and High findings, briefly explain the attack vector.

## Focus Areas

### Authentication & Authorization

- Every Express route (or equivalent) has authentication middleware applied
- Authorization checks exist where needed (role-based, ownership checks)
- No auth bypass paths (e.g., middleware ordering issues, missing middleware on specific routes)
- JWT/token handling: expiry enforced, rotation strategy present, secure storage guidance

### Input Validation & Injection

- Request body/query/params validated before reaching the service layer (no raw `req.body` passthrough)
- SQL/ORM queries use parameterized inputs — no raw SQL string concatenation with user input
- Prisma: no unsafe `$queryRaw`/`$executeRaw` without tagged template literals
- No `eval()`, `Function()`, or dynamic code execution with user-controlled input
- File upload paths sanitized, no path traversal (`../` in filenames)
- XSS prevention: user-supplied content not rendered as HTML without sanitization
- CSRF protection on state-changing endpoints when using cookies

### Data Exposure

- Error handlers don't leak stack traces, DB error details, or internal paths to clients
- Sensitive fields (passwords, tokens, secrets) excluded from API responses
- No secrets or credentials hardcoded in source (API keys, DB URLs, JWT secrets, private keys)
- Logging doesn't include sensitive data (passwords, tokens, PII, full credit card numbers)

### HTTP Security

- CORS configured restrictively (not `origin: *` in production environments)
- Security headers present (helmet or equivalent: `X-Content-Type-Options`, `X-Frame-Options`, CSP, etc.)
- Rate limiting on authentication endpoints and sensitive routes
- Secure cookie flags set (`httpOnly`, `secure`, `sameSite`)

### Dependency & Config

- No known-vulnerable patterns (e.g., `jsonwebtoken` without algorithm restriction)
- Environment variables used for secrets, not hardcoded values
- Debug/dev endpoints (health with secrets, introspection) not exposed in production config
- File upload security: type validation (not just extension), size limits enforced

### OWASP Top 10 Compliance

Check for patterns matching: Broken Access Control, Cryptographic Failures, Injection, Insecure Design, Security Misconfiguration, Vulnerable Components, Authentication Failures, Software Integrity Failures, Security Logging Failures, SSRF.

## Check-Specific Rules

- False-positive addition: some patterns are intentional (e.g., a public endpoint that requires no auth) — check conventions before flagging.
- Findings table adds a **Risk** column (the attack vector) between Issue and Recommendation.
