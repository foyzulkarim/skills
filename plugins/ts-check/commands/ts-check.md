---
allowed-tools: Bash(git *), Bash(gh *), Bash(grep *), Bash(wc *), Bash(command *), Read, Write, Glob, Grep, Agent
argument-hint: "[mode] [target] (pr 123 | branch name | staged)"
description: Deep TypeScript/JavaScript analysis using parallel agents with 2-level code tracing - catches runtime patterns, type issues, and framework-specific anti-patterns
---

# TypeScript Deep Analysis Skill

Perform deep static analysis of TypeScript/JavaScript code using specialized parallel agents. Unlike general code review, this skill traces into the codebase to understand function context — examining callers (1 level up) and callees (1 level down) for each significant change.


### Usage Examples

```bash
# Deep analysis of a pull request
/ts-check pr 123

# Compare a branch against default branch
/ts-check branch feature/auth-redesign

# Deep analysis of staged changes
/ts-check staged

# No arguments defaults to staged
/ts-check
```

---

## Severity Scale

All agents MUST use this consistent severity scale:

| Severity | Criteria | Merge Impact |
|----------|----------|--------------|
| **Critical** | Will cause runtime crash, memory leak in production, data corruption, or security vulnerability | Blocks merge |
| **High** | Significant performance degradation, type safety hole, or pattern that fails under load | Strongly blocks merge |
| **Medium** | Suboptimal pattern, potential future issue, maintainability concern | Should fix, doesn't block |
| **Low** | Style improvement, stricter typing opportunity, minor optimization | Optional improvement |

---

## Step 1: Parse Arguments and Determine Mode

Parse the provided arguments:

| Mode | Usage | Description |
|------|-------|-------------|
| `pr` | `/ts-check pr 123` | Analyze a pull request by number |
| `branch` | `/ts-check branch feature-x` | Compare branch against main/master |
| `staged` | `/ts-check staged` | Analyze currently staged changes |

**Argument parsing:**
- First argument: mode (`pr`, `branch`, `staged`)
- Second argument: target (PR number, branch name, or omitted for staged)
- If no arguments provided, default to `staged` mode

Set variables:
- `REVIEW_MODE`: The detected mode
- `REVIEW_TARGET`: PR number or "staged"
- `REVIEW_IDENTIFIER`: Unique identifier for report filename

---

## Step 2: Preflight Checks

Validate the environment:

```bash
# Check if we're in a git repository
git rev-parse --is-inside-work-tree || { echo "ERROR: Not inside a git repository"; exit 1; }

# Check this is a JS/TS project
[ -f "package.json" ] || { echo "ERROR: No package.json found. This skill is for JavaScript/TypeScript projects."; exit 1; }

# For PR mode: check gh CLI
if [ "$REVIEW_MODE" = "pr" ]; then
  command -v gh >/dev/null 2>&1 || { echo "ERROR: GitHub CLI (gh) is not installed."; exit 1; }
  gh auth status 2>/dev/null || { echo "ERROR: GitHub CLI is not authenticated."; exit 1; }
fi

# For branch mode: verify branch exists
if [ "$REVIEW_MODE" = "branch" ]; then
  git rev-parse --verify "$REVIEW_TARGET" >/dev/null 2>&1 || { echo "ERROR: Branch '$REVIEW_TARGET' not found."; exit 1; }
fi
```

---

## Step 3: Gather Changes

### Detect Default Branch
```bash
DEFAULT_BRANCH=$(git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}')
if [ -z "$DEFAULT_BRANCH" ]; then
  DEFAULT_BRANCH=$(git branch -l main master --format '%(refname:short)' | head -1)
fi
if [ -z "$DEFAULT_BRANCH" ]; then
  DEFAULT_BRANCH=main
fi
```

**For PR mode:**
```bash
gh pr diff $REVIEW_TARGET
gh pr view $REVIEW_TARGET --json title,author,additions,deletions,changedFiles,url
```

**For branch mode:**
```bash
git diff $DEFAULT_BRANCH...$REVIEW_TARGET
git log $DEFAULT_BRANCH..$REVIEW_TARGET --oneline
git diff $DEFAULT_BRANCH...$REVIEW_TARGET --stat
```

**For staged mode:**
```bash
git diff --cached
git diff --cached --stat
```

### Filter to JS/TS Files Only

From the diff, extract only files matching:
- `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs`, `*.cjs`

Ignore changes to non-JS/TS files for this analysis.

### Validate Content

```bash
if [ -z "$DIFF_CONTENT" ]; then
  echo "WARNING: No TypeScript/JavaScript changes detected."
  exit 0
fi
```

---

## Step 4: Detect Stack

Auto-detect which frameworks are in use by reading `package.json`:

```bash
# Core (always true if we got here)
HAS_TYPESCRIPT=$(grep -q '"typescript"' package.json && echo "true" || echo "false")

# Frameworks (conditional agents)
HAS_REACT=$(grep -qE '"react"|"next"' package.json && echo "true" || echo "false")
HAS_NEXTJS=$(grep -q '"next"' package.json && echo "true" || echo "false")
HAS_EXPRESS=$(grep -q '"express"' package.json && echo "true" || echo "false")
HAS_DATABASE=$(grep -qE '"prisma"|"@prisma/client"|"knex"|"pg"|"postgres"' package.json && echo "true" || echo "false")

# Detect specific DB client for targeted advice
DB_CLIENT="none"
if grep -qE '"prisma"|"@prisma/client"' package.json; then
  DB_CLIENT="prisma"
elif grep -q '"knex"' package.json; then
  DB_CLIENT="knex"
elif grep -q '"pg"' package.json; then
  DB_CLIENT="pg"
fi
```

Report detected stack to user before proceeding:
```
Detected stack:
  TypeScript: ✓
  React/Next.js: ✓
  Express: ✗
  Database (Prisma): ✓

Launching 5 agents...
```

---

## Step 5: Launch Agents

Launch **core agents** (always) plus **conditional agents** (if detected) in parallel.

Each agent MUST follow the **2-level tracing protocol** described below.

---

## 2-Level Tracing Protocol

Every agent must trace context for significant functions. "Significant" means: functions that are modified in the diff and contain logic (not just type definitions or re-exports).

For each significant function:

```
1. READ THE FULL FILE
   - Understand the function in its file context
   - Note imports, nearby functions, module pattern

2. FIND CALLERS (1 level up)
   - Search the codebase: grep -r "functionName(" --include="*.ts" --include="*.tsx"
   - Read each caller file to understand HOW the function is invoked
   - Note: what arguments are passed, what's done with the return value, error handling

3. FIND CALLEES (1 level down)
   - Read the function body
   - Identify key function calls (not stdlib, focus on project code)
   - Read those implementations to understand dependencies

4. ANALYZE WITH FULL CONTEXT
   - Now you understand: who calls this, what this calls, and the function itself
   - Apply your domain-specific checks with this complete picture
```

This protocol is what distinguishes ts-check from surface-level analysis.

---

## Core Agent 1: TypeScript Strictness

**Always runs.**

```
You are performing DEEP TYPESCRIPT STRICTNESS analysis.

**Diff Content:** {DIFF_CONTENT}
**Project uses TypeScript:** {HAS_TYPESCRIPT}

## 2-Level Tracing Protocol

For each significant function in the diff:
1. Read the full file for context
2. Search for callers — understand how the function is invoked
3. Read callees — understand what the function depends on
4. Analyze with full context

## Focus Areas

**Type Safety Erosion:**
- `any` usage — is it lazy or necessary? Check if proper types exist
- Type assertions (`as X`) — especially `as unknown as X` chains
- Non-null assertions (exclamation mark operator) — trace to see if null is actually possible
- `@ts-ignore` / `@ts-expect-error` — what's being suppressed?

**Generic Issues:**
- Overly loose generics (`T` without constraints where constraints exist)
- Missing generics (functions that could be generic but hardcode types)
- Unnecessary complexity (generic where union would suffice)

**Return Type Safety:**
- Missing explicit return types on exported functions
- Implicit `any` returns
- Promise return types that lose type info (`Promise<any>`)

**Type Inference Gaps:**
- Variables that infer to `any` due to initialization
- Array methods that lose type info (`.reduce()` without type param)
- Object spreading that widens types unexpectedly

**Strict Mode Violations:**
- Patterns that would fail under `strictNullChecks`
- Implicit any that `noImplicitAny` would catch
- Index access without undefined handling (`strictPropertyInitialization`)

## Output Format

#### Findings Table
| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | {severity} | `{file}` | {line} | {description} | {fix} |

#### Tracing Notes
For complex findings, show your work:
- **Function:** `{name}` in `{file}`
- **Callers found:** `{list of files:functions}`
- **Why this matters:** {explanation based on traced context}

#### Review Comments
For EACH finding:

##### #1: {Brief title}
File: `{path}:{line}`

> {Comment in collaborative tone}
>
> Traced context: {what you learned from callers/callees}
>
> ```typescript
> // suggested fix
> ```
>
> What do you think?

**Tone:** Curious, educational. "I noticed...", "Would it make sense...", "Thoughts?"
```

---

## Core Agent 2: Runtime Behavior

**Always runs.**

```
You are performing DEEP RUNTIME BEHAVIOR analysis for Node.js/browser JavaScript.

**Diff Content:** {DIFF_CONTENT}

## 2-Level Tracing Protocol

For each significant function in the diff:
1. Read the full file for context
2. Search for callers — understand invocation patterns and frequency
3. Read callees — understand what operations are performed
4. Analyze with full context

## Focus Areas

**Hidden Class / Megamorphism:**
- Objects with conditionally assigned properties
- Adding properties after object creation
- Inconsistent property ordering in object literals across code paths
- Deleting properties from objects

**Event Loop Blocking:**
- Synchronous operations on large data (JSON.parse on large strings)
- CPU-heavy computations without chunking or worker threads
- Synchronous file system operations in request paths
- Large array operations (.map, .filter, .reduce on unbounded arrays)

**Memory Leaks:**
- Event listeners added without removal (trace to see if cleanup exists)
- Timers (setInterval, setTimeout) without cleanup
- Closures capturing large scopes unnecessarily
- Growing arrays/maps without bounds (trace to see if they're ever cleared)
- Detached DOM references (for React/browser code)

**Prototype Pollution:**
- Object property access with user-controlled keys
- Deep merge utilities without prototype checks
- `Object.assign` with untrusted sources

**Reference vs Value:**
- Mutating objects that may be shared (trace callers to check)
- Array methods that mutate in place vs return new (.sort(), .reverse())
- Object/array equality assumptions

## Output Format

#### Findings Table
| # | Severity | File | Line | Issue | Runtime Impact | Recommendation |
|---|----------|------|------|-------|----------------|----------------|
| 1 | {severity} | `{file}` | {line} | {description} | {impact at scale} | {fix} |

#### Tracing Notes
For complex findings:
- **Function:** `{name}` in `{file}`
- **Call frequency:** {based on callers — hot path or rare?}
- **Data scale:** {based on context — small objects or large collections?}

#### Review Comments
For EACH finding:

##### #1: {Brief title}
File: `{path}:{line}`

> {Comment in collaborative tone}
>
> This could become a problem because: {runtime impact explanation}
>
> ```typescript
> // before (problematic pattern)
> ```
>
> ```typescript
> // after (optimized)
> ```
>
> Thoughts?

**Tone:** Curious, educational. Quantify impact where possible.
```

---

## Core Agent 3: Async Patterns

**Always runs.**

```
You are performing DEEP ASYNC PATTERN analysis.

**Diff Content:** {DIFF_CONTENT}

## 2-Level Tracing Protocol

For each async function in the diff:
1. Read the full file for context
2. Search for callers — is the async result awaited? How are errors handled?
3. Read callees — what async operations does this depend on?
4. Analyze with full context

## Focus Areas

**Unhandled Rejections:**
- Async functions called without await or .catch
- Promise chains without terminal .catch
- Event handlers that are async but not try/caught
- Trace callers: does ANYTHING handle the rejection?

**Sequential vs Parallel:**
- Multiple independent awaits that could be Promise.all
- Loops with await inside (often could be Promise.all + map)
- But also: false parallelization (things that MUST be sequential)

**Race Conditions:**
- State updates after async that don't check if still relevant
- Multiple async operations that modify same state
- Missing abort/cancellation on superseded requests

**Resource Cleanup:**
- AbortController not used for cancellable operations
- Stream/connection not closed in error paths
- Timeout cleanup (clearTimeout) missing
- Trace: does the caller clean up on unmount/exit?

**Error Propagation:**
- try/catch that swallows errors silently
- .catch that doesn't re-throw when appropriate
- Async errors converted to return values (losing stack trace)

**Promise Constructor Anti-patterns:**
- `new Promise` wrapping already-async code
- Missing reject() in error paths
- Resolve/reject called after already settled

## Output Format

#### Findings Table
| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | {severity} | `{file}` | {line} | {description} | {fix} |

#### Tracing Notes
For complex findings:
- **Async function:** `{name}` in `{file}`
- **Caller error handling:** {what happens when this rejects?}
- **Downstream dependencies:** {what this awaits}

#### Review Comments
For EACH finding:

##### #1: {Brief title}
File: `{path}:{line}`

> {Comment in collaborative tone}
>
> I traced the callers and noticed: {what you found}
>
> ```typescript
> // suggested improvement
> ```
>
> What do you think?

**Tone:** Curious, educational. Show your tracing work.
```

---

## Conditional Agent 4: React / Next.js Patterns

**Runs only if `HAS_REACT` or `HAS_NEXTJS` is true.**

```
You are performing DEEP REACT/NEXT.JS analysis.

**Diff Content:** {DIFF_CONTENT}
**Next.js detected:** {HAS_NEXTJS}

## 2-Level Tracing Protocol

For each component/hook in the diff:
1. Read the full file for context
2. Search for usages — how is this component rendered? What props are passed?
3. Read hooks/utilities it calls — understand dependencies
4. Analyze with full context

## Focus Areas

**Hooks Rules:**
- Conditional hook calls (hooks inside if/switch/loops)
- Hooks called after early returns
- Custom hooks that violate rules internally

**Stale Closures:**
- useEffect/useCallback capturing variables that change
- Missing dependencies in dependency arrays
- Dependencies that should be refs instead

**Unstable References:**
- Object/array literals in render causing child re-renders
- Functions defined in render without useCallback
- useMemo missing for expensive computations
- Trace: does the child component memo() or use the reference?

**Hydration Mismatches (Next.js):**
- Date/time formatting differences server vs client
- Random values without seeding
- Browser-only APIs (window, localStorage) in initial render
- Conditional rendering based on client-only state

**Server/Client Boundaries (Next.js App Router):**
- 'use client' missing when using hooks/browser APIs
- 'use server' functions with improper data handling
- Passing non-serializable props across boundary
- Server components importing client-only code

**State Management:**
- Derived state that should be computed (useState for values derivable from props)
- State updates that don't batch properly
- Context overuse causing unnecessary re-renders

## Output Format

#### Findings Table
| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | {severity} | `{file}` | {line} | {description} | {fix} |

#### Tracing Notes
For complex findings:
- **Component:** `{name}` in `{file}`
- **Parent components:** {who renders this?}
- **Re-render triggers:** {what causes this to re-render?}

#### Review Comments
For EACH finding:

##### #1: {Brief title}
File: `{path}:{line}`

> {Comment in collaborative tone}
>
> I looked at how this component is used and noticed: {context}
>
> ```tsx
> // suggested fix
> ```
>
> Thoughts?

**Tone:** Curious, educational. React-specific but not condescending.
```

---

## Conditional Agent 5: Express Patterns

**Runs only if `HAS_EXPRESS` is true.**

```
You are performing DEEP EXPRESS.JS analysis.

**Diff Content:** {DIFF_CONTENT}

## 2-Level Tracing Protocol

For each route handler/middleware in the diff:
1. Read the full file for context — understand the router structure
2. Search for where this router is mounted — understand middleware chain
3. Read middleware and utilities it calls — understand request flow
4. Analyze with full context

## Focus Areas

**Middleware Ordering:**
- Error handlers not at the end
- Auth/validation middleware after route handlers
- Body parsing middleware missing or misordered
- Trace the full middleware chain for each route

**Async Route Handlers:**
- Async handlers without try/catch (Express 4 doesn't catch rejections)
- Missing wrapper like express-async-handler
- Error passed to next() vs thrown

**Response Issues:**
- Multiple res.send/res.json calls possible in same handler
- Response sent after async operation without return
- Headers set after response sent
- Trace all code paths to ensure single response

**Input Validation:**
- Request body/params used without validation
- Type coercion issues (req.params.id is always string)
- Missing sanitization before database/output

**Security:**
- CORS misconfiguration
- Missing helmet or security headers
- Session/cookie configuration issues
- Rate limiting gaps on sensitive routes

## Output Format

#### Findings Table
| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | {severity} | `{file}` | {line} | {description} | {fix} |

#### Tracing Notes
For complex findings:
- **Route:** `{method} {path}` in `{file}`
- **Middleware chain:** {what runs before this handler?}
- **Request flow:** {how does the request reach this point?}

#### Review Comments
For EACH finding:

##### #1: {Brief title}
File: `{path}:{line}`

> {Comment in collaborative tone}
>
> Tracing the middleware chain, I noticed: {context}
>
> ```typescript
> // suggested fix
> ```
>
> What do you think?

**Tone:** Curious, educational. Server-side focused.
```

---

## Conditional Agent 6: Database Patterns

**Runs only if `HAS_DATABASE` is true.**

```
You are performing DEEP DATABASE PATTERN analysis.

**Diff Content:** {DIFF_CONTENT}
**Database client:** {DB_CLIENT}

## 2-Level Tracing Protocol

For each database operation in the diff:
1. Read the full file for context
2. Search for callers — how often is this called? In loops? In request handlers?
3. Read related operations — are there related queries that should be batched?
4. Analyze with full context

## Focus Areas

**N+1 Query Patterns:**
- Query inside a loop (trace: is the loop bounded? how large?)
- Fetching relations separately instead of with include/join
- Multiple queries that could be one

**Transaction Issues:**
- Related writes without transaction (data inconsistency risk)
- Transaction scope too large (holding locks)
- Missing rollback handling
- Trace: do these operations need atomicity?

**Connection Pool:**
- Long-running operations holding connections
- Missing connection release in error paths
- Too many parallel queries exhausting pool
- Trace: what's the concurrent request load?

**Query Injection:**
- String interpolation in raw queries
- User input in query without parameterization
- Dynamic column/table names without whitelist

**Performance:**
- Missing indexes for query patterns (if schema visible)
- SELECT * when only few fields needed
- Unbounded queries without limit
- Sorting/filtering in application vs database

## Output Format

#### Findings Table
| # | Severity | File | Line | Issue | Query Impact | Recommendation |
|---|----------|------|------|-------|--------------|----------------|
| 1 | {severity} | `{file}` | {line} | {description} | {e.g., "N+1: 100 users = 101 queries"} | {fix} |

#### Tracing Notes
For complex findings:
- **Query location:** `{function}` in `{file}`
- **Called from:** {request handler? background job? how often?}
- **Data scale:** {how many records typically?}

#### Review Comments
For EACH finding:

##### #1: {Brief title}
File: `{path}:{line}`

> {Comment in collaborative tone}
>
> I traced the callers and this query runs: {frequency/context}
>
> With {N} records, this means: {impact calculation}
>
> ```typescript
> // optimized version
> ```
>
> Thoughts?

**Tone:** Curious, educational. Quantify query impact.
```

---

## Step 6: Compile Results

After all agents complete:

### 6.1 Collect Findings
Gather all findings from all agents.

### 6.2 Deduplicate
Same function flagged by multiple agents (e.g., async issue + database issue on same query):
- Keep highest severity
- Merge insights
- Note: "Flagged by: Async Patterns, Database Patterns"

### 6.3 Determine Verdict
- **APPROVE**: No Critical or High issues
- **APPROVE WITH COMMENTS**: No Critical, 1-2 High
- **REQUEST CHANGES**: Any Critical OR 3+ High OR systemic patterns

### 6.4 Preserve Tracing Notes
Keep the "Tracing Notes" from agents — they show the work and justify the findings.

---

## Step 7: Generate Report

Create report at repository root using the Report Template below:

Sanitize identifiers before constructing filenames (replace `/` with `-`, strip whitespace, limit length):

```bash
SAFE_ID=$(echo "$REVIEW_IDENTIFIER" | tr '/' '-' | tr -d '[:space:]' | cut -c1-80)
```

- **For PR mode:** `TS-DEEP-PR-{number}.md`
- **For branch mode:** `TS-DEEP-BRANCH-{safe-branch-name}.md`
- **For staged mode:** `TS-DEEP-STAGED-{YYYY-MM-DD-HHMM}.md`

---

## Step 8: Output

After generating the report:

1. Display summary with counts by severity per category
2. Highlight any Critical/High findings explicitly
3. Provide report path
4. Note detected stack and which agents ran

```
Analysis complete.

Stack detected: TypeScript, Next.js (App Router), Prisma
Agents run: 5 (3 core + React/Next.js + Database)

Findings:
  Critical: 0
  High: 2
  Medium: 5
  Low: 3

High severity issues:
  - Database #1: N+1 query in getUsersWithPosts (line 45)
  - Async #2: Unhandled rejection in fetchData (line 112)

Full report: TS-DEEP-PR-123.md
```

---

## Notes

- This skill is for TypeScript/JavaScript projects only
- Agents trace 2 levels deep — this takes longer than surface analysis
- Expect 2-4 minutes for a typical PR depending on complexity
- The tracing protocol is what makes findings accurate — don't skip it
- Conditional agents only run when their framework is detected
- All findings include context from tracing to justify the concern

---

## Report Template

Use this structure when generating the final report:

```markdown
# TypeScript Deep Analysis Report

## Metadata

| Field | Value |
|-------|-------|
| **Analysis Type** | {PR / Branch / Staged} |
| **Target** | {PR #123 / branch-name / staged changes} |
| **PR URL** | {URL if PR mode, otherwise N/A} |
| **Base Branch** | {main / master / other} |
| **Analyzer** | /ts-check |
| **Date** | {YYYY-MM-DD HH:MM} |
| **Files Analyzed** | {count of JS/TS files} |
| **Lines Changed** | +{additions} / -{deletions} |

## Stack Detected

| Technology | Detected | Agent Activated |
|------------|----------|-----------------|
| TypeScript | {✓/✗} | Core agents always run |
| React | {✓/✗} | {✓/✗} |
| Next.js | {✓/✗} | {✓/✗} |
| Express | {✓/✗} | {✓/✗} |
| Database | {✓/✗} ({client}) | {✓/✗} |

## Executive Summary

### Verdict: {APPROVE / APPROVE WITH COMMENTS / REQUEST CHANGES}

{Summary}

### Quick Stats

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| TypeScript Strictness | 0 | 0 | 0 | 0 |
| Runtime Behavior | 0 | 0 | 0 | 0 |
| Async Patterns | 0 | 0 | 0 | 0 |
| React/Next.js | 0 | 0 | 0 | 0 |
| Express | 0 | 0 | 0 | 0 |
| Database | 0 | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** | **0** |

[Sections for each agent category with findings, tracing notes, and review comments]

## Prioritized Action Items
### Must Fix Before Merge (Critical / High)
### Should Address (Medium)
### Nice to Have (Low)

## Files Analyzed
| File | Lines Changed | Significant Functions |

---
*Generated by /ts-check — {YYYY-MM-DD HH:MM}*
```
