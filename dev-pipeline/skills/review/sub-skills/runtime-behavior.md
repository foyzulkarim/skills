# Runtime Behavior Check

_Read `_protocol.md` first — including the 2-Level Tracing Protocol._

**Scope:** JavaScript and TypeScript files (.js, .ts, .tsx).
**Report section title:** `Runtime Behavior`

## Severity Calibration

- 🔴 Critical: Memory leak in hot path (e.g., unbounded listener accumulation on every request), event loop block causing request timeouts
- 🟠 High: Prototype pollution from user input, reference mutation of shared objects
- 🟡 Medium: Megamorphism potential, unnecessary large object retention in closure
- 💭 Low: Minor runtime optimization opportunity
- ⚠️ Manual: Cannot verify from code — developer must profile at runtime

## Focus Areas

- **Hidden class / megamorphism:** Objects with conditional properties added after creation, objects reused with different property shapes — V8 can't optimize these efficiently
- **Event loop blocking:** Synchronous operations on large data (sorting, deep cloning large arrays), CPU-heavy computations without chunking — these delay all other requests in Node.js
- **Memory leaks:** Event listeners added without corresponding removal, timers (setInterval) without cleanup, closures capturing large scopes unnecessarily, growing arrays/maps without bounds
- **Prototype pollution:** Object property access with user-controlled keys (`obj[userInput]`), deep merge utilities that don't check prototype chain
- **Reference vs value:** Mutating shared objects (arrays/objects passed by reference), array methods that mutate in place (`sort`, `splice`, `reverse`) when callers expect immutability
- **Detached DOM references:** React/browser code that holds references to DOM elements after they've been unmounted

## Tracing

Prioritize: functions in hot paths (called per-request, per-item in a loop), functions with closures, event listeners. Note call frequency in tracing notes — some patterns are innocuous at small scale; estimate actual impact given the frequency.

## Comment Guidance

- Explain the runtime mechanism (e.g., "Each request adds a listener but never removes it, so after N requests there are N listeners").
