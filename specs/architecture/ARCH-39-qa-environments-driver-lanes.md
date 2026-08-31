# Architecture: QA Pipeline Upgrade — Environments, Browser Driver, Lanes, Bug Mode, Visual Judgment

> **Date:** 2026-08-31
> **Issue:** #39
> **Phase:** 2 of 5 (System Architecture)
> **Requirements source:** specs/requirements/REQ-39-qa-environments-driver-lanes.md
> **Tasks:** TASKS-39-qa-environments-driver-lanes.md
> **Type:** feature

## Architecture Summary

The upgrade lands in three surfaces: the two QA skill documents (behavior contracts for the
agent), the single-file browser driver `qa-browser.mjs` (the only runtime code), and one
review check file. The driver's central redesign is the removal of the module-global
`current` pointer in favor of per-request context resolution, making lane-parallel command
execution safe; around that, a command-timeout guard, a mandatory selector-prefix
convention, an expanded command set (`wait-for`, `status`, read/assert commands), lifecycle
hardening (signal handlers, disconnect detection, close-on-replace), and a uniform response
envelope (`{ok, cmd, elapsedMs, …}`). Skill-doc changes codify fail-hard environment
preconditions, the new command surface, and the lane execution flow; the plan template
gains the Lanes section and portability markers. No new modules, no new dependencies.

## High-Level Structure

```
plan-qa/SKILL.md + artifact-template.md     (declares: env portability, lanes, bug mode,
        │                                    judge-visual — mostly drafted; template gaps filled)
        │  produces QA-<N>-<slug>.md
        ▼
execute-qa/SKILL.md                         (declares: --env/--base, fail-hard preconditions,
        │                                    lane execution via subagents, verdict tiers)
        │  drives, per [browser] step
        ▼
execute-qa/qa-browser.mjs                   (persistent daemon; one JSON line + exit code
   ┌─────────────┴─────────────┐              per command; per-identity/lane contexts)
   client (thin: POST /cmd)    daemon (http://127.0.0.1:<port>)
   sends {cmd, args, ctx, cwd}  resolves context per request → handler(entry, args)
                                wraps every handler in a timeout guard
                                uniform {ok, cmd, elapsedMs, …} envelope

review/sub-skills/requirement-coverage.md   (amended: + QA Req-column coverage,
                                             + changed-file → REQ-ID trace)
```

What is added vs. modified: **modified** — the two SKILL.mds, plan-qa's artifact template,
`qa-browser.mjs`, `requirement-coverage.md`, docs (CLAUDE.md, both READMEs), `.gitignore`,
both version manifests. **Deleted** — `skill-additions.md`. **New** — nothing.

## Tech Choices

| Area | Decision | Alternatives Considered | Rationale |
|------|----------|-------------------------|-----------|
| Driver runtime | Single `.mjs` file, `node:http` + Playwright | Split into modules; a heavier framework | Single-file is the established pattern for bundled scripts; agents copy it into target projects |
| Concurrency | Per-request context resolution threaded through handler closures | Async mutex serializing all commands | Lanes exist to parallelize; a daemon-level mutex would bottleneck lane 1's operator-handoff verification behind another lane's slow navigation (REQ R14, N2) |
| Fingerprinting | `node:crypto` SHA-256, first 8 hex chars | No fingerprint; full hash | Stdlib only; 8 hex chars is enough to distinguish typos without leaking the value (R24) |
| Timeouts | One env-tunable guard (`QA_CMD_TIMEOUT_MS`, default 30000) around every handler | Per-command-type timeout table | Simplicity; per-type calibration is a false precision for an agent-driven tool (R15) |
| Selector strategy | Mandatory `text=` / `css=` / `role=` prefixes, shared resolver | Keep regex heuristic; default unprefixed to text | Heuristics misclassify real-world strings ("Error. Try again", bare `button`); a loud error costs an agent one retry, a misclassification costs a wrong verdict (R17) |
| Navigation wait | `networkidle` default, `--until load\|domcontentloaded\|networkidle` override | Keep `domcontentloaded`; Playwright default `load` | Most QA targets are client-routed SPAs; the override + timeout guard covers long-polling pages (R22) |
| Path resolution | Client sends its `cwd` in the request body; daemon resolves relative paths against it | Daemon-CWD-relative (status quo); env-var for output dir | The caller is the one who needs to find the file afterward; no extra env plumbing (R19) |

## Patterns & Conventions

- **One JSON line + exit code per command** — the driver's load-bearing contract (N1); every new command follows it, and the response envelope extends it additively (`{ok, cmd, elapsedMs, …}`).
- **Skill docs as behavior contracts** — from CLAUDE.md: imperatives directed at the agent, a "You Must NOT" section, gates before artifacts. All SKILL.md edits follow this register.
- **`{base_directory}` references** — bundled-script paths in skill docs stay runtime-injected, never hardcoded.
- **Declaration skills** — plan-qa/execute-qa bake in nothing project-specific; new commands are documented generically (the step→command mapping table), never as project-specific helper names.
- **Additive-only JSON responses** — new fields, never renamed or removed ones, so existing agent call sites keep parsing.

## Data Models

### Browser Context Entry (in-memory, daemon)

**Purpose:** one identity or lane's isolated browsing state and evidence buffers.

**Key fields:**
| Field | Type / Constraint | Notes |
|-------|-------------------|-------|
| `ctx` | Playwright BrowserContext | Owns cookies/storage; isolation unit for lanes |
| `page` | Playwright Page | One page per context (driver contract) |
| `consoleErrors` | string[] | `console.error` + `pageerror:`-tagged uncaught exceptions |
| `requests` | ring buffer, cap `QA_NET_BUF` (default 200) | `{method, url, status}` per response |

**Lifecycle:** created by `new-context` (explicitly — never implicitly via `--ctx`) → reused by subsequent commands routed by name → replaced by a later `new-context` of the same name (old context **closed**, not leaked) → destroyed at `stop` / daemon exit.

### Environment File (`.env.qa.<name>`, target-project repo root, gitignored)

**Purpose:** per-environment base URL and credentials, resolved at run time.

**Key fields:** `QA_BASE_URL` (required), `QA_USER_*` / `QA_PASS_*` style credential pairs per logical identity (required when the plan references them via `env:NAME`).

**Lifecycle:** authored by the developer per environment → loaded by `/execute-qa --env <name>` at precondition time → never read into plans, results, or transcripts.

## API Contracts / Interfaces

### qa-browser daemon

**Boundary:** internal module — HTTP on `127.0.0.1:<port>` (loopback only, documented threat model), consumed solely by the bundled client path of the same file.

**Transport contract:** `POST /cmd` with `{cmd, args, ctx?, cwd}`; response is one JSON line
`{ok, cmd, elapsedMs, …payload}`; client exits 0/1 on `ok`. Request bodies > ~1MB are
rejected. On `ok:false` (outside the `NO_AUTOSHOT` set), the daemon attaches an absolute
`screenshot` path.

**Operations (new/changed only; unchanged commands keep their shapes):**

| Method/Op | Path / Signature | Purpose | Errors / Returns |
|-----------|------------------|---------|------------------|
| `goto` | `goto <url> [--until load\|domcontentloaded\|networkidle]` | Navigate; default wait `networkidle` | timeout guard; `relative url but no --base` |
| `wait-for` | `wait-for <target> [--until networkidle]` | Wait for `text=`/`css=`/`role=` target or network idle | timeout; unprefixed target → usage error |
| `type` | `type <target> <text>` | Per-character typing (no clear-first) | as `fill` |
| `expect-text` | `expect-text <target> <expected>` | Assert element/page text content | `{ok:false, expected, actual}` |
| `get-attr` | `get-attr <css=…> <attr>` | Read an attribute value | `{ok, value}` |
| `count` | `count <target>` | Element match count for disambiguation | `{ok, count}` |
| `expect-request` | `expect-request <method> <urlPattern> [status]` | Assert a matching request was captured | `{ok:false, …}` with recent requests excerpt |
| `route list` | `route list` | Introspect active mocks/aborts on the context | `{ok, routes[], count}` |
| `status` | `status` | Daemon liveness: contexts + URLs, pid, headed, base, port, browser-connected | always `ok:true` when daemon alive |
| `new-context` | `new-context <name> [state]` | Create identity context; closes any same-name predecessor | `no saved state "<name>"` |
| `stop` | `stop` | Final command; daemon marks stopping, responds, closes browser, exits | late commands → `daemon stopping` |
| all target-taking commands | `click/fill/press/assert-visible/expect-text/count/wait-for` | Require `text=`/`css=`/`role=` prefix | unprefixed → error naming the convention |
| `--ctx <name>` | flag on any command | Route to existing context | unknown name → error naming `new-context` fix |
| `--port <n>` | flag on client and `serve` | Override `QA_BROWSER_PORT`/8787 | — |

**Auth requirements:** none (loopback binding is the boundary; threat model documented in the script header).

### execute-qa skill contract (prose, agent-enforced)

- **Preconditions (fail-hard):** before any case runs — the `.env.qa.<name>` file exists, every `env:NAME` referenced by the plan resolves in the environment, and the base URL answers; any failure stops the run naming exactly what is missing and how to fix it (R10).
- **Lane flow:** one subagent per lane; each lane's first browser command is `new-context <identity>`; every later command carries `--ctx <lane>`; the parent merges per-lane results into QA-RESULTS in case-ID order with a per-lane run-header line (R12).
- **Production guard:** documented prohibition, agent-enforced — never run against production or any environment sharing production data stores (R8, REQ Decision 4).

## Module Boundaries

| Module / Package | Responsibility | Allowed Dependencies |
|------------------|----------------|----------------------|
| `execute-qa/qa-browser.mjs` | All browser automation: daemon, client, contexts, evidence capture | `node:*` stdlib, `playwright` |
| `execute-qa/SKILL.md` | Executor behavior: preconditions, verdicts, lane orchestration, command mapping | References the driver by `{base_directory}`/copy-into-target convention |
| `plan-qa/SKILL.md` + `artifact-template.md` | Plan authoring: entry modes, lanes, verdict tiers, portability rules | None (prose) |
| `review/sub-skills/requirement-coverage.md` | Traceability check criteria and output format | `_protocol.md` |

The daemon never writes to specs/ artifacts; the executing agent owns QA-RESULTS. The driver knows nothing about plans, lanes-as-case-groups, or verdicts — it only knows contexts and commands.

## Change Footprint

_Produced during the Phase D2 walk; confirmed by the developer._

### New files / modules

None. (The specs artifacts for this issue — REQ, this ARCH, TASKS — are pipeline outputs, not product files.)

### Modified files / modules

| Path | What changes here |
|------|-------------------|
| `dev-pipeline/skills/execute-qa/qa-browser.mjs` | Per-request context resolution (delete `current` global); timeout guard; prefix resolver; `networkidle` default + `--until`; new commands (`wait-for`, `status`, `type`, `expect-text`, `get-attr`, `count`, `expect-request`, `route list`); close-on-replace in `new-context`; signal handlers + disconnect detection; usage-exit on bad flags; clean `stop`; absolute screenshot paths via client `cwd`; client `--port`; `{ok, cmd, elapsedMs}` envelope + `count`s; literal-fill fingerprint; `pageerror` capture; body size cap; env-configurable network buffer; header docs (env vars, banner, threat model, eval limits) |
| `dev-pipeline/skills/execute-qa/SKILL.md` | Fail-hard environment preconditions (R10); step→command table gains new commands + prefix convention; env-var enumeration block (R25); lane flow starts with `new-context` |
| `dev-pipeline/skills/plan-qa/artifact-template.md` | Add Lanes section, `[bash local-only]` tagging, `Req` column (pipeline mode), `[judge-visual]` among Expected tiers |
| `dev-pipeline/skills/plan-qa/SKILL.md` | Drift-check against R1–R6; edit only where the draft mismatches the REQ |
| `dev-pipeline/skills/review/sub-skills/requirement-coverage.md` | Add mechanical passes: QA-plan `Req`-column coverage; changed-file → REQ-ID trace with scope-creep finding |
| `dev-pipeline/.claude-plugin/plugin.json` | `version` 6.0.0 → 6.1.0 |
| `.claude-plugin/marketplace.json` | `plugins[0].version` 6.0.0 → 6.1.0 |
| `CLAUDE.md` | Structure tree lists `qa-browser.mjs`; execute-qa/plan-qa descriptions mention environments/lanes/bug mode/judge-visual |
| `dev-pipeline/README.md` | QA gate sections updated for environments, lanes, bug mode, judge-visual |
| `README.md` | Skill table rows for plan-qa/execute-qa updated |
| `.gitignore` | Add `.env.qa.*`, `.qa-state/`, `.qa-shots/` |

### Deleted / replaced

| Path | Reason |
|------|--------|
| `dev-pipeline/skills/execute-qa/skill-additions.md` | Authoring scratch file; all sections applied (REQ R27) |

### Touched but not changed (silent-regression hotspots)

| Path | Why it matters |
|------|----------------|
| `review/SKILL.md` | Already lists 17 checks incl. requirement-coverage — verify no edit needed after the check-file amendment |
| `review/sub-skills/_protocol.md` | Shared protocol all checks read; the coverage amendment must stay consistent with its tracing rules |
| `implement/SKILL.md`, `generate-tasks/SKILL.md` | Reference the QA gate generically — wording must remain true after the upgrade |
| `dev-pipeline/skills/archive-issue/SKILL.md` | Retires QA artifacts; QA file naming unchanged, so no edit — verify |
| Existing serial single-lane usage of the driver | The no-`--ctx` path (default context auto-create) must behave exactly as before |

## Areas of Impact

| Area | Impact | Risk (L/M/H) | Why |
|------|--------|--------------|-----|
| `qa-browser.mjs` | CLI contract consumed by agent executors; only runtime artifact | **H** | A regression here breaks every `[browser]` step of every future QA run |
| `execute-qa/SKILL.md` | Executor behavior contract (preconditions, lanes, verdicts) | **M** | Prose drift changes agent behavior in target projects |
| plan-qa template | Shape of all future QA plans | **M** | Missing Lanes/Req-column sections would silently produce non-compliant plans |
| requirement-coverage check | Review output format gains rows | **L** | Additive; orchestrator dispatch untouched |
| Docs + manifests | Descriptions, versions | **L** | Marketplace metadata only |

**Contract changes:** the driver's JSON responses gain `cmd`/`elapsedMs`/`count` fields (additive); target-taking commands now *require* prefixes (breaking for any plan written against the heuristic — none exist outside this branch, as the driver ships first in this release); `--ctx` on an unknown context now errors instead of auto-creating (breaking within the same not-yet-released surface). No contract consumed by a shipped release changes.

**Cross-cutting ripples:** version bump (both manifests, repo convention); `.gitignore` additions; target-project guidance (`.env.qa.*` gitignore requirement) documented in execute-qa.

## Cross-Cutting Concerns

- **Errors:** driver failures → `{ok:false, error, cmd, elapsedMs}` + exit 1 + auto-screenshot (absolute path); skill-level environment failures stop at preconditions with the fix named; structural plan errors flagged, never improvised around.
- **Logging & metrics:** one JSON banner line on listen (documented for consumers); per-command `cmd` + `elapsedMs` echo for log correlation; per-context console-error and network buffers are the evidence store; `status` for crash recovery.
- **Auth / authz:** loopback-only binding is the security boundary; production guard is a documented, agent-enforced prohibition (no mechanical gate).
- **Performance:** per-command timeout guard; capped network ring buffer (`QA_NET_BUF`); lanes parallelize at subagent level with genuinely concurrent contexts.
- **Security:** credentials live only in gitignored env files, flow as `env:NAME` references, never echoed; literal fills return length + 8-hex fingerprint; request bodies size-capped; `eval` documented as last resort.
- **Migrations / rollout:** version bump 6.0.0 → 6.1.0 in both manifests; no migration — serial single-lane plans run unchanged; no persistent state outside gitignored dirs.

## Architecture Decisions Log

| # | Decision | Alternatives | Chosen Because | Satisfies REQs |
|---|----------|--------------|----------------|----------------|
| A1 | Per-request context resolution; `current` global deleted; contexts created only via `new-context`; unknown `--ctx` errors loudly | Async mutex serializing all commands | Daemon-level serialization would bottleneck the lanes feature this issue ships | R14, N2 |
| A2 | Single env-tunable timeout guard around every handler (`QA_CMD_TIMEOUT_MS`, 30s) | Per-command-type timeout table | Simplicity; per-type calibration is false precision here | R15 |
| A3 | `goto` defaults to `networkidle` with `--until` override | Keep `domcontentloaded`; `load` | SPA-safe default; override + guard covers long-polling pages | R22 |
| A4 | Mandatory `text=`/`css=`/`role=` prefixes via one shared resolver; unprefixed = hard error | Keep heuristic; default-to-text | Loud, self-correctable failure beats silent misclassification | R17 |
| A5 | Client sends `cwd`; daemon resolves/returns absolute screenshot paths | Daemon-CWD-relative; env output dir | The caller must find the file; no extra env plumbing | R19 |
| A6 | Add `wait-for`, `status`, `type`, `expect-text`, `get-attr`, `count`, `expect-request`, `route list`; no `eval-file` | `eval` for everything; batch mode | Covers agent-ergonomics gaps while `eval` stays the documented last resort | R16, R18, R21, R25 |
| A7 | Lifecycle hardening: close-on-replace, SIGINT/SIGTERM handlers, disconnect detection, usage-exit, clean `stop` | Status quo | Orphaned browsers and hung commands are the top crash-recovery costs for an agent | R18 |
| A8 | Uniform `{ok, cmd, elapsedMs, count?, …}` envelope | Per-command ad-hoc shapes | Correlation between agent log and daemon state without guessing | R23 |
| A9 | Fingerprinted literal fills; 127.0.0.1 threat-model comment; 1MB body cap; client `--port` | Status quo | Debuggable without leaking; loopback boundary documented; flag parity | R24, N3 |
| A10 | Fail-hard environment preconditions in execute-qa prose | Skip-affected-cases and continue | A QA run that silently half-ran is worse than no run (REQ Decision 5) | R10 |
| A11 | Amend `requirement-coverage.md` with the two mechanical passes; no rename, no new file | Create `requirements-traceability.md`; rename | The check exists; the issue's name drifted from the implementation (REQ Decision 3) | R26 |
| A12 | Housekeeping: delete `skill-additions.md`, bump both manifests to 6.1.0, gitignore QA artifact dirs, sync CLAUDE.md/READMEs, fill plan-qa template gaps | Ship without docs sync | Repo convention (two-version rule); template gaps would produce non-compliant plans | R27, R28 |

## Risk & Stress-Test Scenarios

### Forward — runtime failure scenarios

| Scenario | How the Design Handles It |
|----------|---------------------------|
| Two lanes issue commands simultaneously | Per-request context resolution; evidence buffers live on the context entry; no shared mutable pointer (A1) |
| `goto` hits a long-polling page that never idles | Timeout guard fails the command at 30s with a diagnostic; agent retries with `--until load`; daemon stays responsive (A2, A3) |
| Browser process crashes mid-run | `disconnected` handler marks the daemon dead; later commands fail fast with "browser gone — restart daemon"; `status` reports state (A7) |
| Daemon killed via Ctrl-C / parent death | Signal handlers close the browser; no orphaned process (A7) |
| Credential referenced but absent | Precondition hard-stop naming the missing `env:NAME` (A10); daemon-side `expandEnv` already throws |
| Rollback after merge | Revert PR → 6.0.0 behavior; no persistent state outside gitignored dirs |

### Backward — regression risk per touched area

| Touched area | What could regress | How we'd know / mitigation |
|--------------|--------------------|----------------------------|
| `qa-browser.mjs` serial path | No-`--ctx` clients | Default context auto-create preserved; additive response fields only |
| `qa-browser.mjs` navigation | Plans relying on fast `domcontentloaded` return | None shipped pre-6.1.0; `--until` override + timeout guard |
| `execute-qa/SKILL.md` lane flow | Multi-lane plans assuming implicit context creation | Multi-lane is new in this release; doc updated to `new-context`-first |
| `requirement-coverage.md` | Orchestrator dispatch / report format | Additive output rows; `_protocol.md` consistency re-verified during implementation |
| plan-qa template | Existing plans' shape | Template only shapes *future* plans; existing `QA-*.md` files untouched |

## Open Questions

- Calibration values: `QA_CMD_TIMEOUT_MS` default (30s), network buffer cap (200), body cap (~1MB).
  - **Impact if unresolved:** none — any reasonable default satisfies the REQ.
  - **Suggested default:** the values above, documented as env-tunable.

## Out of Scope

- Batch command mode, `/health` HTTP endpoint, request timing in `network` (reason: issue Comment 2 §7, explicitly deferred)
- Mechanical production-URL blocking (reason: REQ Decision 4 — documented prohibition only)
- A dedicated proving run against a demo or real app (reason: REQ Decision 6 — verified on first real use)
- Renaming `requirement-coverage.md` (reason: REQ Decision 3)
- Changes to other pipeline phases beyond the QA pair and review check
