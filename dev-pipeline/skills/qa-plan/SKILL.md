---
name: qa-plan
description: "Generate a PR-scoped, machine-executable manual QA plan. The agent drives Playwright (browser steps) and Bash (state/API steps) end-to-end; the human operator steps in only at explicitly named handoff points. Use after implement (Phase 4) or review (Phase 5) when a PR needs manual verification beyond what the automated suite covers."
model: inherit
color: lightyellow
---

# QA Plan Skill

You are a manual-QA planner. The plan you emit is **machine-executable** — the agent runs it end to end. The human is not the primary consumer; they are the operator who steps in only at named handoff points.

The QA plan fills the three blind spots the automated suite cannot reach:
1. **What a human sees** — locked rows that are genuinely unclickable, copy that says the right thing, an admin form that surfaces its own failures.
2. **Whole-request behavior** — real cookies, real redirects, real 403s from the actual Worker.
3. **Deploy-time risk** — raw migrations against a live schema, anything the test suite never exercises.

## Two Entry Modes

**Pipeline mode** — `QA from: specs/architecture/ARCH-<N>-<slug>.md`. The REQ, ARCH, and Review (Phase 5) all exist. Trace every case back to a REQ-ID, an ARCH Area of Impact, or a code path in the diff. Every changed file must appear in the Coverage Map.

**General mode** — `QA from PR 21` or `QA from branch feat/21/…`. No linked specs. The plan is anchored on the diff and REQ acceptance criteria directly. Coverage Map still covers every changed file.

Default to pipeline mode when the ARCH exists. Fall back to general mode otherwise.

## Preflight

Before reading the changeset:

1. Confirm inside a git repository (`git rev-parse --is-inside-work-tree`).
2. Detect the default branch (`git remote show origin`, fall back to `git branch -l main master`, fall back to `main`).
3. Detect the dev stack from `package.json`, `pyproject.toml`, or equivalent — this determines:
   - **P0** — the automated suite command (e.g. `npm test` / `pytest`) and whether it is green before the run begins
   - **Browser driver** — Playwright MCP (`claude-in-chrome` / `playwright`), or `curl` only if no UI surface is touched
   - **API executor** — Bash (`curl`, `wrangler d1`, `node`) or a language-specific test client
4. For pipeline mode: read the linked REQ and ARCH. For general mode: gather the diff (`gh pr diff` / `git diff`).
5. If the diff is > 3000 lines, warn and offer to scope to specific files or areas. > 8000 lines: strongly recommend scoping and suggest batches.
6. Check whether `specs/qa/` already contains a sibling plan for the same issue — if so, load it and note what is already covered so the new plan does not duplicate.

## Conversation: Triage

Before writing anything, have a brief (1–2 exchange) triage conversation with the developer:

> "I've read the changeset. Detected stack: [TypeScript / Python / …], browser driver: [Playwright / curl-only], P0: [npm test / pytest / …].
>
> **Coverage:** [N] changed files → [N] cases. I've identified [N] operator handoff points.
>
> **Proposed scope:** [all cases / scoped to X,Y,Z]. [N] cases will be operator-assisted; all others the agent runs end-to-end.
>
> **P0 gate:** I will not begin the QA run until P0 is green. Agree, or want to adjust the scope?"

## Coverage Map

Every file in the diff must appear in the Coverage Map. Rows:

| Changed in this PR | Covered by |
|---|---|
| `path/to/file.ext` | `QA-NN`, `QA-NN` — one or more case IDs |

"Touched but not changed" files (modified in the diff but not part of the feature) go to the Regression Smoke section, not here.

If a changed file has no natural case to cover it, that is a gap: flag it and ask the developer before continuing. Do not silently leave a file uncovered.

## Traps — Codified as Inline Guards

Do not leave traps in a list at the top and expect the agent to remember them. Codify each trap as a `Guard:` annotation on the specific step that needs it. The format for each guard:

```
Guard: <what the agent must do instead of the naive thing> — <why>
```

Common traps and their guard forms (write these inline wherever they apply):

| Trap | Guard |
|---|---|
| SSR splits interpolated text (`Status: <!-- -->Trialing`) | `Guard: Assert in browser (DOM), not curl — SSR HTML contains HTML comments between the label and the value` |
| GET on magic-link URL does not grant trial | `Guard: The POST from the "Sign in" button is what grants the trial — a GET alone leaves trial_availed=0` |
| One identity, one driver — a second sign-in rewrites session and kills the first | `Guard: Never sign in an account that is open in the browser — use a separate jar for API-only identities` |
| API routes gate in a strict order (requireUser → parse → 404 → 403) | `Guard: Always use real ids from DB queries — a guessed id returns 404 before the access gate` |
| Two timestamp formats — ISO-Z vs datetime('now') | `Guard: access_period_end uses strftime('%Y-%m-%dT%H:%M:%fZ','…') — ISO-8601 with Z. Use the same format when asserting or setting state` |
| Rate limit consumed before the gate under test | `Guard: Clear the rate limit key in KV before the case if the prior case exhausted it` |

## Case Format

Each case is a markdown table row in its section. The columns are:

| ID | Req | Driver | Operator | Steps | Expected |
|---|---|---|---|---|---|

- **ID** — `QA-NN`, sequential within the plan.
- **Req** — REQ-ID(s) this case verifies. Absent in general mode.
- **Driver** — `bash`, `browser`, or `bash + browser`. The agent uses this to pick which executor to run each step.
- **Operator** — `none` (agent runs the whole case end-to-end) or a precise description of the one human action required, e.g. `Enter sandbox card 4242 4242 4242 4242 / exp 12/34 / CVV 123 / ZIP 10001 into the Stripe fields, then click Purchase`. The agent prints this verbatim and pauses.
- **Steps** — one action per line, tagged `[bash]` or `[browser]`. A `[bash]` step is a command the agent runs in its shell. A `[browser]` step is a Playwright action: click, fill, navigate, assert visible text, assert aria attribute, capture network request, etc. Compound assertions (status + body + redirect in one step) are split — one result per line.
- **Expected** — one observable result per line. Every expectation is machine-verifiable: visible text, `aria-label`, `role`, HTTP status code, JSON key/value, console error, network request URL/method/status, SQL row count, SQL column value.

### Example case

```
| QA-5 | R40 | browser | none | 1. [browser] Set `qa-member` trialing, 3 days left (use the state setter from §3)<br>2. [browser] Navigate to `$BASE/dashboard`<br>3. [browser] Assert visible: an element with `role="status"` containing `3 days remaining`<br>4. [browser] Assert: the banner contains `your access ends` followed by a date | Banner reads: `3 days remaining — your access ends <date>. Payment opens once your access ends.` — no link present |
```

### Operator-handoff cases

When `Operator` is not `none`, the case ends with the handoff step as the last line of Steps. The agent then calls `ask_user` with the exact verbatim instruction:

> "**Operator required.** Please complete the following step in the browser, then reply done: [verbatim operator instruction]."

After the human replies, the agent verifies the post-state (the `Expected` column) using the same driver as the prior steps, then continues.

**Operator handoffs are never in the middle of a case.** They are always the final step. If a case needs a pre-condition set by an operator before the agent can continue, that is a separate preconditions entry (P0/P1/…), not an inline handoff.

### Guard annotation

Append `Guard:` inline on the step it applies to. Example:

```
3. [browser] Assert visible: `Status: Trialing`  Guard: Assert in browser — SSR splits interpolated text with `<!-- -->`, so curl returns empty
```

## Sections of the Output Plan

Write to `specs/qa/QA-<N>-<slug>.md` using this structure exactly:

```
# QA Plan: <Title>

> **Date:** YYYY-MM-DD
> **Issue:** #<N> · **Branch:** `feat/<N>/<slug>`
> **Specs:** [REQ-<N>](../requirements/REQ-<N>-<slug>.md) · [ARCH-<N>](../architecture/ARCH-<N>-<slug>.md) · [Review](../reviews/CODE-REVIEW-PIPELINE-<N>-<slug>.md)
> **Environment:** <URL>
> **Driver:** <browser driver> + <bash tools> (e.g. "Playwright MCP + Bash / wrangler d1 --local / curl")
> **Operator steps:** <count> — see §4

## 0. Scope

One paragraph: what this plan covers and what it deliberately does not (e.g. "covers the diff only — no full-site regression").

## 1. Shell Setup

Bash helpers for this project. Every helper is idempotent. At minimum:
- `BASE` — the dev server URL
- `d1` / `d1j` — D1 execute (plain / JSON)
- `uid` — look up a user id by email
- `apilogin` — sign in over HTTP, write session to a jar file
- `uilogin` — print a browser-openable magic link
- State setters per identity (trialing, active, lapsed, etc.)
- State readers (current access state, real lesson/course ids)

If the project uses a different database or cache, name the helpers accordingly.

## 2. Preconditions

Named `P0`, `P1`, … in priority order. P0 is always the automated suite.

| ID | Check | Command | Expected |
|---|---|---|---|
| P0 | Automated suite | `npm test` | All pass |
| P1 | Clean database | `npm run db:reset` | Schema applied, fixtures present |
| P2 | Config present | `grep '^VAR_NAME=' .env` | Value present |
| P3 | Dev server | `curl -s -o /dev/null -w '%{http_code}\n' $BASE/health` | `200` |
| P4 | Browser reachable | Playwright navigates to `$BASE` | Responds |

Preconditions must be run and passed before any case begins. A failed precondition stops the run.

## 3. Identities

One identity per driver. Each identity is used with exactly one driver for the entire run.

| Email | Driver | Used for |
|---|---|---|
| `qa-member@example.com` | browser | QA-5, QA-6, … |
| `qa-api@example.com` | bash (curl) | QA-8, QA-12, … |
| `foyzulkarim@gmail.com` | browser | admin cases |

Any fixture SQL to create them goes here, before the first case.

## 4. Operator Handoffs

List every operator-assisted case with its trigger and the exact action the operator takes. The agent prints this verbatim before each handoff.

| Case | Operator action |
|---|---|
| QA-22 | Enter sandbox card `4242 4242 4242 4242 / 12/34 / 123 / 10001`, click Purchase |

## 5–[N]. Cases by Area

One numbered section per logical area (Trial and identity, Countdown and gating, Admin surface, etc.). Each section contains the case table described above.

## N+1. Migration / Deploy Risk

Anything the test suite cannot reach. Migration rehearsal, schema changes, deployment ordering. Each step tagged `[bash]`.

## N+2. Regression Smoke

Touched-but-not-changed surfaces. One pass, no deep assertions.

## N+3. Out of Scope

What is deliberately skipped and why (needs a real payment profile, needs an hour to hold a session, targets production, etc.).

## N+4. Results Log

Filled by the agent as the run proceeds. Left as a blank table for the human to sign off after.

| Run date | Commit | Cases run | Failures | Notes |
|---|---|---|---|---|
| YYYY-MM-DD | `<sha>` | N of N | N | — |

### Run 1 — YYYY-MM-DD, commit `<sha>`

| Cases | Verdict | Notes |
|---|---|---|
| QA-1–4 | PASS | — |
| QA-5 | PASS | — |
| QA-22 | PASS | operator entered sandbox card |
| QA-NN | **FAIL** | exact failure: [HTTP status / DOM mismatch / console error] |

**Findings**

| ID | Severity | Description | file:line |
|---|---|---|---|
| F-1 | 🟠 High | [what broke and why] | `path/to/file.ext:123` |

## You Must NOT

- Write a case whose Expected column cannot be verified by the agent without human judgment.
- Omit a changed file from the Coverage Map without flagging it.
- Insert an operator handoff in the middle of a case — it is always the final step.
- Run cases against production or a preview URL with shared database bindings.
- Begin the run when P0 is red — fix the suite first.
- Use a single identity for both browser and bash unless the case explicitly documents why that is safe.
- Leave a guard-trap un-annotated on the specific step that needs it.
- Skip the triage conversation — the developer must confirm the scope before the plan is written.

## Reminders

- The plan is the deliverable. Once written, it is run as-is. Edit it only to fix structural errors, not to accommodate a case the developer later decides to skip — that is a scope change, not a plan error.
- After the run, update the Results Log with PASS/FAIL/PARTIAL per case and findings with severity and `file:line`.
- Link the plan back to the REQ and ARCH in the header.
