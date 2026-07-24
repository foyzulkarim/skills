# Changelog

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

- Doc-hygiene CI is now advisory rather than blocking, and prunes `.wiki/` and `.worktrees/`
  from its walk so archived and parallel-lane artifacts stop tripping it.
- `commit.sh` unstages embedded git repositories (a nested `.worktrees/<N>` or stray clone
  that `git add -A` would commit as a `160000` gitlink) while preserving registered submodules.
- `AGENTS.md` and `CLAUDE.md` no longer restate the plugin version; `plugin.json` and
  `marketplace.json` are the only sources of truth.
