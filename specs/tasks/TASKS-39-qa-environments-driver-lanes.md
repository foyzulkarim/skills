# Tasks

## Task T1: Driver core safety — concurrency, timeout, lifecycle

> **Status:** done
> **Verification:** test-after
> **Effort:** m
> **Priority:** critical
> **Depends on:** None
> **Satisfies REQs:** R14, R15, R18, R24 (client `--port`), N2
> **Footprint slice:** Modified: `dev-pipeline/skills/execute-qa/qa-browser.mjs` (concurrency, timeout guard, lifecycle, port parity — the safety half of the driver row)
> **High-risk areas touched:** `qa-browser.mjs` (H — only runtime artifact; CLI contract consumed by agent executors)

### Description

Remove the module-global `current` pointer that races when two lanes issue commands
simultaneously, and harden the daemon's lifecycle so an AI driver never waits forever or
leaves orphans behind. After this task, context state is resolved per request and threaded
through the handler, every command runs under a timeout guard, contexts are created only
via `new-context` (with close-on-replace), the browser is reaped on signals, a dead browser
fails commands fast, and client/serve have `--port` parity.

### Test Plan

#### Test File(s)

This repo has no test runner (per CLAUDE.md). Verification is a **command gauntlet**: a
throwaway local HTTP server (`python3 -m http.server 8899` or node equivalent) serving a
static fixture page, the daemon started against it, and the scenarios below executed as
real CLI invocations with expected JSON/exit codes. Record each command's output as the
evidence.

#### Test Scenarios

##### Serial Path (Regression Guard)

- **serial run works without --ctx** — GIVEN the daemon is serving WHEN `goto /`,
  `screenshot t1.png`, `stop` run with no `--ctx` THEN the default context auto-creates,
  every command exits 0, and the screenshot exists _(guards ARCH backward-regression risk
  for existing serial single-lane usage of the driver)_

##### Lane Concurrency

- **concurrent lanes stay isolated** — GIVEN `new-context lane1` and `new-context lane2`
  WHEN `goto /a --ctx lane1` and `goto /b --ctx lane2` run interleaved THEN
  `eval location.href --ctx lane1` reports page a and `--ctx lane2` reports page b — no
  cross-wiring _(verifies R14, N2)_
- **unknown lane errors loudly** — GIVEN no context named `typo` WHEN
  `goto /a --ctx typo` THEN exit 1 and the error message names `new-context` as the fix;
  no new context is created _(verifies R14; REQ edge case)_

##### Timeout Guard

- **stuck navigation fails fast, daemon survives** — GIVEN a fixture endpoint that sleeps
  60s WHEN `QA_CMD_TIMEOUT_MS=2000` and `goto /slow` runs THEN it exits 1 with a timeout
  diagnostic in ~2s, and a following `goto /` succeeds _(verifies R15; ARCH forward
  stress-test: hung command)_

##### Lifecycle

- **new-context closes what it replaces** — GIVEN `new-context dup` has run WHEN
  `new-context dup` runs again THEN it succeeds and `status` shows exactly one context
  named `dup` (the old context is closed, not leaked) _(verifies R18)_
- **SIGINT reaps the browser** — GIVEN the daemon is running WHEN it receives SIGINT THEN
  the daemon exits and no orphaned chromium process remains (`ps` check) _(verifies R18)_
- **dead browser fails fast** — GIVEN the browser process has been killed externally WHEN
  any command runs THEN it exits 1 quickly with a "browser gone — restart daemon" style
  error instead of hanging _(verifies R18; ARCH forward stress-test: browser crash mid-run)_
- **unknown serve flags print usage** — GIVEN `serve --bogus` WHEN parsed THEN usage is
  printed and exit code is 2 _(verifies R18)_
- **stop is final and clean** — GIVEN the daemon is running WHEN `stop` runs THEN it
  returns `{ok:true}` and any later command exits 1 with daemon-not-running _(verifies R18)_

##### Port Parity

- **client honors --port** — GIVEN `serve --port 9123` WHEN a client command runs with
  `--port 9123` THEN it succeeds; without the flag it fails with daemon-not-running on
  8787 _(verifies R24)_

### Implementation Notes

- **Module(s):** `execute-qa/qa-browser.mjs` — sole owner of browser automation (ARCH Module Boundaries)
- **Pattern reference:** the existing handler-map structure in `qa-browser.mjs`; handlers gain an entry parameter rather than reading globals
- **Key decisions:** A1 (per-request context resolution; `current` global deleted; contexts created only via `new-context`; unknown `--ctx` errors loudly), A2 (single `QA_CMD_TIMEOUT_MS` guard, default 30000), A7 (close-on-replace, SIGINT/SIGTERM handlers, `browser.on('disconnected')` detection, usage-exit on bad flags, stop marks daemon stopping), A9 (client `--port` parsed like `--ctx`, falling back to `QA_BROWSER_PORT` then 8787)
- **Libraries:** `node:http/fs/path/util` stdlib + `playwright` only — no new dependencies
- **High-risk callouts:** H-risk file. The serial no-`--ctx` path must behave exactly as before (auto-created default context) — covered by the regression-guard scenario. `status` is implemented in this task (not T2) because the close-on-replace scenario depends on it.

### Scope Boundaries

- Do NOT add the new command surface (`wait-for`, `expect-text`, etc.) — that is T2
- Do NOT change the response envelope (`cmd`/`elapsedMs`) — that is T2
- Do NOT add batch mode or a `/health` endpoint (ARCH Out of Scope)
- Only implement the safety/lifecycle slice of the ARCH driver row

### Files Expected

**New files:** _(none)_

**Modified files:**
- `dev-pipeline/skills/execute-qa/qa-browser.mjs` (concurrency, timeout guard, lifecycle hardening, client `--port`, `status` command)

**Must NOT modify:**
- `dev-pipeline/skills/execute-qa/SKILL.md` (T3 owns it)
- Any docs/manifests (T4 owns them)

---

## Task T2: Driver command surface — prefixes, new commands, envelope, docs

> **Status:** done
> **Verification:** test-after
> **Effort:** l
> **Priority:** high
> **Depends on:** T1
> **Satisfies REQs:** R16, R17, R19, R20, R21, R22, R23, R24 (fingerprint, body cap, threat-model comment), R25, N1, N3
> **Footprint slice:** Modified: `dev-pipeline/skills/execute-qa/qa-browser.mjs` (command surface, response envelope, paths, secret handling, header docs — the ergonomics half of the driver row)
> **High-risk areas touched:** `qa-browser.mjs` (H)

### Description

Make the driver unambiguous and self-sufficient for an LLM operator: mandatory
`text=`/`css=`/`role=` prefixes via one shared resolver, the missing read/assert commands
(`wait-for`, `type`, `expect-text`, `get-attr`, `count`, `expect-request`, `route list`),
SPA-safe navigation defaults, absolute screenshot paths resolved against the caller's cwd,
a uniform response envelope, fingerprinted literal fills, `pageerror` capture, and a header
that documents every env var, the banner convention, the threat model, and `eval`'s limits.

### Test Plan

#### Test File(s)

Same command-gauntlet approach as T1: fixture server + static pages (one with a deferred
fetch, one rendering an element ~500ms late, one throwing an uncaught exception, one with a
prefilled input and a POST-ing button), daemon started from directory A with client commands
invoked from directory B. Record each command's JSON as evidence.

#### Test Scenarios

##### Selector Prefixes

- **prefixes classify correctly** — GIVEN a page showing "Error. Try again" inside
  `.error` WHEN `assert-visible "text=Error. Try again"` and `assert-visible "css=.error"`
  run THEN both pass _(verifies R17)_
- **unprefixed target errors loudly** — GIVEN any target-taking command WHEN the target
  has no `text=`/`css=`/`role=` prefix THEN exit 1 with an error naming the prefix
  convention _(verifies R17; REQ edge case)_

##### Navigation & Waiting

- **networkidle is the default** — GIVEN a page with a deferred fetch WHEN `goto /spa`
  runs with no override THEN it returns after network idle; with `--until domcontentloaded`
  it returns before the deferred fetch completes _(verifies R22)_
- **long-polling page is rescued by the guard** — GIVEN a page that never idles WHEN
  default `goto` runs THEN the timeout guard fails it with a diagnostic, and a retry with
  `--until load` succeeds _(verifies R15, R22; ARCH forward stress-test)_
- **wait-for catches late render** — GIVEN an element rendered ~500ms after load WHEN
  `wait-for "css=#late"` runs THEN it succeeds; for an absent selector it exits 1 on
  timeout _(verifies R16)_

##### Read / Assert Commands

- **type appends, get-attr proves it** — GIVEN a prefilled input WHEN
  `type "css=#field" abc` runs THEN `get-attr "css=#field" value` shows the original value
  plus `abc` (no clear-first) _(verifies R21)_
- **expect-text passes and fails usefully** — GIVEN a page showing "Count: 3" WHEN
  `expect-text "text=Count: 3"` matches THEN ok; on mismatch exit 1 with `{expected,
  actual}` _(verifies R21)_
- **count returns the match tally** — GIVEN three matching items WHEN
  `count "css=.item"` runs THEN the response carries `count: 3` _(verifies R21)_
- **expect-request asserts traffic** — GIVEN a button that triggers POST /login WHEN
  clicked THEN `expect-request POST /login` is ok; a wrong status filter exits 1 with a
  recent-requests excerpt _(verifies R21)_
- **route list introspects mocks** — GIVEN `route mock` has run WHEN `route list` runs
  THEN it lists the pattern; after `route clear` the list is empty _(verifies R21)_

##### Response Envelope

- **every response carries the envelope** — GIVEN any five commands WHEN their JSON is
  inspected THEN each has `ok`, `cmd`, `elapsedMs`; `network` and `console-errors` include
  `count` _(verifies R23, N1)_

##### Paths

- **screenshots resolve against the caller's cwd** — GIVEN the daemon started in directory
  A WHEN a client in directory B runs `screenshot evidence/x.png` THEN the response path is
  absolute under B and the file exists there; a failing command's auto-shot is likewise
  absolute _(verifies R19)_

##### Secrets & Errors

- **literal fill is fingerprinted, never echoed** — GIVEN `fill "css=#pw" hunter2` WHEN the
  response is inspected THEN it carries `{length, sha256: <8 hex>}` and never the value;
  `fill "css=#pw" env:PW` echoes only `env:PW` _(verifies R24, N3)_
- **pageerror is captured** — GIVEN a page throwing an uncaught exception WHEN
  `console-errors` runs THEN the entry appears tagged `pageerror:` _(verifies R20)_
- **oversized request body rejected** — GIVEN a request body over ~1MB WHEN posted to
  `/cmd` THEN it is rejected with a clear error _(verifies R24)_

##### Header Documentation

- **header enumerates all env vars** — GIVEN the script header WHEN read THEN it lists
  `QA_BASE_URL`, `QA_BROWSER_PORT`, `QA_STATE_DIR`, `QA_SHOT_DIR`, `QA_CMD_TIMEOUT_MS`,
  `QA_NET_BUF`, and the `env:NAME` resolution rule _(verifies R25 — grep)_
- **header documents conventions and limits** — GIVEN the script header WHEN read THEN it
  documents the startup-banner JSON line, the 127.0.0.1-only threat model, and `eval`'s
  whitespace limitation with its last-resort status _(verifies R25 — grep)_

### Implementation Notes

- **Module(s):** `execute-qa/qa-browser.mjs`
- **Pattern reference:** existing handler map; new commands follow the same one-JSON-line + exit-code pattern
- **Key decisions:** A3 (`networkidle` default + `--until` override), A4 (mandatory prefixes via one shared resolver — used by `click`, `fill`, `press`, `assert-visible`, `wait-for`, `expect-text`, `count`), A5 (client sends `cwd`; daemon resolves/returns absolute paths), A6 (new command set; no `eval-file`; `eval` stays the documented last resort), A8 (uniform `{ok, cmd, elapsedMs, count?, …}` envelope — additive only, never rename existing fields), A9 (SHA-256 first-8-hex fingerprint via `node:crypto`; ~1MB body cap; loopback threat-model comment)
- **Libraries:** stdlib + `playwright` only
- **High-risk callouts:** H-risk file. The envelope must be additive so existing agent parsing keeps working — covered by the envelope scenario inspecting unchanged fields. The prefix requirement intentionally breaks the heuristic (no shipped consumers — ARCH Contract changes).

### Scope Boundaries

- Do NOT add batch command mode, `/health` endpoint, or request timing (ARCH Out of Scope)
- Do NOT add `eval-file` (A6 — documentation suffices)
- Do NOT touch skill docs (T3) or manifests/docs (T4)
- Only implement the command-surface slice of the ARCH driver row; T1's safety work is the base this builds on

### Files Expected

**New files:** _(none — fixture pages are throwaway gauntlet material, not committed)_

**Modified files:**
- `dev-pipeline/skills/execute-qa/qa-browser.mjs` (prefix resolver, new commands, envelope, absolute paths, fingerprint, `pageerror`, networkidle default, header docs)

**Must NOT modify:**
- `dev-pipeline/skills/execute-qa/SKILL.md` (T3 owns it)
- Docs/manifests (T4 owns them)

---

## Task T3: Skill-doc contracts — execute-qa, plan-qa template, coverage check

> **Status:** done
> **Verification:** checklist
> **Effort:** m
> **Priority:** high
> **Depends on:** T2 (the command table it documents must exist)
> **Satisfies REQs:** R1–R6 (drift-check), R10, R12 (doc flow), R25 (skill-side enumeration), R26
> **Footprint slice:** Modified: `dev-pipeline/skills/execute-qa/SKILL.md`, `dev-pipeline/skills/plan-qa/artifact-template.md`, `dev-pipeline/skills/plan-qa/SKILL.md` (drift-check only), `dev-pipeline/skills/review/sub-skills/requirement-coverage.md`
> **High-risk areas touched:** `execute-qa/SKILL.md` (M — executor behavior contract), plan-qa template (M — shapes future plans)

### Description

Bring the prose contracts in line with the hardened driver and the REQ: fail-hard
environment preconditions, the new command surface and prefix convention in the step→command
mapping, `new-context`-first lane flow, the plan template's missing sections (Lanes,
`[bash local-only]`, `Req` column, `[judge-visual]`), and the two mechanical passes the
issue demands of the requirement-coverage check.

### Verification Checklist

- **fail-hard preconditions present** — expected: `execute-qa/SKILL.md` Preconditions/Environments text states that a missing `.env.qa.<name>` file, a missing `env:NAME` credential, or an unreachable base URL stops the run at precondition stage with a message naming exactly what is missing and how to fix it _(verifies R10)_
- **command table current** — expected: the step→command mapping includes `wait-for`, `status`, `type`, `expect-text`, `get-attr`, `count`, `expect-request`, `route list`, and states the mandatory `text=`/`css=`/`role=` prefix convention _(verifies R16–R21 doc surface)_
- **lane flow is new-context-first** — expected: the Lanes text says each lane's first browser command is `new-context <identity>` and every later command carries `--ctx <lane>`; no example implies implicit context creation _(verifies R12, consistent with R14)_
- **env-var enumeration block** — expected: `execute-qa/SKILL.md` lists `QA_BASE_URL`, `QA_BROWSER_PORT`, `QA_STATE_DIR`, `QA_SHOT_DIR`, `QA_CMD_TIMEOUT_MS`, `QA_NET_BUF` plus the `env:` resolution rule in one place _(verifies R25)_
- **plan template gains the new sections** — expected: `plan-qa/artifact-template.md` contains a Lanes section (lane → identities → case IDs → rationale), `[bash local-only]` tagging guidance, the `Req` column for pipeline mode, and `[judge-visual]` among the Expected tiers _(verifies R3, R5, R6)_
- **plan-qa drift-check clean** — expected: `plan-qa/SKILL.md` re-read against R1–R6 (bug mode accepts `#123` and `"<description>"`; relative-URL rule; local-only tagging with Guards; logical identities; collision rules; lane-1 pinning; Readiness Gate isolation line; judge-visual criterion requirement) — any mismatch is edited; a clean pass is recorded in the task notes _(verifies R1–R6)_
- **coverage check gains mechanical passes** — expected: `requirement-coverage.md` additionally requires (a) every REQ-ID traced to ≥1 QA-case `Req` column entry, automated test, or TASKS verification plan, and (b) every changed file traced to ≥1 REQ-ID, with untraceable files reported as possible scope creep _(verifies R26)_
- **review orchestrator consistent** — expected: `review/SKILL.md` still lists 17 checks with requirement-coverage at #17; `_protocol.md` tracing rules read consistently with the amended check; no edits needed beyond consistency _(verifies R26)_
- **regression guard — executor contract intact** — expected: execute-qa's Verdicts table, operator-handoff protocol, and You-Must-NOT section are unchanged in meaning (diff reviewed line by line) _(guards M-risk area: executor behavior contract)_

### Implementation Notes

- **Module(s):** `execute-qa/SKILL.md`, `plan-qa/artifact-template.md`, `plan-qa/SKILL.md`, `review/sub-skills/requirement-coverage.md` (ARCH Module Boundaries)
- **Pattern reference:** existing SKILL.md register per CLAUDE.md — imperatives to the agent, "You Must NOT" sections, gates; the Lanes section in `plan-qa/SKILL.md` is the model for the template addition
- **Key decisions:** A10 (fail-hard preconditions), A11 (amend the existing check; no rename, no new file), plus the A1/A4/A6 driver contracts the docs must match exactly
- **Libraries:** none — prose only
- **High-risk callouts:** M-risk executor contract — the regression-guard checklist item forces a deliberate diff review of the unchanged sections; M-risk template — cross-check every new template section against its plan-qa/SKILL.md counterpart so plan authors get the same rules the gate enforces.

### Scope Boundaries

- Do NOT rename `requirement-coverage.md` or create `requirements-traceability.md` (REQ Decision 3)
- Do NOT add a mechanical production-URL gate (REQ Decision 4 — documented prohibition only)
- Do NOT rewrite sections beyond what the REQ/ARCH drift requires — minimal diff
- Only implement the doc-contract slice of the ARCH footprint

### Files Expected

**New files:** _(none)_

**Modified files:**
- `dev-pipeline/skills/execute-qa/SKILL.md` (preconditions, command table, env vars, lane flow)
- `dev-pipeline/skills/plan-qa/artifact-template.md` (Lanes section, local-only tag, Req column, judge-visual tier)
- `dev-pipeline/skills/plan-qa/SKILL.md` (drift-check; edit only on mismatch)
- `dev-pipeline/skills/review/sub-skills/requirement-coverage.md` (two mechanical passes)

**Must NOT modify:**
- `dev-pipeline/skills/execute-qa/qa-browser.mjs` (T1/T2 own it — docs must match, not fix)
- `review/SKILL.md`, `review/sub-skills/_protocol.md` (consistency re-read only; edit only if genuinely inconsistent)
- Docs/manifests (T4 owns them)

---

## Task T4: Housekeeping — scratch-file removal, version bump, docs sync

> **Status:** not started
> **Verification:** checklist
> **Effort:** s
> **Priority:** medium
> **Depends on:** T3 (docs describe the final state)
> **Satisfies REQs:** R27, R28
> **Footprint slice:** Deleted: `dev-pipeline/skills/execute-qa/skill-additions.md`; Modified: `plugin.json`, `marketplace.json`, `.gitignore`, `CLAUDE.md`, `dev-pipeline/README.md`, `README.md`
> **High-risk areas touched:** None (docs/versioning — L)

### Description

Close out the issue's housekeeping: remove the fully-applied authoring scratch file, bump
the plugin to 6.1.0 in both manifests per the two-places rule, gitignore the QA runtime
artifacts, and sync the three docs that describe the QA gate and repo structure with what
this branch actually ships.

### Verification Checklist

- **scratch file gone** — expected: `dev-pipeline/skills/execute-qa/skill-additions.md` absent from the tree; `grep -r "skill-additions"` across the repo returns no references _(verifies R27)_
- **versions bumped together** — expected: `jq -r .version dev-pipeline/.claude-plugin/plugin.json` and `jq -r .plugins[0].version .claude-plugin/marketplace.json` both print `6.1.0` _(verifies R28)_
- **gitignore covers QA artifacts** — expected: `.gitignore` contains `.env.qa.*`, `.qa-state/`, `.qa-shots/`; `git check-ignore .env.qa.local .qa-state/x .qa-shots/x` confirms all three
- **CLAUDE.md synced** — expected: the structure tree lists `qa-browser.mjs` under `execute-qa/`; the plan-qa/execute-qa descriptions mention environments, lanes, bug mode, and `[judge-visual]` where accurate
- **READMEs synced** — expected: `dev-pipeline/README.md` and root `README.md` QA-gate sections mention environments (`--env`/`--base`), lanes, bug mode, and judge-visual; the skill table rows stay one-line
- **regression guard — no unrelated churn** — expected: `git diff` on these six files shows only the changes above (no reflows, renames, or drive-by edits)

### Implementation Notes

- **Module(s):** repo metadata + docs
- **Pattern reference:** existing README/CLAUDE.md prose style — short declarative lines; version values read from `plugin.json` per the AGENTS.md two-places rule
- **Key decisions:** A12 (housekeeping bundle; semver minor for new capabilities)
- **Libraries:** none
- **High-risk callouts:** none — every item is grep/jq-verifiable.

### Scope Boundaries

- Do NOT touch CHANGELOG.md (the release-notes skill owns it at release time)
- Do NOT restate the version anywhere the convention says to read it from `plugin.json`
- Do NOT sync to `~/.claude/skills/` in this task (the developer runs `sync-skills.sh push` when ready)
- Only implement the housekeeping slice of the ARCH footprint

### Files Expected

**New files:** _(none)_

**Modified files:**
- `dev-pipeline/skills/execute-qa/skill-additions.md` (deleted — fully applied scratch file)
- `dev-pipeline/.claude-plugin/plugin.json` (version → 6.1.0)
- `.claude-plugin/marketplace.json` (version → 6.1.0)
- `.gitignore` (QA artifact patterns)
- `CLAUDE.md` (structure tree + QA-gate descriptions)
- `dev-pipeline/README.md` (QA-gate sections)
- `README.md` (skill table rows)

**Must NOT modify:**
- `CHANGELOG.md` (release-notes skill's domain)
- Any SKILL.md (T3 owns them)
- `qa-browser.mjs` (T1/T2 own it)
