# Requirements: QA Pipeline Upgrade — Environments, Browser Driver, Lanes, Bug Mode, Visual Judgment

> **Date:** 2026-08-31
> **Issue:** #39
> **Type:** feature
> **Source:** specs/context/39.md (GitHub issue #39, including both review comments)
> **Phase:** 1 of 5 (Requirement Engineering)

## Summary

Upgrade the QA pair (`/plan-qa` + `/execute-qa`) from a local-only, serial, DOM-assert-only
workflow into an environment-portable, parallelizable one with a persistent browser driver,
a bug-reproduction planning mode, and a visual-judgment verdict tier — and harden the
`qa-browser.mjs` driver against the failure modes an AI agent will actually hit (hangs,
races, silent mis-routing, flaky waits). This document consolidates the issue body, both
review comments, and the current branch state; it is the final contract implementation
proceeds from.

## Problem & Motivation

Today QA plans hardcode `localhost`, `[browser]` steps lean on ad-hoc Playwright calls with
no session persistence, runs are strictly serial, rendering bugs have no verification tier,
and a bug fix has no dedicated planning path. On top of that, two code reviews of the
already-drafted driver found it ship-quality for serial use but unsafe for the parallel
lanes this issue introduces (a shared `current` pointer races across lanes), prone to
indefinite hangs (no command timeout), and missing the commands (`wait-for`, `status`,
uncaught-exception capture) that separate a usable agent driver from a flaky one.

Who benefits: developers running the pipeline (faster, portable, more trustworthy QA runs)
and the AI agents executing the skills (a driver whose commands, errors, and evidence are
unambiguous). If we don't do the driver hardening, the lanes feature ships with a known
race that can cross-wire evidence between lanes — the exact failure QA exists to catch.

## Users & Consumers

- **Developer operating the pipeline** — plans and runs QA against any environment; needs trustworthy verdicts and clear failure messages.
- **AI agent executing `/plan-qa` and `/execute-qa`** — the driver's primary user; needs unambiguous commands, machine-readable responses, and no silent failure modes.
- **Reviewer / teammate reading QA-RESULTS** — needs per-lane evidence that cannot be cross-contaminated, and screenshots attached to visual verdicts.

## Functional Requirements

Each requirement is specific, testable, and assigned an ID for traceability.

### plan-qa

| ID  | Requirement | Acceptance Criterion |
|-----|-------------|----------------------|
| R1  | Bug mode: third entry mode accepting both `/plan-qa bug #123` and `/plan-qa bug "<description>"`; one short repro interview; plan = the repro case (asserting the *fixed* behavior) + regression smoke over the Coverage Map | Running `/plan-qa bug "Save button does nothing"` produces a plan containing exactly one repro case whose Expected lines assert the fixed behavior (broken behavior falsifiably absent) plus regression-smoke cases derived from the Coverage Map |
| R2  | Environment portability: every `[browser]` navigation target written relative to `$BASE` | A plan authored for local runs unchanged against a remote base URL; an absolute URL in a step is flagged as a plan error unless the case documents why it targets an external surface |
| R3  | `[bash local-only]` tagging with remote-equivalent Guards | A local-only step carries the tag and, where a remote equivalent exists, a `Guard:` naming it |
| R4  | Logical identities with credentials from the run env file, never from the plan | The plan's Identities section names accounts logically (e.g. `qa-member`); grep of the plan finds no literal credentials |
| R5  | Lanes decided at plan time: collision rules (shared identity, mutable state, throttles, resets force same-lane), lane 1 pinned for operator handoffs and log correlation, a Lanes section (lane → identities → case IDs → why separate), and a Readiness Gate line enforcing isolation | A plan with a lane collision (two cases sharing an identity) places them in the same lane; the Readiness Gate rejects a plan where an identity or mutable state appears in more than one lane |
| R6  | `[judge-visual]` tier: screenshot-based judgment with a written pass/fail criterion and optional design reference | Every `[judge-visual]` line in a produced plan carries an explicit `pass if <criterion>`; a line without one is rejected at the plan's Readiness Gate |

### execute-qa

| ID  | Requirement | Acceptance Criterion |
|-----|-------------|----------------------|
| R7  | `--env <name>` / `--base <url>` flags; `.env.qa.<name>` files (gitignored); no flag defaults to `--env local`; resolved base URL and env name recorded in the QA-RESULTS run header | Running with `--env staging` loads `.env.qa.staging`; the run header of the results artifact shows the resolved base URL and env name |
| R8  | Production guard: never run against production or any environment sharing production data stores (documented prohibition, agent-enforced) | The skill's You-Must-NOT section carries the rule; an agent asked to run against a production URL refuses and says why |
| R9  | `[bash local-only]` steps against a remote base are recorded SKIPPED with the reason | A run against a remote base records each local-only step as SKIPPED with "local-only" as the reason, unless its Guard names a remote equivalent |
| R10 | Environment failures fail hard: missing `.env.qa.<name>`, missing `env:NAME` credential, or unreachable base URL stops the run at precondition stage | Each failure aborts before any case executes, with a message naming exactly what is missing/unreachable and how to fix it |
| R11 | Browser driver: persistent headed daemon; one JSON line + exit code per command; documented step→command mapping; one context per identity; `env:NAME` secret substitution (literal credential in a command is a run error); auto-screenshot on failure; log-correlation pattern | A serve → commands → stop sequence executes end-to-end; every command emits exactly one JSON line and exits 0/1; a failed command leaves a screenshot in the shots directory |
| R12 | Lane execution: one subagent per lane, every command carrying `--ctx <lane>`; isolated cookies/storage plus per-lane console-error and network buffers; parent merges results into QA-RESULTS in case-ID order with a per-lane run-header line | A two-lane plan runs its lanes in parallel subagents; the merged results contain each lane's evidence only under its own cases (no cross-lane console/network entries) |
| R13 | `[judge-visual]` verdicts judged from the captured screenshot, path recorded as evidence; missing screenshot is a structural plan error | A `[judge-visual]` case's verdict in QA-RESULTS quotes the screenshot path; a case with no captured screenshot is flagged as a plan error, not judged |

### qa-browser.mjs driver hardening (from the issue's review comments)

| ID  | Requirement | Acceptance Criterion |
|-----|-------------|----------------------|
| R14 | Concurrency safety: simultaneous requests with different `--ctx` values cannot cross-wire the active context or auto-screenshot attribution (serialize or isolate per-request state); an unknown `--ctx` lane name fails loudly | Two overlapping lane commands each execute against their own context; `--ctx <typo>` returns a non-zero exit with an unknown-lane error instead of silently creating a fresh context |
| R15 | No command hangs the daemon indefinitely: a duration guard on every command; on expiry the command fails with a diagnostic and the daemon stays responsive | A stuck navigation or never-resolving `eval` returns a timeout error within the guard window; a subsequent command succeeds |
| R16 | `wait-for` command covering selector, text, and network-idle waits | A step that waits for a late-rendered element succeeds via `wait-for` without bash sleep loops or retry polling |
| R17 | Explicit target prefixes (`text=` / `css=` / `role=`) for visibility and interaction commands; no heuristic guessing | `assert-visible "css=.error"` and `assert-visible "text=Error. Try again"` both classify correctly; the heuristic regex is gone |
| R18 | Lifecycle hygiene: `new-context` closes the context it replaces; `status` command reports liveness, contexts, and configuration; signal handlers tear down the browser on Ctrl-C / parent death; unknown `serve` flags print usage; browser-process death is detected (health check) rather than hanging every command | Repeated `new-context` calls leave one live context per name; `status` on a running daemon returns contexts/URLs/port; killing the daemon leaves no orphaned browser process |
| R19 | Screenshot paths resolve to absolute and are returned absolute | A `screenshot` command's JSON response contains an absolute path the caller can open regardless of daemon CWD |
| R20 | Uncaught page exceptions (`pageerror`) are captured alongside console errors | A page throwing an uncaught exception surfaces it in the error listing, not only `console.error` calls |
| R21 | Read/assert commands an agent needs to avoid `eval`: `expect-text` / attribute reads, element count / nth disambiguation, `expect-request` (method + URL pattern + optional status), `route list` | An agent can verify "the count is N", "request POST /login returned 302", and "what is currently mocked" without issuing `eval` |
| R22 | Navigation waits default to network-idle rather than DOM-content-loaded | A `goto` against a client-routed page returns after network idle (subsequent assertions see the rendered route) |
| R23 | Response-shape convention: every command returns `{ok, ...}` plus a command echo and elapsed milliseconds; listings include a count | Any two commands' responses follow the same shape; a failing command can be correlated to its call from the response alone |
| R24 | Secret & safety handling: literal `fill` echoes include value length and a short fingerprint; `eval` documented as last-resort escape hatch; loopback-only binding documented as the threat model; HTTP request bodies size-limited | A literal fill's response contains length + fingerprint (never the value); the script header states 127.0.0.1-only; an oversized request body is rejected |
| R25 | Driver documentation complete: all environment variables enumerated in one place; the startup-banner convention (first stdout line is JSON) documented; the `eval` whitespace limitation documented | A reader of the skill + script header can enumerate every env var, knows to skip the banner line, and knows `eval` collapses whitespace |

### review (traceability check)

| ID  | Requirement | Acceptance Criterion |
|-----|-------------|----------------------|
| R26 | Requirements-traceability check — **satisfied by the existing `requirement-coverage.md` (check #17)**; no new file, no rename. Verify it performs both passes the issue specifies: mechanical (every REQ-ID covered by ≥1 QA case / test / TASKS verification; every changed file traces to ≥1 REQ-ID) and semantic (per acceptance criterion VERIFIED / WEAK / UNCOVERED with verbatim quoted evidence) | Running `/review` on a pipeline branch with an orphan REQ-ID produces an UNCOVERED finding naming that REQ-ID; check-count references read 17 consistently |

### Housekeeping

| ID  | Requirement | Acceptance Criterion |
|-----|-------------|----------------------|
| R27 | Remove `execute-qa/skill-additions.md` (authoring scratch file; fully applied) | File absent from the tree |
| R28 | Version bump 6.0.0 → 6.1.0 (minor, feat) in both `dev-pipeline/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` | Both files read 6.1.0 |

## Non-Functional Requirements

| ID  | Requirement | Acceptance Criterion |
|-----|-------------|----------------------|
| N1  | Agent-drivability: every driver interaction is scriptable by an LLM without human interpretation — single JSON line per command, exit codes for verdicts, explicit prefixes over heuristics | An agent can execute a full case from the documented command set without free-form parsing |
| N2  | Evidence integrity under parallelism: lanes cannot read, drain, or overwrite each other's console/network buffers, cookies, or screenshots | In a multi-lane run, every evidence artifact in QA-RESULTS is attributable to exactly one lane |
| N3  | Secret hygiene: credentials never appear in plans, command echoes, results artifacts, or screenshots metadata | Grep of plan, results, and daemon output for a credential value finds nothing |

## Behaviors & Domain Rules

**Plan-time vs run-time split.** Parallelism is a *plan-time* decision (lanes, collision
rules, isolation gate); environment choice is a *run-time* decision (`--env` / `--base`).
A plan written once must run against any compatible environment unchanged.

**Lane 1 is special.** Operator handoffs and log-correlation cases are always pinned to
lane 1 (the serial lane), because a human-in-the-loop step and offset-based log slicing
cannot survive parallel execution.

**The repro is the requirement.** Bug mode has no specs; the plan asserts the *fixed*
behavior, and the broken behavior must be falsifiably absent — a repro that would pass on
the broken build is worthless.

**Verdict tiers are confidence levels, not decorations.** `[assert]` is binary;
`[judge]` / `[judge-visual]` quote evidence and escalate ambiguity to PARTIAL — never a
guessed PASS. A judged pass and an asserted pass remain distinguishable in results.

**Why these rules matter:**
- Relative URLs + logical identities are what make one plan runnable across environments — hardcoding either silently re-couples the plan to localhost.
- The concurrency rules exist because the lanes feature is *the* reason the driver's shared-state race (R14) is in scope: shipping lanes without it ships a known evidence-corruption bug.
- Fail-hard environment errors (R10) prevent the worst QA outcome: a green-looking run that silently skipped its preconditions.

**Common mistakes:**
- Treating the production guard as a URL-pattern problem — it is a documented prohibition the agent enforces; no mechanical block exists (Decision 4).
- Writing `[judge-visual]` lines without a criterion, or judging without opening the screenshot.
- Letting a lane subagent issue a command without `--ctx`, which would touch the shared active context.
- Re-adding a `requirements-traceability.md` file — the check already exists as `requirement-coverage.md` (Decision 3).
- Using `eval` where R21's read/assert commands suffice — `eval` is the documented last resort.

## Edge Cases & Failure Modes

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| `--env <name>` with no `.env.qa.<name>` file | Hard stop at preconditions, naming the missing file and how to create it | A run that half-ran looks green and isn't (Decision 5) |
| `env:NAME` credential absent from the env file | Hard stop naming the missing variable | Same as above |
| Base URL unreachable | Hard stop at preconditions naming the URL | Same as above |
| Base URL is production / shares production data stores | Agent refuses to run; documented prohibition | Decision 4 — prose rule, no mechanical gate |
| Two cases share an identity or mutable state | Plan-time: same lane (or plan stays single-lane); Readiness Gate rejects cross-lane sharing | Parallel state mutation corrupts evidence |
| `[judge-visual]` case with no captured screenshot | Structural plan error — flagged, never judged | Judging without the image is guessing |
| Bug cannot be reproduced during the bug-mode interview | `/plan-qa` stops and clarifies with the developer rather than inventing repro steps | The repro is the requirement; a fabricated one is worse than none |
| Concurrent lane requests reach the daemon | Serialized or isolated per-request — no cross-wiring of context or auto-shot attribution | R14; the known race |
| Command hangs (stuck navigation, never-resolving `eval`) | Duration guard fails the command with a diagnostic; daemon stays responsive | R15 |
| `--ctx` with a typo'd lane name | Loud non-zero error, not a silent fresh context | Silent mis-laning produces unattributable evidence |
| Browser process dies mid-run | Detected via status/health check; commands fail fast rather than hang | R18 |
| Daemon killed (Ctrl-C / parent death) | Signal handlers tear down the browser; no orphaned process | R18 |
| Literal `fill` value echoed | Response carries length + short fingerprint only | Debuggable without leaking the value |

## Decisions Log

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|-------------------------|----------------|
| 1 | This REQ is the consolidated contract: issue body + both review comments + current branch state merged into one doc | Implement from the issue and comments separately | The sources have drifted; one doc eliminates ambiguity for Phase 2 |
| 2 | Review-comment items in scope, excluding Comment 2 §7 (batch mode, `/health` endpoint, request timing) | (a) blockers only (#2, #7, #11); (c) everything incl. §7 | The lanes feature is unsafe without the race fix; §7 was marked out of scope by its own author |
| 3 | No new traceability sub-check — the issue's `requirements-traceability.md` is already delivered as `requirement-coverage.md` (check #17); REQ annotates it satisfied-by-existing | Rename the file to match the issue; build a second check | The functionality exists; renaming/re-doing is churn |
| 4 | Production guard stays a documented prohibition, agent-enforced | Mechanical URL-pattern block with override | Consistent with how the skill's other rules work; no code gate to false-positive on legitimate hosts |
| 5 | Environment failures (missing env file, missing credential, unreachable base) fail hard at preconditions | Skip affected cases and continue | A QA run that silently half-ran is worse than no run |
| 6 | No proving surface: ACs written as capability contracts, exercised on first real use | Throwaway demo app; a real project as proving ground | This repo has no app to QA; a demo adds sprint cost without product value |
| 7 | Version bump 6.0.0 → 6.1.0 in both `plugin.json` and `marketplace.json` | Patch bump; major bump | New capabilities = minor per semver; repo convention requires both files move together |
| 8 | Bug mode accepts both `/plan-qa bug #123` and `/plan-qa bug "<description>"` | Issue-ref only | Matches the issue AC and the already-drafted skill text |

## Scope Boundaries

### In Scope
- plan-qa: bug mode, environment portability, lanes, `[judge-visual]`
- execute-qa: environment flags + env files, production guard (documented), SKIPPED local-only steps, fail-hard environment errors, browser driver lifecycle, lane execution, `[judge-visual]` verdicts
- qa-browser.mjs hardening: R14–R25 (concurrency race, timeout guard, `wait-for`, explicit prefixes, lifecycle/status/signals, absolute screenshots, `pageerror`, read/assert commands, network-idle default, response-shape convention, secret handling, documentation)
- review: verify the existing `requirement-coverage.md` check performs the issue's mechanical + semantic passes (R26)
- Housekeeping: remove `skill-additions.md`, version bump to 6.1.0

### Out of Scope
- Batch command mode, `/health` HTTP endpoint, request timing in `network` (reason: Comment 2 §7, explicitly deferred by the issue author)
- Mechanical production-URL blocking (reason: Decision 4 — documented prohibition only)
- A dedicated proving run against a demo or real app (reason: Decision 6 — verified on first real use)
- Renaming `requirement-coverage.md` (reason: Decision 3)
- Any changes to the other pipeline phases (plan-requirements, plan-architecture, generate-tasks, implement) beyond what the QA pair and review touch

## Open Questions

- None blocking. The exact duration-guard window (R15), network-buffer caps, and request-body size limit (R24) are calibration values left to plan-architecture.
  - **Impact if unresolved:** none — any reasonable default satisfies the requirement.
  - **Suggested default:** pick conservative defaults in Phase 2 and document them as tunable.

---
_This requirements document is the input for the **plan-architecture** skill._
_Next step: `/plan-architecture from: specs/requirements/REQ-39-qa-environments-driver-lanes.md`_
