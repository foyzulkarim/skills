# Async Patterns Check

_Read `_protocol.md` first — including the 2-Level Tracing Protocol._

**Scope:** JavaScript and TypeScript files with async code.
**Report section title:** `Async Patterns`

## Severity Calibration

- 🔴 Critical: Unhandled rejection in critical path that can crash the process, race condition causing data corruption
- 🟠 High: Async function called without `await` or `.catch`, resource leak in async error path
- 🟡 Medium: Sequential awaits that could be `Promise.all`, Promise constructor anti-pattern
- 💭 Low: Minor async cleanup improvement
- ⚠️ Manual: Cannot verify from code — developer must test async behavior at runtime

## Focus Areas

- **Unhandled rejections:** Async functions called without `await` or `.catch`. Trace callers to see if ANYTHING in the call chain handles the rejection — do not flag if a top-level handler catches it.
- **Sequential vs parallel:** Multiple independent `await` statements in sequence that could be `Promise.all`. `await` inside a loop when `Promise.all` with `.map()` would work.
- **Race conditions:** State updates after async operations that don't check if the state is still relevant (e.g., React state updates after unmount), missing AbortController for cancellable operations.
- **Resource cleanup:** `AbortController` not used for cancellable fetch, streams/connections not closed in error paths, setTimeout/setInterval not cleared when no longer needed.
- **Error propagation:** `try/catch` blocks that swallow errors (empty catch, `catch(() => {})`, `.catch` that doesn't re-throw when it should).
- **Promise constructor anti-patterns:** `new Promise((resolve) => someAsyncFn().then(resolve))` wrapping already-async code unnecessarily.

## Tracing

Prioritize: functions in request handlers, event listeners, top-level scripts. In tracing notes, record whether each caller awaits/catches the returned promise.

## Check-Specific Rules

- For unhandled rejections: trace ALL callers before flagging — a top-level `process.on('unhandledRejection')` or Express error middleware may catch it.
- For sequential awaits: confirm the operations are truly independent (no ordering constraint, no shared state dependency).

## Comment Guidance

- Show the caller chain for unhandled rejections: "This function is called here without await, and no .catch exists at the call site or above."
