# QA Plan: <Title>

> **Date:** YYYY-MM-DD
> **Issue:** #<N> · **Branch:** `<branch>`        ← omit rows that don't apply
> **Specs:** [REQ](…) · [ARCH](…) · [Review](…)   ← only links that exist (Review is optional — add only when /review has already produced a report)
> **Environment:** <URL of the environment under test>
> **Driver:** <browser driver> + <shell tools>
> **Operator steps:** <count> — see §4
> **Results:** written by /execute-qa to `QA-RESULTS-<N>-<slug>.md`

## 0. Scope
One paragraph: what this plan covers and what it deliberately does not
(e.g. "covers the diff only — no full-site regression").

## 1. Shell Setup
The helpers agreed in Phase B, as runnable, idempotent commands for THIS
project's stack. Typical shapes: a `BASE` URL variable, a database/state
query helper, a user-state setter per identity state, a state reader, an
HTTP login helper that writes a session/cookie jar, a browser login path.
Name them what the project would name them.

## 2. Preconditions
Named P0, P1, … in priority order. P0 is always the automated suite.

| ID | Check | Command | Expected |
|---|---|---|---|
| P0 | Automated suite | <detected suite command> | All pass |
| P1 | <env/config/server checks as agreed> | … | … |

A failed precondition stops the run. P0 red = the run does not begin.

## 3. Identities
One identity per driver — a second sign-in with the same identity on
another driver can invalidate the first session.

| Identity | Driver | Used for |
|---|---|---|
| `<test account>` | browser | QA-…, QA-… |
| `<test account>` | bash | QA-…, QA-… |

Any fixture commands to create them go here, before the first case.

## 4. Operator Handoffs
Every operator-assisted case, its trigger, and the exact verbatim action.

## 4a. Lanes
One line per lane: lane → identity/identities → case IDs → why this lane is
separate. Lane 1 is the serial lane — every operator-handoff and log-correlation
case is pinned to it. A single-lane plan says so explicitly ("serial plan — one
lane") and executes without subagents or `--ctx`. No identity and no mutable
state may appear in more than one lane.

## 5–[N]. Cases by Area
One numbered section per logical area, each containing its case table:

| ID | Req | Driver | Operator | Steps | Expected |

- The **Req** column carries the REQ-ID(s) the case verifies — pipeline mode
  only; omit the column in general/bug mode.
- Steps are tagged `[bash]` or `[browser]`; a step that can only run where the
  process is local (dev-log slicing, direct DB reads, seed scripts) is tagged
  `[bash local-only]` and gets a remote-equivalent `Guard:` when one exists.
- Browser steps use relative URLs (`goto /settings` — never a hardcoded host).
- Every Expected line is tagged with its tier: `[assert]`, `[judge]` with a
  written criterion, or `[judge-visual]` with a written criterion (the preceding
  step must capture the screenshot).

## N+1. Migration / Deploy Risk
Anything the test suite cannot reach: migration rehearsal, schema
changes, deployment ordering. Each step tagged [bash].

## N+2. Regression Smoke
Touched-but-not-changed surfaces. One pass, no deep assertions.

## N+3. Out of Scope
What is deliberately skipped and why.
