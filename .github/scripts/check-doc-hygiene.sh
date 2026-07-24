#!/usr/bin/env bash
set -euo pipefail

# Reports pipeline artifacts (files under specs/, and CODE-REVIEW-*.md) in a tree.
#
# These are NOT forbidden on master. The /archive-issue skill retires them to the
# GitHub wiki *after* an issue's PR merges and the issue closes — so they are
# expected to land on master first, and this script only surfaces what is still
# unarchived. Exit 1 means "artifacts found", not "the build should fail";
# .github/workflows/doc-hygiene.yml turns that into PR annotations and passes.

ROOT="${1:-.}"
found=0

# Validate ROOT is an existing directory
[[ -d "$ROOT" ]] || { echo "ERROR: '$ROOT' is not a directory"; exit 2; }

# .wiki/ is the archive-issue wiki clone and .worktrees/* are parallel lanes.
# Both are separate checkouts living inside the repo root but belonging to other
# branches, so artifacts found there are never this branch's concern.
while IFS= read -r -d '' file; do
  echo "${file#"$ROOT"/} — pipeline artifact; archive after merge with /archive-issue <issue#>"
  found=$((found + 1))
done < <(
  find "$ROOT" \
    \( -name '.git' -o -name '.wiki' -o -name '.worktrees' \) -prune -o \
    \( -path "$ROOT/specs/*" -type f -o -name 'CODE-REVIEW-*.md' -type f \) -print0
)

[ "$found" -eq 0 ]
