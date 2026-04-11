---
name: performance-review
description: Performance review checklist for Node/TypeScript/Express/Prisma projects. Loaded by the performance-reviewer agent during PR review.
---

Performance review checklist. Each section applies only if the changed files touch that domain. Check project CLAUDE.md for project-specific overrides before flagging deviations.

1. **Database / Prisma** (if applicable)
   - Every foreign key field has a corresponding `@@index` (Prisma doesn't add these automatically)
   - Fields used in `where` clauses (userId, status, timestamps) have indexes
   - No N+1 queries — related data fetched via `include`/`select`, not in loops
   - List queries have `take`/pagination — no unbounded `findMany()`
   - `select` used to limit returned fields where full model isn't needed
   - No unnecessary `findFirst` inside loops when `findMany` with filter works
   - Transactions used appropriately (not wrapping single reads)

2. **API & Middleware** (if applicable)
   - No synchronous blocking operations in request handlers (CPU-heavy work, `fs.readFileSync`, etc.)
   - Large payloads streamed rather than buffered in memory
   - Response compression enabled for large responses
   - Middleware order is efficient (cheap checks first: auth before DB queries)

3. **Memory & Resources** (if applicable)
   - No unbounded in-memory collections (arrays/maps that grow with data)
   - Event listeners and intervals properly cleaned up
   - Streams and file handles closed/destroyed on error paths
   - No large objects retained in closures unnecessarily

4. **Caching & Network** (if applicable)
   - Repeated identical queries within a request are avoided (fetch once, reuse)
   - Cache-friendly patterns where appropriate (HTTP cache headers, memoization)
   - External API calls have timeouts configured
   - Connection pools sized appropriately

5. **Async Patterns** (if applicable)
   - `Promise.all` used for independent concurrent operations (not sequential `await` in series)
   - No `await` inside loops when `Promise.all` with `map` works
   - Error handling doesn't swallow failures silently in concurrent paths

Report each issue with file path, line(s), performance impact description (latency/memory/CPU), and one-line fix suggestion.
