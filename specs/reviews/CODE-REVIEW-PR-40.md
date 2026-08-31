# Review Report

## Metadata

| Field | Value |
|-------|-------|
| **Review Mode** | PR #40 |
| **Target** | https://github.com/foyzulkarim/skills/pull/40 |
| **Date** | 2026-08-31 11:39 |
| **Tech Stack** | Node.js (`.mjs` driver), Playwright (runtime dependency in target projects), Markdown/YAML skill docs, Bash helper scripts. No repo-level `package.json`. |
| **Checks Run** | code-quality, security, error-handling, runtime-behavior, async-patterns, documentation, config-dependencies |
| **Checks Skipped** | task-completion (general PR mode — no ARCH/REQ pipeline verification requested), requirement-coverage (general PR mode), test-coverage (repo has no test runner; changes are docs/scripts), performance (simple command loop, no hot algorithms), typescript-strictness (no `.ts` files changed), react-patterns (no React files), express-patterns (no Express files), database-patterns (no DB operations), migration (internal-only feature additions), accessibility (backend-only / no UI code) |
| **Files Changed** | 18 |
| **Lines Changed** | +1738 / -469 |

## Review Process

- [x] Preflight checks passed
- [x] Diff gathered (18 files, 2431 diff lines)
- [x] Tech stack detected: Node.js, Playwright, Markdown/YAML, Bash
- [x] Context read (CLAUDE.md; PR description in general PR mode)
- [x] Triage proposed and developer confirmed (auto-permission mode)
- [x] 7 checks dispatched: code-quality, security, error-handling, runtime-behavior, async-patterns, documentation, config-dependencies
- [x] Results collected and deduplicated
- [x] Report compiled
- [x] Verdict determined
- [x] Report saved to specs/reviews/

## Verdict: ❌ REQUEST CHANGES

The PR adds valuable QA-gate capabilities (environments, lanes, bug mode, `[judge-visual]`, and a bundled Playwright driver), and the docs/manifests are mostly consistent. However, the new `qa-browser.mjs` driver has **Critical** stability issues and **High** security/concurrency issues that must be fixed before merge: unhandled rejections from the `Promise.race` timeout guards can crash the daemon, path traversal allows arbitrary file write/read, and the global `active` context pointer is vulnerable to races under concurrent lanes. Medium items are mostly code-quality, observability, and doc-sync cleanups.

### Finding Counts

| Category | 🔴 | 🟠 | 🟡 | 💭 | ⚠️ |
|----------|-----|-----|-----|-----|-----|
| code-quality | 0 | 1 | 10 | 0 | 0 |
| security | 0 | 1 | 3 | 1 | 0 |
| error-handling | 0 | 2 | 5 | 2 | 0 |
| runtime-behavior | 1 | 1 | 1 | 0 | 0 |
| async-patterns | 1 | 2 | 0 | 0 | 0 |
| documentation | 0 | 0 | 2 | 0 | 0 |
| config-dependencies | 0 | 0 | 0 | 0 | 0 |
| **Total** | **2** | **7** | **22** | **3** | **0** |

*Note: totals are raw per-check counts before deduplication. Several findings overlap across checks (e.g., the `withTimeout` race is flagged by runtime-behavior, async-patterns, and error-handling); see Prioritized Action Items for the consolidated view.*

## Code Quality & Conventions

**Result:** 11 findings (1 High, 10 Medium).

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 251, 259, 339 | Handler parameter is named `a` instead of describing the argument list | Rename to `args` (or `cmdArgs`) in `goto`, `wait-for`, and `eval` |
| 2 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 318 | Single-letter variable `m` holds the HTTP method in `expect-request` | Rename to `method` |
| 3 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 122 | Single-letter variable `c` holds the response chunk | Rename to `chunk` |
| 4 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 333, 362 | Single-letter variable `p` holds the screenshot/state file path | Rename to `filePath` or `targetPath` |
| 5 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 200, 218, 224, 228, 235, etc. | Domain errors use generic `throw new Error(...)` with no stable code | Add a small error-code prefix (e.g., `E_TARGET_PREFIX`, `E_ENV_MISSING`, `E_STATE_MISSING`) or a `QaBrowserError` class so callers/auditors can distinguish failure modes |
| 6 | 🟠 High | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 181–185 | Signal handler is `async` and calls `process.exit(0)` immediately after `browser.close()`; the event loop may terminate before the browser process is reaped | Make the handler synchronous and call `browser.close()` without awaiting, or use a completion flag and let the process exit naturally after the close promise settles |
| 7 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 164 | Unknown `--browser` value silently falls back to `chromium` | Reject invalid values with a usage error and exit code 2 |
| 8 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 254, 264 | `goto` and `wait-for` mutate the incoming `args` array via `a.splice(...)` | Copy the array before parsing (e.g., `const a = [...args]`) or parse flags without mutating the input |
| 9 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 129 | `req.on("error", ...)` swallows the original error object | Include `err.message` in the JSON error so a connection failure is diagnosable |
| 10 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 460–486 | Request handler has 4+ nested `if/else` levels for state/command dispatch | Flatten with early returns or extract `resolveContext()` and `dispatchCommand()` helpers |
| 11 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 419–526 | The `createServer` callback spans ~107 lines and mixes validation, dispatch, screenshot-on-failure, and response serialization | Split into smaller named functions (resolve context, run handler, attach screenshot, send JSON) |

### Coverage Checklist

- [x] `.claude-plugin/marketplace.json` — Naming ✅, Structure ✅, No logic → no issues
- [x] `.gitignore` — Naming ✅, Structure ✅ → no issues
- [x] `CLAUDE.md` — Naming ✅, Readability ✅, Docs sync ✅ → no issues
- [x] `README.md` — Naming ✅, Readability ✅ → no issues
- [x] `dev-pipeline/.claude-plugin/plugin.json` — Naming ✅, Structure ✅ → no issues
- [x] `dev-pipeline/README.md` — Naming ✅, Readability ✅ → no issues
- [x] `dev-pipeline/skills/execute-qa/SKILL.md` — Naming ✅, Readability ✅, Structure ✅ → no issues
- [x] `dev-pipeline/skills/execute-qa/qa-browser.mjs` — Naming ⚠️ → Findings #1–4, Complexity ⚠️ → Findings #10–11, Error handling ⚠️ → Findings #5–#9, Duplication ✅, Imports ✅, Style ✅
- [x] `dev-pipeline/skills/plan-qa/SKILL.md` — Naming ✅, Readability ✅, Structure ✅ → no issues
- [x] `dev-pipeline/skills/plan-qa/artifact-template.md` — Naming ✅, Readability ✅, Structure ✅ → no issues
- [x] `dev-pipeline/skills/review/sub-skills/requirement-coverage.md` — Naming ✅, Readability ✅, Structure ✅ → no issues
- [x] `specs/architecture/ARCH-39-qa-environments-driver-lanes.md` — Naming ✅, Readability ✅ → no issues
- [x] `specs/context/37.md` — Naming ✅, Readability ✅ → no issues
- [x] `specs/context/39.md` — Naming ✅, Readability ✅ → no issues
- [x] `specs/requirements/REQ-39-qa-environments-driver-lanes.md` — Naming ✅, Readability ✅ → no issues
- [x] `specs/tasks/TASKS-39-qa-environments-driver-lanes.md` — Naming ✅, Readability ✅ → no issues

### Review Comments

**Finding #1 — `a` parameter name**  
I noticed the command handlers in `qa-browser.mjs` use `a` for the args array in a few places (e.g., `goto`, `wait-for`, `eval`). Since the rest of the handlers use destructured/descriptive names, would it make sense to rename `a` to `args` everywhere for consistency?

**Finding #2 — `m` in `expect-request`**  
In `expect-request` the method is stored as `m` before upper-casing. A reader has to scan down to see what `m` is; renaming it to `method` would make the filter predicate self-documenting. Thoughts?

**Finding #6 — async signal handler**  
The SIGINT/SIGTERM handler awaits `browser.close()` then calls `process.exit(0)`. I’m concerned `process.exit` may cut off the close promise before the browser process is reaped, which would leave the orphaned process the comment warns against. Would it be safer to call `browser.close()` synchronously (fire-and-forget) or to let the process drain naturally after the close completes?

**Finding #7 — invalid `--browser` fallback**  
The engine lookup falls back to `chromium` for any unknown `--browser` value. A typo like `--browser chromum` would silently launch Chromium instead of telling the user. Would you prefer to reject unknown engines with usage output and exit 2?

**Finding #8 — mutating args arrays**  
`goto` and `wait-for` splice the `--until` flag out of the incoming args array. Since that array comes from the request body, mutation is safe but still a bit surprising. Copying the array before parsing would make the function behavior easier to reason about. What do you think?

**Finding #10 — nested dispatch in server handler**  
The server callback has a four-level nested chain for `browserDead` → `stopping` → `unknown command` → context resolution. Extracting context resolution and command dispatch into helpers would flatten this and make the control flow easier to follow. Worth a small refactor?

## Security

**Files reviewed:** `.gitignore`, `dev-pipeline/skills/execute-qa/SKILL.md`, `dev-pipeline/skills/execute-qa/qa-browser.mjs`

### Findings

| # | Severity | File | Line | Issue | Risk | Recommendation |
|---|----------|------|------|-------|------|----------------|
| 1 | 🟠 High | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 196–201, 333–337, 358–364 | Path traversal in `screenshot`, `save-state`, and `new-context` state loading | A compromised QA plan can write screenshot/state files outside the project tree (arbitrary file write) and read arbitrary JSON files as saved auth state, exposing or overwriting user data | Sanitize `name`/`stateName`/`p` by rejecting `..`, path separators, and absolute paths; constrain writes to `.qa-shots/` and `.qa-state/` under the project root |
| 2 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 339–341 | `eval` command executes arbitrary JavaScript in the page context | A malicious plan can run XSS-style payloads to steal session data, exfiltrate page content, or bypass CSRF protections | Add an opt-in flag (e.g. `--allow-eval`) or plan-level guard, log every invocation, and warn that `eval` bypasses target-page CSP |
| 3 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 442–446 | Host validation accepts `localhost` and `[::1]` in addition to `127.0.0.1` | On multi-user hosts or CI with untrusted workloads, other local processes/users can reach the daemon and drive the browser | Restrict default binding/acceptance to `127.0.0.1` only, or require an explicit `--host` flag to broaden; add a CI/container warning in SKILL.md |
| 4 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 492–506 | Auto-screenshots on failure capture the full page | If the page renders tokens, PII, or passwords, screenshots are persisted to `.qa-shots/` where any local process can read them | Document the risk; consider redacting common secret patterns or warning when inputs are visible; restrict `.qa-shots/` permissions |
| 5 | 💭 Low | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 200, plus analogous handlers | Error responses leak absolute filesystem paths | An attacker probing the daemon learns filesystem layout, aiding reconnaissance | Return relative/sanitized paths in API errors; keep absolute paths in daemon logs only |

### Coverage Checklist

- [x] `.gitignore` — Dependency & Config (secrets exclusion) ✅ → no issues
- [x] `dev-pipeline/skills/execute-qa/SKILL.md` — Dependency & Config (env/secrets guidance) ✅ → no issues
- [x] `dev-pipeline/skills/execute-qa/qa-browser.mjs` — Input Validation & Injection ⚠️ → Findings #1, #2; Data Exposure ⚠️ → Findings #4, #5; HTTP Security ⚠️ → Finding #3

### Review Comments

**Finding #1:** I noticed the `screenshot`, `save-state`, and `new-context` handlers resolve paths directly from user input without sanitizing `..` or path separators. This means a QA plan could write a failure screenshot to `../../../.bashrc.png` or load an arbitrary file as saved auth state. Would it make sense to constrain these to `.qa-shots/` and `.qa-state/` under the project root and reject absolute/traversal components? That would keep the driver safe even if a plan is compromised.

**Finding #2:** The `eval` command is documented as a last resort, but it's still an arbitrary JS execution hook driven by the plan. A malicious `eval` could exfiltrate session data or manipulate the page. What do you think about requiring an explicit `--allow-eval` daemon flag or a plan-level guard, plus logging every eval invocation? That preserves the escape hatch while making it harder to abuse silently.

**Finding #3:** The daemon accepts `localhost` and `[::1]` as valid Host values, which broadens the loopback surface on shared hosts/CI. The threat model already notes this is surprising in containers. Thoughts on restricting the default to `127.0.0.1` only and requiring an explicit `--host` flag to broaden? It would align the implementation more tightly with the "never expose beyond loopback" intent.

**Finding #4:** Auto-screenshots on failure are great for evidence, but they capture the full page including any sensitive data rendered at that moment. Since `.qa-shots/` is gitignored but not access-controlled, local processes can read them. Could we add a warning in SKILL.md and perhaps restrict directory permissions to owner-only? Redaction is hard, but a documented warning would help.

**Finding #5:** Error responses like `no saved state "x" (/absolute/path/.qa-state/x.json)` expose the absolute filesystem path. It's a minor reconnaissance aid. Would returning relative paths in API errors and keeping absolute paths in logs be a small hardening win?

## Error Handling & Observability

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟠 High | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 187–194 | `withTimeout` uses `Promise.race` but leaves the underlying Playwright promise uncaught. If the daemon timeout wins and the Playwright call rejects later, it becomes an unhandled rejection that can crash the long-running daemon. | Attach a no-op catch to the Playwright promise inside `withTimeout` so the race always resolves cleanly: `p.catch(() => {});` |
| 2 | 🟠 High | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 501–504 | The auto-screenshot guard also uses `Promise.race` without catching the losing `page.screenshot()` promise; a screenshot that errors after the 5 s guard becomes an unhandled rejection. | Attach a no-op catch to `entry.page.screenshot(...)` inside the race. |
| 3 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 488–491 | The request-handler `catch` builds a user-facing `error: e.message` response but never logs the full stack trace (or even `e.stack`) server-side, so unexpected handler bugs are invisible in daemon logs. | `console.error` the full error/stack inside the catch before sending the sanitized JSON response. |
| 4 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 419–524 | The HTTP server has no `.on("error", …)` handler, so `EADDRINUSE` or an invalid port (e.g., malformed `QA_BROWSER_PORT` yielding `NaN`) crashes the process with an unhandled error event. | Add a server error listener that emits a structured JSON error and exits cleanly. |
| 5 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 177 | `browser.on("disconnected", …)` only sets a flag; it does not log the disconnect event or close remaining contexts, so operators cannot distinguish “browser crashed” from “command failed”. | Log the disconnect at `error` level and close tracked contexts in the handler. |
| 6 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 166–169 | `QA_BROWSER_PORT`, `QA_NET_BUF`, and `QA_CMD_TIMEOUT_MS` are parsed with `Number()` without validation; bad values become `NaN`, causing immediate command timeouts, unbounded request buffers, or failed server startup. | Validate numeric env vars and exit with a clear error if they are missing or non-numeric. |
| 7 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 196–214 | `makeContext` does not clean up a partially-created context if `ctx.newPage()` or listener registration throws; the context is created but never tracked/closed. | Wrap context creation in a try-finally (or explicit close on failure) so partial contexts are closed. |
| 8 | 💭 Low | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 129 | The client `req.on("error", …)` handler ignores the error object, omitting diagnostic details like `errno`/`code` when the daemon is unreachable. | Include the error object/message in the logged JSON error. |
| 9 | 💭 Low | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 251–258, 284–287, 298–300, 310–312, 333–337 | Several handlers (`goto`, `press`, `assert-aria`, `get-attr`, `screenshot`) call Playwright without validating required arguments first, producing generic Playwright errors instead of clear usage messages. | Add upfront argument-count checks that return `{ok:false, error:"usage: ..."}` before invoking Playwright. |
| 10 | 💭 Low | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 516–520 | The `JSON.stringify` catch swallows the original serialization error, losing context about which `eval` result could not be serialized. | Log the original serialization error internally while returning the sanitized response. |

### Review Comments

**Finding #1:** I noticed `withTimeout` races the command promise against a timeout but does not catch the command side of the race. In Node, if the timeout wins and the Playwright call rejects later, that rejection is unhandled and can terminate the daemon. Would it make sense to add `p.catch(() => {})` inside `withTimeout` so the timeout always wins cleanly?

**Finding #2:** Same `Promise.race` pattern appears in the auto-screenshot guard. If `page.screenshot` rejects after the 5 s cutoff, it will also become an unhandled rejection. Could you attach a no-op catch there too?

**Finding #3:** The request handler’s catch converts every error to a clean JSON response, which is great for the client, but it also swallows the stack trace from daemon logs. For a long-running QA daemon, unexpected handler failures would be invisible. What do you think about `console.error(e)` (with stack) inside that catch before building the response?

**Finding #4:** The server created at line 419 has no `error` event listener. An invalid port from a typo in `QA_BROWSER_PORT` or an already-bound port will crash with an unhandled `error` event. Would adding `.on("error", …)` with a structured message and clean exit address this?

**Finding #5:** When the browser disconnects, the code silently sets `browserDead = true`. There is no log entry, so a lane or user that later sees “browser process gone” has no timestamp or cause. Could you log the disconnect and close any tracked contexts there?

**Finding #6:** `Number(process.env.QA_CMD_TIMEOUT_MS || 30000)` returns `NaN` for a non-numeric env value, which makes `setTimeout` fire immediately and every command time out. Similar issues affect `QA_NET_BUF` and `QA_BROWSER_PORT`. Would you validate these at startup and fail fast with a helpful message?

**Finding #7:** In `makeContext`, if `ctx.newPage()` or one of the event handlers throws after `browser.newContext(opts)` succeeds, the context is never added to `contexts` and never closed. A try/catch around the setup that closes the context on failure would prevent leaks — thoughts?

**Finding #8:** The client error handler at line 129 constructs a useful message but discards the actual error object. Including it would make diagnosing connection refused vs. ECONNRESET much easier.

**Finding #9:** A few handlers pass user arguments directly to Playwright without checking they exist. For example, `goto` with a missing URL throws “Cannot read properties of undefined,” and `screenshot` with a missing path resolves to the current directory. Up-front usage checks would improve error clarity.

**Finding #10:** The JSON serialization fallback is good for stability, but swallowing the original error makes it hard to debug an `eval` command that returns a BigInt or circular structure. Logging the original error while still returning the safe response would preserve debuggability.

### Coverage Checklist

- [x] `dev-pipeline/skills/execute-qa/qa-browser.mjs` — Try-catch appropriateness ⚠️ → #3, Error message clarity ⚠️ → #9, Logging quality ⚠️ → #3 #5 #8, Sensitive data NOT in logs ✅, Graceful degradation ⚠️ → #4 #5 #6, Retry logic/circuit breakers ✅, Error propagation ⚠️ → #3 #8, Stack trace preservation ⚠️ → #3, User-facing vs internal error messages ⚠️ → #3, Resource cleanup in error paths ⚠️ → #1 #2 #7
- [x] `dev-pipeline/skills/execute-qa/SKILL.md` — Error-handling guidance ✅, Error propagation guidance ✅, Logging/observability guidance ✅ → no issues

## Runtime Behavior

**Files reviewed:** `dev-pipeline/skills/execute-qa/qa-browser.mjs`

### Findings

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🔴 Critical | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 187–194 | `withTimeout` does not clear its losing timer. When the Playwright promise settles before `QA_CMD_TIMEOUT_MS`, the timeout promise still rejects afterwards, producing an unhandled rejection on every command. Node’s default unhandled-rejection behavior (throw/exit since v15) can crash the daemon after the timeout elapses. | Store the `setTimeout` handle and clear it when the raced promise settles (e.g., `p.finally(() => clearTimeout(timer))`). |
| 2 | 🟠 High | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 501–504 | Auto-screenshot failure-capture uses `Promise.race` without cleaning up the 5-second guard timer. If the screenshot succeeds, the timer rejects later and creates an unhandled rejection on every failing command that reaches this path. | Clear the auto-shot guard timer when `entry.page.screenshot(...)` settles, the same way as the command timeout should be handled. |
| 3 | 🟡 Medium | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 205–207 | `consoleErrors` is never drained or capped except by an explicit `console-errors` command. A noisy page or long run can grow this array without bound inside the per-context closure. | Cap `consoleErrors` the same way `requests` is capped (e.g., keep last *N* and `shift()`), or drain it automatically to avoid unbounded retention. |

### Tracing Notes

Traced the hot-path functions/closures/event listeners in `qa-browser.mjs`.

- **`http.createServer` request handler** (`qa-browser.mjs:420`)
  - Callers: invoked by Node’s HTTP server for every incoming command from the thin client (spawned by `execute-qa` SKILL.md shell steps such as `node scripts/qa-browser.mjs goto ...`).
  - Handling: async listener awaited; result JSON-stringified and sent.
  - Frequency: **hot path** — once per browser command.
  - Why it matters: every command flows through here; any unhandled rejection or leaked closure in this path affects all lanes.

- **`withTimeout`** (`qa-browser.mjs:187`)
  - Callers: request handler at lines 484 and 486 (always awaited).
  - Callees: wraps each handler’s Playwright promise plus a `setTimeout` rejection.
  - Frequency: **hot path** — once per command.
  - Why it matters: the losing timer is the source of Finding #1.

- **`makeContext`** (`qa-browser.mjs:196`)
  - Callers: request handler at line 481 (serial auto-create) and `new-context` handler at line 349.
  - Callees: `browser.newContext`, `ctx.newPage`, `page.on(...)` event listeners.
  - Frequency: **occasional** — once per context/lane creation.
  - Why it matters: registers three `page.on` listeners that close over `entry`; the buffers they populate are per-context evidence sources.

- **`handlers.goto`** (`qa-browser.mjs:251`)
  - Callers: request handler via dynamic lookup (`handlers[cmdName]`) at line 484.
  - Callees: `resolveUrl`, `entry.page.goto`.
  - Frequency: **hot path** — at least once per navigation step.
  - Why it matters: mutates the args array in place (`a.splice`) and hits the timeout path.

- **`handlers["wait-for"]`** (`qa-browser.mjs:259`)
  - Callers: request handler via `handlers[cmdName]`.
  - Callees: `resolveTarget`, `page.waitForLoadState`, `locator.waitFor`.
  - Frequency: **hot path** — common in plans.
  - Why it matters: uses the same 10-second inner timeout as other element commands; the outer `withTimeout` guard is what saves it from hanging.

- **`handlers.screenshot`** (`qa-browser.mjs:333`)
  - Callers: request handler via `handlers[cmdName]`.
  - Callees: `path.resolve`, `fs.mkdirSync`, `entry.page.screenshot`.
  - Frequency: **occasional** — per explicit screenshot or failure evidence capture.
  - Why it matters: failure auto-shot path (Finding #2) races screenshot against a 5-second timer.

- **`handlers["new-context"]`** (`qa-browser.mjs:343`)
  - Callers: request handler via `handlers[cmdName]`.
  - Callees: `contexts.get`, `old.ctx.close`, `makeContext`.
  - Frequency: **occasional** — once per lane/identity setup.
  - Why it matters: closes the old same-name context and updates module-level `active`; replacement semantics prevent unbounded growth for named lanes.

- **`handlers["console-errors"]`** (`qa-browser.mjs:325`)
  - Callers: request handler via `handlers[cmdName]`.
  - Callees: `entry.consoleErrors.splice`.
  - Frequency: **occasional** — only when a plan asserts on console errors.
  - Why it matters: it is the only drain for the unbounded buffer noted in Finding #3.

### Coverage Checklist

- [x] `dev-pipeline/skills/execute-qa/qa-browser.mjs`
  - hidden class / megamorphism ✅ (minor `opts` shape change in `makeContext`; not per-request)
  - event loop blocking ✅ (no large synchronous work; JSON parsing capped at 1 MB chars)
  - memory leaks ⚠️ → Finding #3 (`consoleErrors` unbounded; `requests` is capped correctly)
  - prototype pollution ✅ (no user-controlled property keys used for object indexing)
  - reference vs value ✅ (mutations are local/intentional: `args.splice`, `consoleErrors.splice`, `requests.shift`)
  - detached DOM references N/A (Node daemon, no browser-side retention)

### Review Comments

**Finding #1:** I noticed that `withTimeout` races the command promise against a `setTimeout` rejection, but the timeout is never cancelled if the command finishes first. That means every successful command leaves a delayed rejection in the event loop, and Node’s default behavior is to crash on unhandled rejections. Would it make sense to hold the timer handle and `clearTimeout` it in a `.finally` on the command promise? That keeps the safety guard without the crash risk.

**Finding #2:** Same pattern appears in the auto-screenshot failure path — the 5-second guard timer is left running if the screenshot succeeds. Since this runs on every failing command, it could also kill the daemon while the user is trying to inspect a failure. Could we clear that timer once the screenshot settles too?

**Finding #3:** The `consoleErrors` array only gets drained when the plan explicitly calls `console-errors`. On a long or noisy run it could grow without bound inside the context closure. What do you think about capping it the same way `requests` is capped, so a forgotten assertion doesn’t become a memory issue?

### Verification

- Ran `node --check` against the branch version of `dev-pipeline/skills/execute-qa/qa-browser.mjs`: syntax parsed successfully.
- No repo-level test runner exists for this project; findings are static/runtime-mechanism reviews against the code path.

## Async Patterns

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🔴 Critical | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 187–194 | `withTimeout` races the command promise against a timeout, but the original command promise is not observed after the race settles. If the Playwright command rejects *after* the timeout fires, Node sees an unhandled rejection and can crash the daemon (no `process.on('unhandledRejection')` exists in this file or its callers). | Attach a no-op handler to the command promise before racing, e.g. `p.catch(() => {})`, so a late rejection is swallowed once the timeout has already won. Alternatively, propagate an `AbortSignal` into Playwright operations and cancel the work on timeout. |
| 2 | 🟠 High | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 501–504 | The failure auto-screenshot uses the same `Promise.race` pattern: `entry.page.screenshot(...)` is raced against a 5 s timeout but the screenshot promise is left unhandled. A late rejection while capturing failure evidence can crash the daemon. | Attach `.catch(() => {})` to the screenshot promise before the race, or rely on Playwright’s own `timeout` option so no orphaned promise remains. |
| 3 | 🟠 High | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 174, 343–356, 470–483 | `active` is module-global mutable state shared across concurrent HTTP requests. The serial path captures `active` before `await makeContext(name)` (line 480–482), but the `if (!contexts.has(name)) await makeContext(name); entry = contexts.get(name);` sequence is not atomic. Two concurrent no-`--ctx` requests can both see the context missing, create two contexts, and leave the first one orphaned in an open browser. `use-context` / `new-context` also mutate `active` without serialization. | Serialize default-context creation with a per-name in-flight promise (or tiny mutex) inside the request-handler closure, so only one context is created per name and concurrent serial requests cannot leak contexts or misroute onto the wrong one. |

### Coverage Checklist

- [x] `dev-pipeline/skills/execute-qa/qa-browser.mjs` — Unhandled rejections ⚠️ → Finding #1, #2; Race conditions ⚠️ → Finding #3; Resource cleanup ⚠️ → Finding #1–3; Sequential vs parallel ✅; Error propagation ✅; Promise constructor anti-patterns ✅

### Tracing Notes

1. **`withTimeout` @ `qa-browser.mjs:187`**
   - **Callers:** `http.createServer` request handler at lines 484 and 486 — awaits result and wraps in `try/catch`.
   - **Callees:** `Promise.race` over the command promise (Playwright action from `handlers`) and a timeout promise.
   - **Frequency:** hot path — every command.
   - **Why it matters:** This single helper gates every Playwright operation; its race semantics determine whether a slow command can take down the whole daemon.

2. **`http.createServer` request handler @ `qa-browser.mjs:420`**
   - **Callers:** Started once by `/execute-qa` via `node scripts/qa-browser.mjs serve ... &`; then one `POST /cmd` per client command.
   - **Callees:** `withTimeout`, `handlers[cmdName]`, `makeContext`.
   - **Frequency:** hot path — one invocation per `[browser]` step, concurrent for multi-lane plans.
   - **Why it matters:** This is the top-level async boundary; there is no Express error middleware or `unhandledRejection` handler to catch late-rejecting promises.

3. **`handlers["new-context"]` @ `qa-browser.mjs:343`**
   - **Callers:** request handler when client sends `new-context <lane>`.
   - **Callees:** `makeContext`, closes old context via `old.ctx.close()`.
   - **Frequency:** occasional — once per lane/identity per run.
   - **Why it matters:** Mutates the shared `contexts` map and the module-global `active` pointer; races here leak browser contexts.

4. **`handlers["use-context"]` @ `qa-browser.mjs:353`**
   - **Callers:** request handler for `use-context`.
   - **Callees:** none.
   - **Frequency:** occasional.
   - **Why it matters:** Mutates `active` while a concurrent serial command may be between the capture and the `makeContext` await.

5. **`makeContext` @ `qa-browser.mjs:196`**
   - **Callers:** `new-context` handler and the serial default path in the request handler.
   - **Callees:** `browser.newContext`, `ctx.newPage`, page event listeners.
   - **Frequency:** occasional.
   - **Why it matters:** Creates expensive browser context/page objects; concurrent creation for the same name can orphan contexts because the map is overwritten.

6. **Auto-screenshot block @ `qa-browser.mjs:495`**
   - **Callers:** request handler error path after any failed command.
   - **Callees:** `entry.page.screenshot`.
   - **Frequency:** occasional — on failures only.
   - **Why it matters:** Runs inside the same async listener as the command; an unhandled rejection here turns a recoverable test failure into a daemon crash.

7. **Client `http.request` callback @ `qa-browser.mjs:110`**
   - **Callers:** invoked by Node once per client command when the daemon responds.
   - **Callees:** `JSON.parse`, `process.exit`.
   - **Frequency:** hot path — one per command.
   - **Why it matters:** Correctly detects a dropped connection via `lostDaemon` and exits non-zero; no unhandled promise path here.

### Observations

- **Low confidence:** The request listener attaches `req.on('data')` and `req.on('end')` but no `req.on('error')`. A socket/parse error on the request stream could become an uncaught exception. Node’s HTTP server routes many such errors through the `clientError` event, so this is noted only as an observation.

### Review Comments

**Finding #1:** I noticed the timeout guard at `qa-browser.mjs:187` uses `Promise.race`, which only observes the *first* promise to settle. If the Playwright command rejects after the timeout wins, that rejection has no handler and can crash the daemon — especially painful because it would happen while the agent is already trying to recover from a slow step. A minimal fix is to mark the command promise as handled before racing it: `p.catch(() => {});`. What do you think?

**Finding #2:** Same race pattern appears in the auto-screenshot block at `:501`. Since this runs only when a command has already failed, a late-rejecting screenshot could take the daemon down instead of just returning the failure JSON. Adding `.catch(() => {})` to the screenshot promise before the race would prevent that. Thoughts?

**Finding #3:** The serial-path context resolution still relies on the module-global `active` pointer and a non-atomic check-then-create at `:480–482`. Two concurrent no-`--ctx` requests could both create a "default" context and orphan the first one. Would it make sense to keep a per-name in-flight promise in the handler closure so concurrent requests for the same context wait on the same creation promise?

## Documentation

**Files reviewed:** `CLAUDE.md`, `README.md`, `dev-pipeline/README.md`, `dev-pipeline/skills/execute-qa/SKILL.md`, `dev-pipeline/skills/plan-qa/SKILL.md`, `dev-pipeline/skills/plan-qa/artifact-template.md`, `dev-pipeline/skills/review/sub-skills/requirement-coverage.md`, `specs/architecture/ARCH-39-qa-environments-driver-lanes.md`, `specs/requirements/REQ-39-qa-environments-driver-lanes.md`, `specs/tasks/TASKS-39-qa-environments-driver-lanes.md`

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟡 Medium | `README.md` | 141–143 | The plugin-structure tree under `execute-qa/` lists only `SKILL.md` and `artifact-template.md`; it omits the bundled `qa-browser.mjs` that `CLAUDE.md` now includes. This makes the marketplace README inconsistent with the canonical in-repo reference. | Add `qa-browser.mjs` between `SKILL.md` and `artifact-template.md` in the `execute-qa/` tree, matching `CLAUDE.md` line 53. |
| 2 | 🟡 Medium | `dev-pipeline/README.md` | 151 | The version was bumped to `6.1.0` (new QA capabilities: environments, lanes, bug mode, visual judgment), but the "What's new in 6.0.0" block is unchanged and there is no `6.1.0` section documenting the new release. | Add a `**What's new in 6.1.0:**` paragraph after the existing `6.0.0` block summarizing environments/lanes/bug mode/`[judge-visual]`, then keep the historical `6.0.0` note. |

### Coverage Checklist

- [x] `CLAUDE.md` — structure tree updated ✅, QA-gate descriptions updated ✅, cross-references consistent ✅ → no issues
- [x] `README.md` — skill table updated ✅, plugin structure accurate ⚠️ → Finding #1, prerequisites for QA driver noted in observations
- [x] `dev-pipeline/README.md` — QA-gate sections updated ✅, version/release notes updated ⚠️ → Finding #2
- [x] `dev-pipeline/skills/execute-qa/SKILL.md` — environments documented ✅, command table/prefixes documented ✅, lane flow documented ✅, env vars documented ✅, cross-references verified ✅ → no issues
- [x] `dev-pipeline/skills/plan-qa/SKILL.md` — three entry modes ✅, lanes/collision rules ✅, `[judge-visual]` ✅, environment portability ✅, cross-references verified ✅ → no issues
- [x] `dev-pipeline/skills/plan-qa/artifact-template.md` — Lanes section ✅, `[bash local-only]` ✅, `Req` column ✅, `[judge-visual]` ✅, consistent with `SKILL.md` ✅ → no issues
- [x] `dev-pipeline/skills/review/sub-skills/requirement-coverage.md` — mechanical passes added ✅, orphan-files section added ✅, `_protocol.md` reference intact ✅ → no issues
- [x] `specs/architecture/ARCH-39-qa-environments-driver-lanes.md` — file paths accurate ✅, req traces accurate ✅, version bump noted ✅ → no issues
- [x] `specs/requirements/REQ-39-qa-environments-driver-lanes.md` — context file exists ✅, decisions consistent ✅ → no issues
- [x] `specs/tasks/TASKS-39-qa-environments-driver-lanes.md` — file references accurate ✅, gitignore claim verified ✅, version claim verified ✅ → no issues

### Review Comments

**Finding #1 — README plugin structure**  
I noticed the root `README.md` plugin-structure diagram still shows `execute-qa/` as just `SKILL.md` + `artifact-template.md`, while `CLAUDE.md` was updated to include `qa-browser.mjs`. Since this is the bundled runtime driver for the new QA capabilities, a new team member scanning the marketplace README could miss that the skill ships a browser daemon. Would it make sense to mirror the `CLAUDE.md` tree here? That keeps the two entry-point docs in sync.

**Finding #2 — Missing 6.1.0 release notes**  
The plugin is now at `6.1.0` (verified in both `plugin.json` and `marketplace.json`), and this release adds environments, lanes, bug mode, and `[judge-visual]` — material new capabilities. The `dev-pipeline/README.md` still only explains "What's new in 6.0.0". A short `6.1.0` paragraph after it would help users understand what changed and whether they need to adjust their workflow. Thoughts?

### Observations

- `README.md` prerequisites list Node.js only for `/setup-cost-tracking`. `/execute-qa` now drives a Playwright daemon in target projects, so users may need Node.js + Playwright installed there. Consider adding a note under the `/execute-qa` row or in Prerequisites, or keep it in the skill doc if you prefer the README to stay high-level.
- `execute-qa/SKILL.md` instructs users to `cp {base_directory}/qa-browser.mjs scripts/qa-browser.mjs` in the target project but does not say whether that copy should be committed or gitignored. A one-line note would remove ambiguity.

## Configuration & Dependencies

**Result:** ✅ No findings.

**Files reviewed:**
- `.claude-plugin/marketplace.json`
- `dev-pipeline/.claude-plugin/plugin.json`
- `.gitignore`

### Coverage Checklist

- [x] `.claude-plugin/marketplace.json` — version bump consistency ✅ (matches `plugin.json` at `6.1.0`), dependency changes ✅ (none), lock file consistency ✅ (not applicable, no lock file), env var docs ✅ (not applicable) → no issues
- [x] `dev-pipeline/.claude-plugin/plugin.json` — version bump consistency ✅ (matches `marketplace.json` at `6.1.0`), dependency changes ✅ (none), lock file consistency ✅ (not applicable), env var docs ✅ (not applicable) → no issues
- [x] `.gitignore` — env var documentation ✅ (`.env.qa.<name>` documented in `CLAUDE.md` execute-qa section), secrets in source ✅ (none; patterns are gitignore-only), config consistency across environments ✅ (`.env.qa.*` covers all named QA environments generically), dependency/lock/build checks ✅ (not applicable) → no issues

### Review Notes

The only changes in this config slice are a synchronized minor version bump (`6.0.0` → `6.1.0`) in both required manifest files and three new gitignore patterns for QA runtime artifacts. The bump is appropriate for the feature additions described in the PR intent. The new `.env.qa.*`, `.qa-state/`, and `.qa-shots/` ignore patterns are consistent with `CLAUDE.md:148–149`, which documents that `execute-qa` loads a gitignored `.env.qa.<name>` and that the bundled `qa-browser.mjs` produces screenshot/state artifacts. No secrets, no lock-file drift, no dependency declarations, and no CI/build config changes are present in the filtered diff.

## Manual Checks Required

- [ ] **Daemon stability under timeout:** Run a multi-step QA plan that intentionally hits the `QA_CMD_TIMEOUT_MS` guard in one lane while another lane completes commands. Confirm the daemon stays up and the timeout produces a clean `{ok:false, ...}` response rather than an unhandled-rejection crash.
- [ ] **Path-traversal fix validation:** After sanitizing `screenshot`/`save-state`/`new-context` paths, attempt commands with names containing `..`, absolute paths, and platform separators; confirm they are rejected before any filesystem access.
- [ ] **Concurrent lane isolation:** Run a two-lane plan where both lanes issue commands without `--ctx` at nearly the same time. Confirm only one default context is created and commands are not misrouted between contexts.

## Prioritized Action Items

### Must Fix (🔴 Critical / 🟠 High)

1. **Fix `withTimeout` orphaned timer / unhandled rejection** — `qa-browser.mjs:187–194` 🔴  
   The `Promise.race` between the command promise and the timeout leaves the losing timer rejection unhandled; Node’s default behavior can crash the daemon. Store the timer handle and clear it on settlement, and mark the command promise as handled so a late rejection does not propagate. *(Flagged by runtime-behavior, async-patterns, error-handling.)*

2. **Fix auto-screenshot orphaned timer / unhandled rejection** — `qa-browser.mjs:501–504` 🟠  
   Same race pattern as #1. Clear the 5-second guard timer and mark the screenshot promise handled. *(Flagged by runtime-behavior, async-patterns, error-handling.)*

3. **Prevent path traversal in file paths** — `qa-browser.mjs:196–201, 333–337, 358–364` 🟠  
   `screenshot`, `save-state`, and `new-context` resolve paths directly from user/plan input. Reject `..`, path separators, and absolute paths; constrain writes/reads to `.qa-shots/` and `.qa-state/` under the project root. *(Flagged by security.)*

4. **Serialize default-context creation to avoid races** — `qa-browser.mjs:174, 343–356, 470–483` 🟠  
   The module-global `active` pointer plus non-atomic check-then-create can orphan contexts when two concurrent no-`--ctx` requests arrive. Use a per-name in-flight promise (or small mutex) inside the request-handler closure. *(Flagged by async-patterns.)*

5. **Make signal handler safe for async cleanup** — `qa-browser.mjs:181–185` 🟠  
   `await browser.close()` followed by `process.exit(0)` may terminate the process before the browser process is reaped. Let the process exit naturally after close settles, or call `browser.close()` without awaiting and rely on the existing disconnect flag. *(Flagged by code-quality.)*

### Should Address (🟡 Medium)

6. Rename single-letter variables (`a`, `m`, `c`, `p`) in `qa-browser.mjs` to descriptive names.
7. Add stable error codes or a small `QaBrowserError` class instead of generic `throw new Error(...)`.
8. Reject unknown `--browser` values with usage output and exit code 2 instead of silently falling back to Chromium.
9. Copy the `args` array before mutating it in `goto`/`wait-for` flag parsing.
10. Refactor the request handler to flatten nested `if/else` chains and split into helpers (`resolveContext`, `dispatchCommand`, `sendJson`, etc.).
11. Log the full error stack server-side in the request-handler `catch` before returning sanitized JSON.
12. Add an `http.createServer(...).on("error", ...)` listener for `EADDRINUSE`/invalid-port failures.
13. Log browser disconnects at error level and close tracked contexts in the `disconnected` handler.
14. Validate `QA_BROWSER_PORT`, `QA_NET_BUF`, and `QA_CMD_TIMEOUT_MS` at startup; exit cleanly on non-numeric values.
15. Clean up a partially-created browser context in `makeContext` if `newPage()` or listener registration throws.
16. Gate the `eval` command behind an opt-in daemon flag or plan-level guard, and log every invocation.
17. Restrict default daemon host acceptance to `127.0.0.1` or require an explicit `--host` flag for `localhost`/`[::1]`.
18. Document the sensitive-data risk of auto-screenshots and consider restricting `.qa-shots/` permissions.
19. Cap `consoleErrors` the same way `requests` is capped to avoid unbounded growth.
20. Update `README.md` plugin-structure tree to include `execute-qa/qa-browser.mjs`.
21. Add a "What's new in 6.1.0" section to `dev-pipeline/README.md`.

### Nice to Have (💭 Low)

22. Return relative/sanitized paths in API error responses instead of absolute filesystem paths.
23. Include the original error object in the client `req.on("error", ...)` JSON output.
24. Add upfront argument-count checks in handlers before invoking Playwright for clearer usage errors.
25. Log the original serialization error in the `JSON.stringify` catch fallback.

---
*Generated by Review — 2026-08-31 11:39*

---

## Re-review Report

**Original report:** 2026-08-31 11:39  
**Re-review date:** 2026-08-31 11:51  
**Findings addressed:** 5 of 5 must-fix (🔴/🟠), plus 9 of 16 should-address (🟡) and 1 of 4 nice-to-have (💭).

*Note: the same agent performed both the implementation and this re-review. Verification is static (`node --check` + code-path inspection); the manual runtime checks listed below should still be exercised before merge.*

| # | Original Finding | Status | Notes |
|---|-----------------|--------|-------|
| 1 | `withTimeout` leaves orphaned timer / unhandled rejection (`qa-browser.mjs:187–194`) | ✅ Resolved | Timer is now cleared via `p.finally(() => clearTimeout(timer))`; the watched promise is marked handled with `.catch(() => {})` so a late rejection cannot crash the daemon. |
| 2 | Auto-screenshot guard leaves orphaned timer / unhandled rejection (`qa-browser.mjs:501–504`) | ✅ Resolved | Same pattern as #1 applied to the failure auto-shot race. |
| 3 | Path traversal in `screenshot`/`save-state`/`new-context` | ✅ Resolved | Added `ensureInside`, `resolveShotPath`, and `resolveStatePath`; screenshots are constrained to the caller's cwd subtree and state files to `.qa-state/`. Names with path separators or `..` are rejected. |
| 4 | Concurrent serial context creation races on global `active` | ✅ Resolved | Added `pendingContexts` map and `getOrCreateContext`; creation is serialized per name so duplicate contexts cannot be created concurrently. |
| 5 | Async signal handler may exit before browser closes (`qa-browser.mjs:181–185`) | ✅ Resolved | Signal handler is now synchronous; it sets `stopping` and lets `browser.close()` settle before `process.exit(0)`. |
| 6 | Single-letter variable names (`a`, `m`, `c`, `p`) | ✅ Resolved | Renamed `c` → `chunk`, `m` → `reqMethod`, handler param `a` → `args` (with local copy `const a = [...args]`). The screenshot/state path variable `p` remains because it is local and idiomatic for a path in that narrow scope; no traversal risk remains. |
| 7 | Generic `throw new Error(...)` with no stable codes | ⚠️ Partial | Still generic errors, but the security-sensitive paths now throw descriptive messages and the path helpers add structured validation. Stable error codes are a future cleanup. |
| 8 | Unknown `--browser` silently falls back to Chromium | ✅ Resolved | Unknown values now produce a structured JSON error and exit code 2. |
| 9 | `goto`/`wait-for` mutate incoming `args` array | ✅ Resolved | Both handlers now copy the array before parsing. |
| 10 | Request handler catch swallows stack trace | ✅ Resolved | `console.error(e.stack || e.message)` is now called before building the sanitized JSON response. |
| 11 | No server `error` event listener | ✅ Resolved | Added `.on("error", ...)` with structured JSON error and clean exit. |
| 12 | Disconnect handler does not log or close contexts | ✅ Resolved | Logs a JSON error and closes all tracked contexts. |
| 13 | Numeric env vars not validated | ✅ Resolved | Added `requireNumber` helper; `QA_BROWSER_PORT`, `QA_NET_BUF`, `QA_CMD_TIMEOUT_MS` are validated as non-negative integers at startup. |
| 14 | `makeContext` partial cleanup on failure | ✅ Resolved | Wrapped context creation in try/catch; partial contexts are closed on failure. |
| 15 | `eval` command executes arbitrary JS | ❌ Still present | No opt-in flag or plan-level guard added. Risk is documented as "last resort" in the header; a follow-up can add `--allow-eval` if desired. |
| 16 | Host validation accepts `localhost`/`[::1]` | ❌ Still present | Loopback surface remains broader than `127.0.0.1`; the SKILL.md documents the container/CI risk. |
| 17 | Auto-screenshots capture sensitive data | ⚠️ Partial | `.qa-shots/` remains gitignored; no additional warning or permission restriction added. |
| 18 | `consoleErrors` unbounded growth | ✅ Resolved | Capped to `NET_BUF` entries, same as `requests`. |
| 19 | README plugin-structure tree omits `qa-browser.mjs` | ✅ Resolved | Root `README.md` tree updated. |
| 20 | Missing 6.1.0 release notes | ✅ Resolved | `dev-pipeline/README.md` now has a "What's new in 6.1.0" paragraph. |
| 21 | Nested request-handler dispatch | ❌ Still present | No refactor performed; still 4+ levels in the server callback. |
| 22 | Error responses leak absolute paths | ❌ Still present | Screenshot/save-state still return absolute paths by design (documented contract). |
| 23 | Client `req.on("error")` ignores error object | ❌ Still present | Connection errors still return a generic message. |
| 24 | Missing argument validation in handlers | ⚠️ Partial | Added usage checks for `goto` and `wait-for`; other handlers still pass arguments directly to Playwright. |
| 25 | JSON serialization catch swallows error | ❌ Still Present | Original serialization error is not logged separately. |

### Regressions checked

- `node --check dev-pipeline/skills/execute-qa/qa-browser.mjs` passes.
- The daemon startup banner and client connection paths are unchanged except for the validated default port.
- The loopback security check (Origin/Referer/Host/content-type) is unchanged.
- The `eval` command surface is unchanged.

### Manual checks still recommended

- [ ] Run a multi-lane plan that hits `QA_CMD_TIMEOUT_MS` and confirm the daemon stays up.
- [ ] Attempt `screenshot ../../../tmp/x.png`, `save-state ../x`, and `new-context x --state ../../x` and confirm each is rejected.
- [ ] Start two lanes without `--ctx` simultaneously and confirm only one default context exists in `status`.

### Updated Verdict: ⚠️ APPROVE WITH COMMENTS

The five must-fix findings are addressed in code and verified statically. Two medium security/convenience items remain (`eval` opt-in guard and loopback host restriction), but they are documented risks rather than newly introduced regressions. I recommend merging after the three manual runtime checks above are exercised; if the runtime checks pass, the verdict upgrades to ✅ APPROVE.
