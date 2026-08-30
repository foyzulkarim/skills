# SKILL.md additions — qa-browser, environments, visual judgment, bug mode, traceability

Paste each section into the named skill file.

---

# A. `plan-qa/SKILL.md`

## A1. Entry modes — replace "## Two Entry Modes" heading/intro with:

```markdown
## Three Entry Modes

**Pipeline mode** — `/plan-qa specs/architecture/ARCH-<N>-<slug>.md`. The REQ, ARCH,
and TASKS exist. Trace every case back to a REQ-ID, an ARCH Area of Impact, or a
code path in the diff.

**General mode** — `/plan-qa PR 21` or `/plan-qa branch feat/21/…`. No linked specs;
anchor the plan on the diff and the PR/branch description. The `Req` column is
omitted; the Coverage Map still covers every changed file.

**Bug mode** — `/plan-qa bug #123` or `/plan-qa bug "<description>"`. No specs, no
pipeline — the reproduction is the requirement. Phase A/B collapse into one short
exchange: "Walk me through the repro — what did you do, what happened, what should
have happened?" The plan then contains exactly:

1. **The repro case** — the developer's steps, asserting the fixed behavior
   (`[assert]` where observable, `[judge-visual]` for rendering bugs, with the
   screenshot as evidence). The broken behavior must be falsifiably absent.
2. **Regression smoke** over the changed files' blast radius, from the Coverage
   Map as usual.

Omission rules follow general mode (no `Req` column, omit missing spec links).
Output naming unchanged: `QA-<N>-<slug>.md`, or `QA-<slug>.md` without an issue.

Default to pipeline mode when an ARCH exists; general mode for spec-less feature
work; bug mode when the work is a fix with a reproduction.
```

## A2. Add after "Scenario types are open-ended.":

```markdown
## Environment Portability

Plans are environment-agnostic; the environment is chosen at run time.

- **Relative URLs only.** Every `[browser]` navigation target is written relative to
  `$BASE` (e.g. `goto /settings`, never `goto http://localhost:3000/settings`). An
  absolute URL in a step is a plan error unless the case deliberately targets an
  external surface (a third-party OAuth page, a webhook receiver) — document why.
- **Tag environment-bound steps.** A `[bash]` step that can only run where the
  process is local — dev-log slicing, direct database reads, seed scripts — is
  tagged `[bash local-only]`. Against a remote base, /execute-qa records these
  lines as SKIPPED with the reason; provide a remote equivalent in the step's
  `Guard:` when one exists (an admin API call, a log-tail command for the host).
- **Identities are per-environment.** The Identities section names accounts
  logically (`qa-member`, `qa-admin`); credentials come from the run's env file,
  never from the plan.
```

## A3. Case Format — add a third tier after the `[judge]` bullet:

```markdown
  - `[judge-visual]` — a visual property judged from a screenshot of the rendered
    surface: `[judge-visual] <property> — pass if <criterion>`. The preceding step
    must capture the screenshot (`screenshot specs/qa/evidence/<case>.png`). Use for
    layout, emphasis, visual hierarchy, and "is this what the requirement asked
    for" checks that no DOM assert can express. When a design reference exists
    (Figma frame export, mockup), name it in the line — the judgment compares
    screenshot against reference. Same rule as `[judge]`: no written pass/fail
    criterion, not ready. "Matches the design" alone is not a criterion.
```

## A4. Add new section after "Coverage Map" — parallelism is a plan-time decision:

```markdown
## Lanes

Parallelism is decided at plan time, not run time. Every case belongs to exactly
one lane; cases in a lane run sequentially, lanes run in parallel. A plan with a
single lane is a serial plan — that is the default and always valid.

Phase A proposes candidate scenarios already grouped into lanes, with the reason
for each split. Phase B adds one probe: "which of these could collide if run at
the same time?" — answers become lane assignments, exactly as traps become Guards.

Two cases must NOT share a lane boundary (i.e. must be in the SAME lane, or the
plan stays single-lane) when they share any of:

- an identity (one context per identity; an identity never appears in two lanes)
- mutable backend state (the same rows, records, or files either one writes)
- a throttle, rate limit, or cache one of them can exhaust or poison
- an environment reset step

Always pinned to lane 1 (the serial lane):

- every case with an operator handoff (one human, one prompt at a time)
- every case using log correlation (parallel actions interleave the dev log and
  break offset slicing)

The plan's **Lanes section** lists: lane → identity/identities → case IDs → why
this lane is separate. The Readiness Gate gains one line: no identity and no
mutable state appears in more than one lane.
```

---

# B. `execute-qa/SKILL.md`

## B1. Replace the `[browser]` sentence in Execution Protocol step 3 with:

```markdown
3. **Execute cases in plan order**, each step with its tagged driver
   (`[bash]` = shell command, `[browser]` = a `qa-browser` command — see Browser
   Driver below). Apply every `Guard:` on the step it annotates. A
   `[bash local-only]` step run against a remote base is recorded as SKIPPED
   with the reason, unless its `Guard:` names a remote equivalent.
```

## B2. Add new sections before "Verdicts":

```markdown
## Environments

`/execute-qa <plan> [--base <url> | --env <name>]`

- No flag → `--env local`.
- `--env <name>` loads `.env.qa.<name>` (gitignored) from the repo root:

      QA_BASE_URL=https://uat.yourapp.com
      QA_USER_MEMBER=qa-member@example.com
      QA_PASS_MEMBER=...

- `--base <url>` overrides `QA_BASE_URL` directly.
- Record the resolved base URL and env name in the run header of QA-RESULTS.
- The production guard applies to every environment: never run against
  production or any environment sharing production data stores.

## Browser Driver

All `[browser]` steps run through the persistent session CLI at
`scripts/qa-browser.mjs` (requires `playwright` as a devDependency and
`npx playwright install chromium` once).

**Run lifecycle:** start the daemon once before the first case, stop it after
the last — never per case:

    node scripts/qa-browser.mjs serve --base $QA_BASE_URL &   # headed, visible
    ...all cases...
    node scripts/qa-browser.mjs stop

**Step → command mapping:**

| Plan step | Command |
|---|---|
| Navigate to `/path` | `goto /path` |
| Click X | `click "text=X"` (or role=/css selector) |
| Fill field | `fill "<selector>" <value>` — secrets as `env:NAME`, never literal |
| Assert visible text | `assert-visible "..."` |
| Assert aria attribute | `assert-aria "<selector>" <attr> <value>` |
| Assert URL | `assert-url <substring>` |
| No console errors | `console-errors` |
| Capture network request | `network <filter>` |
| Screenshot | `screenshot specs/qa/evidence/<case>.png` |
| Sign in as `<identity>` | `new-context <identity> <identity>` (loads saved state), else drive the login flow once then `save-state <identity>` |
| Mock/block a request | `route mock|abort <pattern> ...` |

**Rules:**

- Every command prints one JSON line and exits 0/1 — `[assert]` verdicts are
  read off the exit code. Chain independent steps with `&&` in one shell call.
- Any failed command auto-captures a screenshot to `.qa-shots/`; move or
  reference that path as the case's evidence in QA-RESULTS.
- One browser instance per run; one context per identity. Never launch a second
  browser or reuse a context across identities.
- **Lanes:** if the plan has one lane, execute exactly as above — no subagents,
  no `--ctx` needed. If it has N lanes, spawn one subagent per lane; every
  command a lane issues carries `--ctx <lane>` (e.g. `goto /a --ctx lane2`),
  which routes to that lane's context without touching the shared active
  pointer. Each context has its own cookies/storage AND its own console-error
  and network buffers, so lanes cannot drain or read each other's evidence.
  Each subagent records its own cases; the parent merges them into QA-RESULTS
  in case-ID order, with a per-lane line in the run header. Verdict rules are
  unchanged per case.
- Secrets pass only as `env:NAME` references resolved by the daemon — a literal
  credential in a command is a run error.
- **Log correlation:** when a case asserts paired browser/terminal behavior,
  snapshot the log offset before the browser action and assert only on the new
  slice:

      OFF=$(wc -c < /tmp/dev.log)
      node scripts/qa-browser.mjs click "text=Reset password"
      tail -c +$((OFF+1)) /tmp/dev.log | grep "password reset requested"
```

## B3. Verdicts — add a third tier bullet after `[judge]`:

```markdown
- **`[judge-visual]`** — open and view the screenshot the case captured, then
  judge against the criterion written in the line (and the named design
  reference, if any). Same three rules as `[judge]`: the criterion is the
  plan's, the verdict describes what was observed in the image, ambiguity is
  PARTIAL — never a guessed PASS. The screenshot path is recorded next to the
  verdict as its evidence. A `[judge-visual]` line with no captured screenshot
  is a structural plan error.
```

Also extend the verdict table note: PASS (judged) covers `[judge]` and
`[judge-visual]` lines alike.

---

# C. `review/sub-skills/requirements-traceability.md` (new, 17th check)

Follow `_protocol.md` conventions. Core spec:

```markdown
# Check: Requirements Traceability

Applies only when a REQ-*.md exists for the work (pipeline mode). Skip otherwise.

**Mechanical pass** — build the matrix:
- Every REQ-ID must appear in ≥1 of: a QA case `Req` column, an automated test
  (grep for the ID or a linked test file in TASKS), or a TASKS verification plan.
  An orphan REQ-ID is a finding: UNCOVERED requirement.
- Every changed file must trace to ≥1 REQ-ID via the specs or the QA Coverage
  Map. Untraceable change is a finding: possible scope creep.

**Semantic pass** — per acceptance criterion:
- Quote the criterion and the claimed covering case/test verbatim.
- Verdict per criterion:
  - VERIFIED — the case/test would fail if the criterion were violated
  - WEAK — the case touches the feature but cannot falsify the criterion
  - UNCOVERED — nothing claims it
- WEAK and UNCOVERED are findings with severity; every verdict quotes its
  evidence, never asserts coverage from memory.
```
