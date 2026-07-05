# Express Patterns Check

_Read `_protocol.md` first — including the 2-Level Tracing Protocol._

**Scope:** route files, middleware files, Express app setup files.
**Report section title:** `Express Patterns`

## Severity Calibration

- 🔴 Critical: Auth middleware applied after route handler, unhandled async rejection crashing the server, multiple `res.send` calls causing "headers already sent" crash
- 🟠 High: Request body used without validation, CORS wildcard in production, rate limiting missing on auth endpoint
- 🟡 Medium: Middleware ordering inefficiency, type coercion issue with `req.params.id`
- 💭 Low: Minor middleware improvement, optional hardening
- ⚠️ Manual: Cannot verify from code — developer must test the request flow manually

## Focus Areas

- **Middleware ordering:** Error handlers must be at the end (after all routes). Auth middleware must be applied BEFORE route handlers that need protection. Body parsing middleware must come before routes that read `req.body`. Cheap checks (auth) before expensive operations (DB queries).
- **Async route handlers without try/catch:** Express 4 does NOT automatically catch rejected promises in async handlers — unhandled rejections crash the server. Every `async (req, res) => {}` handler must have try/catch or use a wrapper like `express-async-errors`.
- **Multiple `res.send`/`res.json` calls:** A handler that can call `res.json()` in multiple code paths (e.g., inside an `if` and also after) will throw "Cannot set headers after they are sent." Trace all code paths.
- **Request body/params without validation:** `req.body.userId` used directly in DB queries or service calls without schema validation. `req.params.id` is always a string — type coercion issues when compared to numbers.
- **CORS misconfiguration:** `origin: '*'` in production, overly permissive `methods` or `allowedHeaders`.
- **Missing security headers:** `helmet` or equivalent not applied.
- **Session/cookie issues:** Missing `httpOnly`, `secure`, `sameSite` flags on cookies.
- **Rate limiting gaps:** Auth endpoints (`/login`, `/register`, `/forgot-password`) without rate limiting.

## Tracing

Prioritize: auth-sensitive routes, routes with async operations, routes handling file uploads. Callers here means app mount points (max 3) — note global middleware before the router and error middleware after; callees means service calls and every code path that calls `res.send`/`res.json`.

## Check-Specific Rules

- Check for wrapper utilities (e.g., an `asyncHandler` that catches rejections globally) and error middleware registered in files outside the diff before flagging.

## Comment Guidance

- Explain the Express 4 behavior (e.g., "Express 4 does not catch async rejections — an unhandled rejection here will crash the server process").
