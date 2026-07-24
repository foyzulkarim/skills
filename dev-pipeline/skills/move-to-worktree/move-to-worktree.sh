#!/usr/bin/env bash
# move-to-worktree — after /start-task: park the current feature branch in its
# own worktree and return the primary checkout to the default branch, freeing
# it to start the next parallel lane.
#
# Usage: move-to-worktree.sh   (no args — operates on the current branch)
set -euo pipefail

# ── Must run in the primary checkout, not a linked worktree ──────────────────
if [[ "$(git rev-parse --git-dir)" != "$(git rev-parse --git-common-dir)" ]]; then
  echo "Error: run this from the primary checkout, not from a worktree." >&2
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# ── Preconditions: task branch, clean tree, upstream set ─────────────────────
BRANCH="$(git branch --show-current)"
if [[ ! "$BRANCH" =~ ^[a-z][a-z0-9-]*/([0-9]+)/ ]]; then
  echo "Error: current branch '$BRANCH' is not a task branch ({type}/{issue}/{slug})." >&2
  echo "Run /start-task first." >&2
  exit 1
fi
ISSUE_NUM="${BASH_REMATCH[1]}"

# The worktree is nested inside the repo, so it must be ignored — otherwise
# `git add -A` in the primary checkout stages it as an embedded 160000 gitlink
# and commits this lane's HEAD. Checked before any mutation.
if ! git check-ignore -q ".worktrees/${ISSUE_NUM}"; then
  echo "Error: '.worktrees/' is not ignored by this repository." >&2
  echo "A worktree nested there would be committed as an embedded git repository." >&2
  echo "Add it first, then re-run:" >&2
  echo "  echo '.worktrees/' >> .gitignore" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean. Commit or stash before moving to a worktree." >&2
  exit 1
fi

if ! UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)"; then
  echo "Error: '$BRANCH' has no upstream. Push it first: git push -u origin $BRANCH" >&2
  exit 1
fi
if [[ "$UPSTREAM" != "origin/$BRANCH" ]]; then
  echo "Error: '$BRANCH' must track 'origin/$BRANCH' (currently '$UPSTREAM')." >&2
  exit 1
fi

read -r BEHIND AHEAD < <(git rev-list --left-right --count '@{u}...HEAD')
if (( BEHIND > 0 )); then
  echo "Error: '$BRANCH' is behind '$UPSTREAM'. Synchronize it before moving." >&2
  exit 1
fi
if (( AHEAD > 0 )); then
  echo "Pushing ${AHEAD} local commit(s) before moving the branch..."
  git push origin "$BRANCH"
fi

# Resolve the default branch from the local ref first: `git remote show` needs the
# network, and a failed lookup is indistinguishable from an empty answer — falling
# back to a hard-coded 'main' would check out the wrong branch on a 'master' repo.
DEFAULT_BRANCH="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@' || true)"
if [[ -z "$DEFAULT_BRANCH" ]]; then
  DEFAULT_BRANCH="$(git remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p' || true)"
fi
if [[ -z "$DEFAULT_BRANCH" ]]; then
  echo "Error: could not determine the default branch of 'origin'." >&2
  echo "Run 'git remote set-head origin --auto' and re-run." >&2
  exit 1
fi

WORKTREE_DIR="$ROOT/.worktrees/${ISSUE_NUM}"
if [[ -e "$WORKTREE_DIR" ]]; then
  echo "Error: $WORKTREE_DIR already exists." >&2
  exit 1
fi

# ── Free the branch, then check it out in its own worktree ───────────────────
git checkout "$DEFAULT_BRANCH" --quiet
git pull --ff-only origin "$DEFAULT_BRANCH" --quiet
mkdir -p "$(dirname "$WORKTREE_DIR")"
git worktree add "$WORKTREE_DIR" "$BRANCH"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "Worktree: $WORKTREE_DIR"
echo "Branch:   $BRANCH (issue #${ISSUE_NUM})"
echo "Primary checkout is back on ${DEFAULT_BRANCH}."
echo ""
echo "Next: prepare the worktree as your project requires (install dependencies,"
echo "configure ports, etc.), then open a new Claude session there and continue"
echo "the pipeline."
