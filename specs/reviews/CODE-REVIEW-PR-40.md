# Review Report

## Metadata

| Field | Value |
|-------|-------|
| **Review Mode** | PR #40 (general mode) |
| **Target** | https://github.com/foyzulkarim/skills/pull/40 — `feat/39/qa-environments-driver-lanes` → `master` |
| **Date** | 2026-08-31 10:57 |
| **Tech Stack** | Standalone Node.js ESM (no framework, no package.json — `qa-browser.mjs`, Playwright via dynamic import), bash, markdown skill docs. No test runner (by repo design). |
| **Checks Run** | code-quality, security, error-handling, async-patterns, runtime-behavior, config-dependencies, documentation (7) |
| **Checks Skipped** | task-completion, requirement-coverage (pipeline-mode checks; developer chose code-only general mode), test-coverage (repo has no test infrastructure by design; TASKS-39 verification is checklist-based), performance (no algorithms/DB; memory concerns covered by runtime-behavior), typescript-strictness (no TS), react/express/database/accessibility (not present), migration (purely additive) |
| **Files Changed** | 18 |
| **Lines Changed** | +1674 / −469 |

## Review Process

- [x] Preflight checks passed
- [x] Diff gathered (18 files, ~2100 lines)
- [x] Tech stack detected: Node.js ESM + Playwright, bash, markdown
- [x] Context read (CLAUDE.md, PR description, commit messages)
- [x] Triage proposed and developer confirmed (7 run / 10 skipped)
- [x] 7 checks dispatched: code-quality, security, error-handling, async-patterns, runtime-behavior, config-dependencies, documentation
- [x] Results collected and deduplicated (cross-check duplicates merged: 4 pairs into their most relevant category)
- [x] Report compiled
- [x] Verdict determined
- [x] Report saved to specs/reviews/

## Verdict: ❌ REQUEST CHANGES

The PR's architecture is sound and much of the driver is genuinely well-built — mandatory target prefixes, the secret-fingerprint echo, per-context buffers, and the JSON envelope are good design, and several suspected failure modes were tested by reviewers and confirmed *not* to be bugs. But 7 High findings block merge: two make the documented happy path inoperative (the driver path is wrong and the lane addressing can never work), three can silently corrupt or kill a running QA session (serial-path cross-wire race, daemon-fatal `eval` serialization, client silent-exit-0), one is a false-verdict bug in an assertion primitive (`assert-visible` never waits), and one is a real attack surface (no request-origin validation). None are architectural — all are localized fixes.

### Finding Counts

| Category | 🔴 | 🟠 | 🟡 | 💭 | ⚠️ |
|----------|-----|-----|-----|-----|-----|
| Documentation | 0 | 2 | 5 | 2 | 0 |
| Async Patterns | 0 | 3 | 2 | 0 | 0 |
| Code Quality | 0 | 1 | 5 | 3 | 0 |
| Security | 0 | 1 | 3 | 1 | 0 |
| Error Handling | 0 | 0 | 5 | 3 | 0 |
| Runtime Behavior | 0 | 0 | 1 | 0 | 0 |
| Config & Dependencies | 0 | 0 | 2 | 1 | 0 |
| **Total** | **0** | **7** | **23** | **10** | **3** |

---

## Documentation

**Files reviewed:** execute-qa/SKILL.md, plan-qa/SKILL.md, plan-qa/artifact-template.md, review/sub-skills/requirement-coverage.md, README.md, dev-pipeline/README.md, CLAUDE.md, qa-browser.mjs header. Nine documented claims traced line-by-line against the driver; most verify.

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| D1 | 🟠 High | `dev-pipeline/skills/execute-qa/SKILL.md` | 61, 68, 70, 130 | Driver invoked as `node scripts/qa-browser.mjs serve` — no `scripts/` copy exists; the file ships at `{base_directory}/qa-browser.mjs` (and syncs to `~/.claude/skills/execute-qa/`). The canonical lifecycle command is ENOENT as written, violating AGENTS.md's `{base_directory}` convention that the file itself follows at :166. Compounding (from config-dependencies): `await import("playwright")` resolves relative to the *script's* location, so running it in place fails with `ERR_MODULE_NOT_FOUND` even when the target project has playwright installed — ARCH-39:136 mandates a copy-into-target step that SKILL.md never states. | Reference `{base_directory}/qa-browser.mjs`; add an explicit setup precondition (copy into target, playwright devDependency, `npx playwright install chromium`); optionally wrap the import to emit a JSON error with the fix. |
| D2 | 🟠 High | `dev-pipeline/skills/execute-qa/SKILL.md` | 114 | Lane contract is internally impossible: "Each lane's FIRST browser command is `new-context <identity>`" but "Every later command … carries `--ctx <lane>`". The driver resolves `--ctx` by exact context name (`qa-browser.mjs:430`), so `new-context qa-member` then `goto /a --ctx lane2` fails loudly on every lane's second command. The script header (:27) documents the opposite (correct) contract: `new-context <lane>`. Also collides with "one context per identity" when a lane holds two identities. | Pick one name and state it once: `new-context <lane>` + `--ctx <lane>` (matches the driver header and TASKS-39's own verification flow), plus one sentence on multi-identity lanes. |
| D3 | 🟡 Medium | `dev-pipeline/skills/execute-qa/SKILL.md` | 108 | "Any failed command auto-captures a screenshot" — code also skips autoshot for `NO_AUTOSHOT = {screenshot, console-errors, stop, status}` (`qa-browser.mjs:390`), `new-context` failures (no entry), and browser-dead (:449). Worst case is `console-errors` — the canonical failure outcome captures no evidence, yet the doc says to reference "that path". Header :79 documents only the timeout exception. | State the full exception list in SKILL.md:108 and the header's parenthetical. |
| D4 | 🟡 Medium | `dev-pipeline/skills/execute-qa/SKILL.md` | 75 | Step→command table omits `press <target> <key>` and `use-context <name>`. The "Anything else → eval" catch-all makes the table exhaustive by implication — "press Enter to submit" gets routed to the escape hatch R21 exists to avoid; `use-context` (only way to switch the serial pointer) appears nowhere outside the script header. | Add a `press` row and either a `use-context` row or a "full command list lives in the script header" pointer. |
| D5 | 🟡 Medium | `dev-pipeline/skills/plan-qa/SKILL.md` | 198 | Illustrative example step 2: "Navigate to `$BASE/settings`" — the exact absolute-URL form the new Environment Portability rule (:29, two pages earlier) forbids and R2 flags as a plan error. The example teaches the anti-pattern. | Change to "Navigate to `/settings`". |
| D6 | 🟡 Medium | `dev-pipeline/skills/plan-qa/SKILL.md` | 224, 238 | Readiness Gate and You-Must-NOT were not extended to `[judge-visual]`, though the Case Format defines it and REQ R6's acceptance criterion explicitly names the Gate as the rejection point for a criterion-less `[judge-visual]` line. As written, such a line passes the gate. | Extend both to "`[judge]`/`[judge-visual]` lines carrying an explicit pass/fail criterion". |
| D7 | 🟡 Medium | `dev-pipeline/skills/plan-qa/artifact-template.md` | 6 | Header template retains "**Environment:** \<URL of the environment under test\>" — pins a URL inside the plan, contradicting this PR's core environment-agnostic contract (R2/R7, run-time `--env`/`--base`). | Drop the row or repurpose to "chosen at run time (`--env` / `--base` — see /execute-qa)". |
| D8 | 💭 Low | `dev-pipeline/skills/execute-qa/SKILL.md` | 154 | PASS verdict row still says "no `[judge]` lines" while the PASS (judged) row below was updated — a case with `[judge-visual]` lines classifies as plain PASS. | "…no `[judge]` or `[judge-visual]` lines". |
| D9 | 💭 Low | `dev-pipeline/skills/execute-qa/qa-browser.mjs` | 20 | Header Usage line omits `--browser` which `serve` accepts (:134) and the script's own usage error (:139) prints. | Add `[--browser chromium]` to the header Usage line. |

**Verified accurate** (no findings): env-var list ↔ script header (all names/defaults match); JSON envelope `{ok, cmd, elapsedMs, count?}`; `status` fields; screenshot path resolution; unknown-`--ctx` loud failure; `--until`/`type`/`expect-request`/`route mock` semantics; requirement-coverage.md's new mechanical pass internally consistent; README/dev-README/CLAUDE.md claims consistent with SKILL.md files.

---

## Async Patterns

**Files reviewed:** `qa-browser.mjs` (full file). Key suspicions **verified empirically on Node 26.7.0**; false positives (unhandled rejection from `Promise.race` losers) ruled out and excluded.

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| A1 | 🟠 High | `qa-browser.mjs` | 435–436 | Cross-lane race on the serial auto-create path: `active` is re-read *after* `await makeContext(active)` (two Playwright round-trips — a wide window). If a lane's `new-context`/`use-context` lands during that await, the no-`--ctx` request binds to the **lane's context**: its command runs on the lane's page and `console-errors` splices the lane's buffer. Silent wrong-identity execution — falsifies T1's lane-isolation claim (REQ R14) for any serial command racing a context switch. The documented `--ctx` path itself (428–433) is sync and safe. | Capture the name before the await: `const name = active; if (!contexts.has(name)) await makeContext(name); entry = contexts.get(name);` |
| A2 | 🟠 High | `qa-browser.mjs` | 110–122 | Client handles only `req` errors; once the response stream starts, a daemon death mid-command (`stop` from another lane, SIGINT, or crash from A3) makes the client **print no JSON line and exit 0** — verified empirically. A QA step then looks like a silent success, violating the one-JSON-line contract invisibly. | Add `res.on("error", …)` printing `{"ok":false,"error":"daemon closed connection mid-command"}` + exit 1; optionally check `res.complete` on close and add a client timeout. |
| A3 | 🟠 High | `qa-browser.mjs` | 467 | `res.end(JSON.stringify(out))` sits outside the try/catch inside the async `req.on("end")` listener — a throw there is a fatal `unhandledRejection`. `eval` returns page values verbatim, so `eval "BigInt(1)"` makes `JSON.stringify` throw → the daemon and **all lanes die** (verified: async-listener throw is process-fatal). | Serialize with a fallback: `let payload; try { payload = JSON.stringify(out); } catch { payload = JSON.stringify({ok:false, error:"response not serializable (eval result)"}); } res.end(payload);` |
| A4 | 🟡 Medium | `qa-browser.mjs` | 435, 317–325 | TOCTOU on the shared `contexts` Map: two concurrent no-`--ctx` first commands (or two concurrent `new-context <same-name>`) both pass the `has()` check and both create — last `set` wins, the loser's browser context and page **leak for the whole run** (visible orphan page in a headed session). No cross-wire in this sub-case, but resource corruption of shared state the PR claims serialized. | Guard creation with an in-flight placeholder in the Map, or serialize context creation through a promise chain. |
| A5 | 🟡 Medium | `qa-browser.mjs` | 167–174, 455–458 | `withTimeout` never clears its timer, and the losing operation keeps running after failure is reported: a timed-out `click`/`fill` can still land seconds later against a page the run has moved on from, corrupting subsequent assertions with no trace. (Same pattern in the 5s auto-shot race.) The late rejection itself is safe — `Promise.race` absorbs it. | `clearTimeout` when the race settles; document that a timed-out command may still act (or mark the context suspect so the next command warns). |

---

## Code Quality

**Files reviewed:** `qa-browser.mjs`. ARCH-39's deliberate choices (single file, handler map, `node:*`-only, additive JSON) respected — only spec deviations and local quality flagged.

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| Q1 | 🟠 High | `qa-browser.mjs` | 269 | `assert-visible` passes `{timeout: 10_000}` to `locator.isVisible()` — Playwright documents that option as ignored; the method returns immediately. The command is a point-in-time check wearing a 10s-wait costume, so it **false-FAILs on async-rendered UI** — exactly what QA drives, and QA verdicts are read off its exit code. | If waiting is intended, use the `waitFor({state:"visible"})` idiom already at :247; if point-in-time is intended, delete the option. Make `assert-visible` and `wait-for` visibly different. |
| Q2 | 🟡 Medium | `qa-browser.mjs` | 394–468 | The `createServer` callback is ~75 lines owning seven concerns (body cap, parse, guards, context resolution, dispatch, evidence, envelope). | Extract `resolveContext()` and `attachFailureEvidence()`; hoist the client out of the top-level `else`. |
| Q3 | 🟡 Medium | `qa-browser.mjs` | 244–285 | Hardcoded `10_000` across 9 handler calls — an undocumented second timeout layer ARCH A2 explicitly declined; `assert-aria` (:273) has none, silently getting Playwright's 30s default and racing the outer guard. | One `ACTION_TIMEOUT_MS` constant + one header line stating the two-layer design. |
| Q4 | 🟡 Medium | `qa-browser.mjs` | 444 | Timeout detection re-parses the error string (`/timed out after \d+ms$/`) — a string contract with line 171; rewording silently disables the auto-shot exclusion and `timedOut` field. | `class CommandTimeout extends Error {}` + `instanceof`. |
| Q5 | 🟡 Medium | `qa-browser.mjs` | 144 | `--browser <typo>` silently falls back to chromium (`|| chromium`); ARCH A7 specifies usage-exit on bad flags; the mismatch is invisible in `status`. (Also flagged by error-handling.) | Reject unknown engines with the valid list, mirroring the `parseArgs` failure path above it. |
| Q6 | 🟡 Medium | `qa-browser.mjs` | 372 | `status` returns `browser: <boolean>` behind a noun key; ARCH-39:116 and SKILL.md:92 both call the field "browser-connected". Free rename now (unreleased), A8 liability later. | Rename to `browserConnected`. |
| Q7 | 🟡 Medium | `qa-browser.mjs` | 236, 291–295, 277 | Under-specified args don't fail loudly, two in the dangerous direction: `goto` with no URL navigates to `<base>/undefined` and returns `ok:true`; `expect-request GET` with no pattern becomes `url.includes("")` → matches **any** GET → false PASS read off the exit code; `assert-url` with no arg matches literal `"undefined"`. ARCH A4's own rationale: "a loud error costs one retry, a misclassification costs a wrong verdict." (Also flagged by error-handling.) | A `requireArgs(a, n, usage)` helper for fixed-arity handlers; `expect-request` at minimum. |
| Q8 | 💭 Low | `qa-browser.mjs` | 102, 105, 233, 241 | Cryptic `ui`/`pi` index names; terse single-letter params in the dense handler map. | `untilIdx` / `portIdx`; keep `a` only where destructured contents are named. |
| Q9 | 💭 Low | `qa-browser.mjs` | 308, 334, 451 | Caller-cwd resolution in two subtly different variants across 3 sites (and `screenshot` lacks the absolute-path guard). | One `resolveCallerPath(p, cwd)` helper. |
| Q10 | 💭 Low | `qa-browser.mjs` | 261 | `pressSequentially` requires Playwright ≥ 1.38; no lockfile exists, so an older target project fails mid-run with `pressSequentially is not a function`. | State the floor where the dependency is stated, and/or check once at launch. |

---

## Security

**Files reviewed:** `qa-browser.mjs`, `.gitignore`. Verified clean: loopback-only bind; `eval` is page-context only (no daemon RCE, no `process.env` access); no daemon-side literal-secret echo (`expandEnv` errors name the var, never the value; `valueEcho` fingerprints); `route mock` client-driven by design; gitignore patterns verified live with `git check-ignore`.

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| S1 | 🟠 High | `qa-browser.mjs` | 394, 412, 470 | The daemon validates nothing about request origin: no `Origin`/`Referer` rejection, no `Host` allowlist, no `content-type` check. The threat model covers local *processes*, but the surface is reachable from **browsers**: a `text/plain` no-cors POST skips preflight and loopback is mixed-content-exempt, so any page — including the app under test or third-party scripts on it — can POST commands. With a saved admin state on disk, two blind POSTs (`new-context pwn admin`, then `goto`/`fill`/`click` in that context) let an untrusted page drive the app under the admin's session (blind session-hijacked actions — privilege changes, destructive actions). DNS rebinding additionally enables reading responses. Chrome's Local Network Access partially mitigates; Firefox/Safari don't. | ~6 lines before `JSON.parse`: reject requests carrying `Origin`/`Referer` (the bundled Node client sends neither — zero friction), require `Host` ∈ loopback forms, require `content-type: application/json`. |
| S2 | 🟡 Medium | `qa-browser.mjs` | 313–316 | `eval` returns its result verbatim, falsifying the documented guarantee "env:NAME → never echoed": `eval document.querySelector('#pass').value` after `fill … env:QA_PASS_MEMBER` returns the literal secret into the transcript and QA-RESULTS evidence. | Cap eval results (200 chars, like `expect-text` :282) and/or document the caveat in the header + a SKILL.md rule (never quote eval output as evidence). |
| S3 | 🟡 Medium | `qa-browser.mjs` | 332–339 | `save-state` writes cookies+localStorage with default mode 0644 — any local process reads live session cookies without driving the browser. The header's own threat model names "container/CI with untrusted workloads" as a real deployment. | `fs.chmodSync(p, 0o600)` after the write; `mode: 0o700` on the mkdir. |
| S4 | 🟡 Medium | `.gitignore` + `execute-qa/SKILL.md:42` | 26–28 | The new patterns protect **this repo only**, but runs happen in the *target* project, where `.env.qa.<name>` (literal passwords) and `.qa-state/*.json` (session cookies) are created. SKILL.md:42 asserts "(gitignored)" as fact with no verifying step, and `.qa-state`/`.qa-shots` ignores are never mentioned anywhere — a routine `git add -A` in the target commits credentials. (Also flagged by config-dependencies.) | Add a fail-hard precondition to execute-qa's environment gate: verify the target repo ignores all three patterns (`git check-ignore`), stop with the remedy if not. |
| S5 | 💭 Low | `qa-browser.mjs` | 254–263, 442–444 | On `fill`/`type` failure the raw Playwright error goes back; its call log may embed the typed value (unverified). Cheap scrub: replace occurrences of the resolved value with `env:<NAME>` in the catch. | Scrub `e.message` for fill/type; manually test via a forced timeout. |

---

## Error Handling

**Files reviewed:** `qa-browser.mjs`. Several suspected paths **tested on Node 26.7.0 and confirmed NOT bugs** (excluded): race-loser rejections, oversize-body 413 delivery, client abort, malformed JSON envelope, state-file check, per-handler failure envelopes.

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| E1 | 🟡 Medium | `qa-browser.mjs` | 418 | After a browser crash, `stop` is rejected by the `browserDead` gate ("browser process gone — restart the daemon") forever — the documented teardown command can never run; the daemon must be killed by PID. Message advises the opposite of the operator's intent. | Exempt `stop` from the gate; reword. |
| E2 | 🟡 Medium | `qa-browser.mjs` | 160–165, 382–385 | Both shutdown paths `await browser.close()` before `process.exit(0)` with no guard — a hung browser (a realistic post-crash state) makes Ctrl-C silently ignored and `stop` linger while rejecting all commands. | `Promise.race` the close against ~3s and exit unconditionally. |
| E3 | 🟡 Medium | `qa-browser.mjs` | 317–325 | `new-context` closes and deletes the same-name context **before** validating/creating the replacement — a typo'd state name destroys the lane's logged-in session. Also `makeContext` leaks a half-built context if `newPage()` rejects (also flagged by runtime-behavior). | Validate/build first, then close the old — make the swap atomic. |
| E4 | 🟡 Medium | `qa-browser.mjs` | 179–181 vs 334 | `STATE_DIR` resolves against the **daemon's** cwd when loading but the **caller's** cwd when saving — the documented `save-state` → `new-context <n> <state>` round-trip breaks whenever they differ, and the error prints a path the caller never wrote to. | Resolve both against `callerCwd` (thread it into `new-context`). |
| E5 | 🟡 Medium | `qa-browser.mjs` | 470–472 | `listen()` has no `error` handler and runs **after** `browser.launch()` — a leftover daemon (the common restart-without-stop mistake) crashes with a raw `EADDRINUSE` stack after already opening a second headed browser window, skipping every cleanup path. (Also flagged by runtime-behavior, which adds: listen before launch.) | `server.on("error", …)`: close the browser, print one JSON line with the `--port` remediation, exit 1. |
| E6 | 💭 Low | `qa-browser.mjs` | 272–309, 354–360 | Missing-arg diagnostics: `screenshot` → raw TypeError; `assert-aria` → `Cannot read properties of undefined`; `assert-url` → `ok:false` with **no error field** (`JSON.stringify` elides undefined); `route mock` with no body silently installs an empty 200 mock. | One-line usage guards per handler; require a body for `route mock`. |
| E7 | 💭 Low | `qa-browser.mjs` | 443 | `error: e.message` — a thrown non-Error (string/object) yields `error: undefined`, dropped from the envelope: `{"ok":false}` with no reason. `eval` makes exotic throw shapes realistic. | `error: String(e?.message ?? e)`. |
| E8 | 💭 Low | `qa-browser.mjs` | 100–106 | Dangling client flags: `--ctx` as last arg sets `ctx = undefined` → dropped from the body → the command silently routes to the serial active context — cross-lane contamination in the exact flow this PR adds. Same shape for `--port` → `:NaN`. | Fail on a missing value. |

---

## Runtime Behavior

**Files reviewed:** `qa-browser.mjs`. Verified clean: ring-buffer cap holds (incl. `NET_BUF=0`); no listener accumulation (3 per context, freed with it); disconnect-mid-run handling; no event-loop blocking (sync fs/hash are microsecond-scale).

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| R1 | 🟡 Medium | `qa-browser.mjs` | 186 | `consoleErrors` grows without bound for the daemon's lifetime — `requests` is ring-buffered but its sibling isn't, and draining is plan-conditional. A broken page's render-loop error (~60/s) accumulates tens of MB per hour per context on multi-hour multi-lane runs; the eventual drain serializes it all into one JSON line. | Apply the same cap (keep last N, flag `truncated: true` on the next drain). |

*(Runtime #2 merged into E5; #3 merged into A5; #4 merged into E3.)*

---

## Config & Dependencies

**Files reviewed:** `qa-browser.mjs`, `.gitignore`, both plugin manifests. Verified: both manifests read 6.1.0 and agree; env vars documented consistently header ↔ SKILL.md; no `QA_*` namespace collisions; client `--port` parity fixed per TASKS-39 A7.

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| C1 | 🟡 Medium | `AGENTS.md:8` / `CLAUDE.md:242` / `README.md:120` | — | All three still state Node.js is needed **only** for `setup-cost-tracking` — now false: `/execute-qa`'s browser driver requires Node + playwright. T4 was "sync docs" and missed this line in all three files. | Update all three; state the minimum Node version (`parseArgs` needs ≥ 18.17). |
| C2 | 🟡 Medium | `CHANGELOG.md` + `dev-pipeline/README.md:151` | — | Version bumped to 6.1.0 in both manifests but no `v6.1.0` CHANGELOG entry (the 6.0.0 release shipped bump + entry together), and the README still headlines "What's new in 6.0.0". | Add the v6.1.0 section (environments, driver, lanes, coverage upgrades); refresh the README pointer. |
| C3 | 💭 Low | `qa-browser.mjs` | 88, 148–149, 470 | Unguarded `Number()` on env values: `QA_CMD_TIMEOUT_MS=0` or garbage → every command instantly times out (`timed out after NaNms`, blaming neither var nor value); `QA_NET_BUF=abc` → `length > NaN` always false → buffer silently unbounded; `QA_BROWSER_PORT=abc` → serve crashes `ERR_SOCKET_BAD_PORT`. | `Number.isFinite(n) && n > 0` guards on the numeric knobs. |

*(Config #1 playwright/path merged into D1; config #4 target-repo gitignore merged into S4.)*

---

## Manual Checks Required

- [ ] `route` mock/abort callbacks (`qa-browser.mjs:350–358`) don't await `r.abort()`/`r.fulfill()` — verify one invalid fulfill payload can't take the daemon down (Playwright usually absorbs route-handler failures, but that isn't verifiable from code).
- [ ] `kill -9` the daemon and confirm the headed browser window is reaped via the CDP pipe close (signal handlers can't cover SIGKILL).
- [ ] Playwright CVE/health rides the *target* project's lockfile (this repo pins nothing) — acceptable by design, but worth one look when a real target adopts the driver.

## Prioritized Action Items

### Must Fix (🔴 Critical / 🟠 High)
1. **D1** — Fix driver path (`{base_directory}/qa-browser.mjs`) + document the copy-into-target/playwright setup step.
2. **D2** — Fix the lane naming contradiction (`new-context <lane>` + `--ctx <lane>`); state the multi-identity rule.
3. **Q1** — Make `assert-visible` actually wait (or honestly not wait) — it feeds QA verdicts.
4. **A1** — Capture the serial context name before the await (cross-wire race).
5. **A3** — Guard response serialization (one `eval` can kill the daemon and all lanes).
6. **A2** — Handle client response-stream errors (silent exit-0 = silent PASS).
7. **S1** — Add Origin/Host/content-type validation to the daemon (~6 lines, zero ergonomic cost).

### Should Address (🟡 Medium)
8. **S4** — Target-repo gitignore precondition before loading `.env.qa.*` (credential-leak guard).
9. **S2/S3** — Eval result cap + secret-echo caveat; `chmod 600` on saved states.
10. **E1/E2** — `stop` must always work and always exit (hung-close guard).
11. **E3/E4** — Atomic context replacement; single-cwd `STATE_DIR` resolution.
12. **E5** — `listen()` error handler (+ listen before launch).
13. **A4/A5** — Context-creation TOCTOU guard; clear timeout timers / document loser-runs.
14. **Q7** — Arg validation, `expect-request`'s false-PASS at minimum.
15. **R1** — Cap `consoleErrors`.
16. **C1/C2** — Node-requirement drift in 3 files; missing v6.1.0 CHANGELOG/README entry.
17. **D3–D7** — Doc accuracy set: autoshot exceptions, `press`/`use-context` rows, `$BASE` example, Readiness Gate `[judge-visual]`, template Environment row.
18. **Q2–Q6** — Handler decomposition, `ACTION_TIMEOUT_MS` constant, typed timeout error, `--browser` validation, `browserConnected` rename.

### Nice to Have (💭 Low)
Q8–Q10, E6–E8, S5, D8–D9, C3 — one-liners each; batch opportunistically.

---
*Generated by Review — 2026-08-31 10:57*
