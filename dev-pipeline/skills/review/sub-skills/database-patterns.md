# Database Patterns Check

_Read `_protocol.md` first — including the 2-Level Tracing Protocol._

**Scope:** repository files, service files with DB queries, migration files, ORM schema files.
**Report section title:** `Database Patterns`

## Severity Calibration

| Severity | Criteria |
|----------|----------|
| 🔴 Critical | Query injection via string interpolation, destructive migration without rollback, transaction missing for multi-step write |
| 🟠 High | N+1 in hot path, unbounded query (no LIMIT) on large table, missing index causing full table scan |
| 🟡 Medium | SELECT * when few fields needed, transaction scope too large (holding connection too long) |
| 💭 Low | Minor query optimization opportunity |
| ⚠️ Manual | Cannot verify from code — developer must check query plan in production (EXPLAIN ANALYZE) |

**This check owns all database/ORM N+1 analysis.** The performance check handles non-database N+1 (API call loops, repeated computation). Do not duplicate — any N+1 involving a DB/ORM query is flagged here.

For each finding, estimate query impact: "With N records, this pattern executes M queries."

## Focus Areas

### N+1 Query Patterns

- Query inside a loop: fetching related records one-by-one instead of using `include`/join/`findMany` with a filter
- Loading a list, then iterating to fetch relations separately — classic N+1
- Lazy loading triggering implicit queries (ORM-specific)

### Transaction Issues

- Related writes (multiple table updates that must succeed or fail together) without a transaction
- Transaction scope too large — wrapping operations that don't need atomicity, holding DB connections unnecessarily long
- Missing rollback strategy — what happens if the second write in a multi-step operation fails?
- Nested transaction anti-patterns (ORM-specific behavior varies)

### Connection Pool

- Long-running operations holding a connection from the pool — other requests starved
- Missing connection release in error paths (for non-ORM query builders)
- Connection pool not sized appropriately for the expected concurrency

### Query Injection

- String interpolation in raw SQL (`$queryRaw`/`$executeRaw` without tagged template literals in Prisma, string concatenation in other ORMs)
- User input used directly in query conditions without parameterization

### Performance

- `SELECT *` / `findMany()` without `select` when only a few fields are needed
- Unbounded queries without `LIMIT`/`take` on tables that can grow
- Sorting/filtering done in application code when it could be done in the DB
- Missing indexes for query patterns (if schema is visible in the diff)
- Every foreign key field should have a corresponding index (ORMs don't add these automatically)
- Fields used in `where` clauses (userId, status, timestamps) should have indexes

## Tracing

Prioritize: functions called inside loops, functions performing writes, functions on hot paths. For N+1: trace whether the caller loops over results from this function; note whether a transaction wraps the caller.

## Check-Specific Rules

- For N+1: confirm the loop actually iterates over DB results — not a fixed-size in-memory list.
- For missing indexes: check if a similar index already exists (a composite index may cover the column).
- Findings table adds an **Impact** column (e.g., "N queries per request, N = user list size") between Issue and Recommendation.

## Comment Guidance

- Quantify the impact ("With a list of 100 users, this executes 101 queries per request") and show the ORM alternative (`include`, batch query).
