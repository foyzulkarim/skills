# Changelog

## v6.2.0 — 2026-09-04

### Features

- **QA lane/coverage upgrades (`#40`)** — `/plan-qa` and `/execute-qa` now support
  environment-portable QA plans (`--env <name>` loads `.env.qa.<name>`; `--base <url>`
  overrides), plan-time parallel **lanes** with isolated contexts, a **bug-mode** entry
  point for regression tests, and `[judge-visual]` assertions judged from screenshots.
  `/execute-qa` ships the bundled `qa-browser.mjs` Playwright driver so `[browser]` steps
  run through a persistent headed daemon.
- **`sync-skills`** (`#38`) — promoted from repo-local to plugin-shipped. The
  `--to <harness>` alias resolves harness names (oh-my-pi, opencode, …) to skills
  directories via `scripts/sync-targets.json`; `list-targets` prints the resolved map.

### Maintenance

- Issue #39 specs artifacts retired to the GitHub wiki (`/archive-issue`).
- README `Contribute` section renamed to a `test-locally` framing; external-contribution
  steps dropped.

## v6.0.0 — 2026-08-23

### Features

- **`/plan-qa`** — post-implementation QA planning. Independent of `/review` (the developer
  chooses whether to run them sequentially or in parallel, and in what order). Interviews the
  developer to turn the specs and the diff into an executable QA specification: cases with
  `[bash]` / `[browser]` tagged steps, project traps codified as `Guard:`s on the exact steps
  that need them, a Coverage Map over every changed file, identities, preconditions, and
  named operator handoffs for the few actions an agent genuinely cannot do. Every Expected
  line is falsifiable — `[assert]` (machine-verifiable) or `[judge]` with an explicit pass/fail
  criterion fixed at plan time. Produces `/specs/qa/QA-<N>-<slug>.md`. Skip when the change
  has no running surface worth driving (a docs change, a script refactor).
- **`/execute-qa`** — runs a `/plan-qa` specification as written: preconditions first (a red
  automated suite means the run does not begin), cases in order with their tagged drivers
  and guards, verbatim operator handoffs. `[assert]` lines verify mechanically; `[judge]`
  lines are judged only against the plan's written criterion, with the observed evidence
  quoted next to the verdict and ambiguity escalating to PARTIAL — never a guessed pass.
  Appends one run section of verdicts and findings to `/specs/qa/QA-RESULTS-<N>-<slug>.md`;
  never modifies the plan.
- **`sync-skills`** — promoted from repo-local (`/Users/foyzul/.claude/skills/sync-skills/`)
  to plugin-shipped (`dev-pipeline/skills/sync-skills/`). Other-harness distribution (oh-my-pi,
  opencode, kimi, codex) is now a default part of the plugin, not a one-off on the host.
- **`requirement-coverage` review check** — new 17th sub-skill under `review/sub-skills/`.
  Static-only audit of test assertions against REQ acceptance criteria and ARCH edge-case
  rows: every criterion traced to a test that asserts it, every test traced back to a
  criterion. Distinguishes Covered / Weak / Uncovered / Manual and groups orphan tests.
- **QA gate wired into the pipeline.** `plan-architecture`, `generate-tasks`, `implement`,
  and `review` now know the QA gate exists; the last task of `/implement` points the developer
  at both review and `/plan-qa` (when applicable) and notes that the two are independent.
  `archive-issue` and `release-notes` recognise the new `specs/qa/QA-*.md` and
  `specs/qa/QA-RESULTS-*.md` artifact paths.

### Maintenance

- Plugin description now mentions the QA gate; `plugin.json` and `marketplace.json` are
  byte-identical on the field.
- Pipeline diagram in `CLAUDE.md`, `README.md`, and `dev-pipeline/README.md` updated to show
  the parallel Phase 5 / QA gate topology; the three copies are kept identical.
- `task-completion` review sub-skill switched its regression-guard wording from "passes" to
  "exists and asserts" with a `🛑 static only` marker — consistent with the new
  `requirement-coverage` discipline.

## v5.0.0 — 2026-07-24

### Breaking

- **Artifact naming is now issue-prefixed.** `plan-requirements` and `plan-architecture`
  emit `REQ-<N>-<slug>.md` / `ARCH-<N>-<slug>.md` with a `> **Issue:** #N` header row, and
  `review` saves pipeline reports as `CODE-REVIEW-PIPELINE-<N>-<slug>.md`. With no linked
  issue the un-prefixed shape is still produced and the `Issue:` row is omitted. Existing
  `REQ-<slug>.md` / `ARCH-<slug>.md` files keep working — the read-side skills take an
  explicit path, so no migration is required.
- **`disable-model-invocation` removed from all 13 skills.** Invocation discipline now lives
  entirely in each skill's `description`, which carries an explicit "use only when the user
  asks…" clause.

### Features

- **`move-to-worktree`** — parks a clean, pushed feature branch in `.worktrees/<issue#>` and
  returns the primary checkout to the default branch, for parallel Phase 4 lanes. Git only;
  hard-stops unless `.worktrees/` is gitignored.
- **`finish-worktree`** — teardown counterpart; verifies the PR merged and the issue closed
  via `gh` before removing the worktree and deleting the local branch.
- **`archive-issue`** — retires a closed issue's `specs/` artifacts into the GitHub wiki,
  correlating files to the issue number through the new naming contract.
- **`release-notes`** — drafts a `CHANGELOG.md` entry from commits since the last git tag and
  suggests the next semver version from that tag, never from a project manifest.

### Maintenance

- Doc-hygiene CI removed entirely (workflow + reporter script + self-test). It only ever
  posted an advisory reminder to archive `specs/`/`CODE-REVIEW-*.md` artifacts after merge;
  that reminder is now a manual `/archive-issue` step, so the whole `.github/` machinery is gone.
- `commit.sh` unstages embedded git repositories (a nested `.worktrees/<N>` or stray clone
  that `git add -A` would commit as a `160000` gitlink) while preserving registered submodules.
- `AGENTS.md` and `CLAUDE.md` no longer restate the plugin version; `plugin.json` and
  `marketplace.json` are the only sources of truth.
