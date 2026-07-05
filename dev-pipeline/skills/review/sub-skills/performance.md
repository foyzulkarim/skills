# Performance Check

_Read `_protocol.md` first._

**Scope:** service layer, query code, data processing, request handlers.
**Report section title:** `Performance`

## Severity Calibration

- 🔴 Critical: O(n²)/O(n³) on unbounded input, unbounded memory growth, complete absence of pagination
- 🟠 High: N+1 queries in hot path, blocking sync ops in request handler, large payload buffered in memory
- 🟡 Medium: Missed `Promise.all` opportunity, unnecessary deep clone, missing index on FK field
- 💭 Low: Minor optimization opportunity, cosmetic efficiency improvement
- ⚠️ Manual: Cannot verify from code — developer must check manually (e.g., production query plan)

## Focus Areas

### Algorithm & Complexity

- Time complexity of algorithms — flag O(n²), O(n³) patterns
- Space complexity and memory usage
- Unnecessary computations inside loops
- Large data structure operations (deep clones, large array copies)
- Batch processing opportunities (individual API calls that could be batched)

### N+1 Patterns (Non-Database)

- Repeated identical API calls or computation inside a loop when a single call/batch would work
- Note: **database/ORM N+1 is owned by the database-patterns check** — this check handles non-DB N+1 only (pure API call loops, repeated computation, etc.)

### Database / ORM (if applicable)

- Every foreign key field has a corresponding index (ORMs like Prisma don't add these automatically)
- Fields used in `where` clauses (userId, status, timestamps) have indexes
- List queries have `take`/pagination — no unbounded `findMany()`
- `select` used to limit returned fields where full model isn't needed
- No unnecessary `findFirst` inside loops when `findMany` with filter works
- Transactions used appropriately (not wrapping single reads)

### API & Middleware (if applicable)

- No synchronous blocking operations in request handlers (`fs.readFileSync`, CPU-heavy work)
- Large payloads streamed rather than buffered in memory
- Response compression enabled for large responses
- Middleware order is efficient (cheap checks first: auth before DB queries)

### Memory & Resources

- No unbounded in-memory collections (arrays/maps that grow without limit)
- Event listeners and intervals properly cleaned up
- Streams and file handles closed/destroyed on error paths
- No large objects retained in closures unnecessarily
- Resource cleanup and disposal in both success and error paths

### Caching & Network

- Repeated identical queries within a request are avoided (fetch once, reuse)
- Cache-friendly patterns where appropriate (HTTP cache headers, memoization)
- External API calls have timeouts configured
- Connection pools sized appropriately

### Async Patterns

- `Promise.all` used for independent concurrent operations (not sequential `await` in series)
- No `await` inside loops when `Promise.all` with `map` works
- Error handling doesn't swallow failures silently in concurrent paths
- Parallelizable work done in parallel, not sequentially

### Frontend (if applicable)

- Unnecessary re-renders (React), re-computations, or DOM thrashing
- Bundle size impact of new dependencies

## Check-Specific Rules

- False-positive addition: sequential patterns may be intentional (ordering guarantees) — check comments before flagging.
- For each finding, estimate impact: how would this behave with 10x, 100x, 1000x data?
- Findings table adds an **Impact** column (e.g., "N queries per request, N = list size") between Issue and Recommendation.

## Comment Guidance

- Quantify the impact: "With N records, this means N queries per request."
