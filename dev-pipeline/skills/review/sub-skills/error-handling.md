# Error Handling & Observability Check

_Read `_protocol.md` first._

**Scope:** service layer, middleware, async handlers, logging calls.
**Report section title:** `Error Handling & Observability`

## Severity Calibration

| Severity | Criteria |
|----------|----------|
| 🔴 Critical | Swallowed error causing silent data corruption or incorrect state |
| 🟠 High | Unhandled rejection in critical path, sensitive data leaked in error response |
| 🟡 Medium | Missing resource cleanup in error path, poor error message quality |
| 💭 Low | Minor logging improvement, additional context opportunity |
| ⚠️ Manual | Cannot verify from code — developer must test manually (e.g., observe log output at runtime) |

## Focus Areas

- **Try-catch appropriateness and specificity:** Is the right scope being caught? Are specific error types caught rather than swallowing everything?
- **Error message clarity:** Do error messages include enough context to diagnose the issue in production?
- **Logging quality:** Appropriate levels used (debug for trace, info for events, warn for recoverable issues, error for failures)
- **Sensitive data NOT in logs:** PII, tokens, passwords, credit card numbers must not appear in log output
- **Graceful degradation:** When a dependency fails, does the code degrade gracefully or crash?
- **Retry logic and circuit breakers:** Are transient failures handled with retries where appropriate?
- **Error propagation:** Are errors properly bubbled up, or silently dropped? Does the caller know something went wrong?
- **Stack trace preservation:** Are errors re-thrown correctly (not `throw err.message`)? Is the original error wrapped, not replaced?
- **User-facing vs internal error messages:** Does the API return generic messages to clients while logging full details internally?
- **Resource cleanup in error paths:** Are files, streams, connections, and locks released even when an error occurs?

## Check-Specific Rules

- False-positive addition: the project may have a centralized error-handling pattern (documented in CLAUDE.md) — a handler delegating to it is not a finding.
- Checklist protocol addition: per file, identify async functions, try-catch blocks, error boundaries, and logging calls as your todo items.
