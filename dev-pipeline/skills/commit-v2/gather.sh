#!/usr/bin/env bash
set -euo pipefail

# gather.sh — collect everything needed to draft a commit, in one shot.
# Prints a single structured blob so the LLM can draft a message without
# any further git inspection calls. Read-only: mutates nothing.

# Nothing to commit? Bail early so the skill can stop.
if [ -z "$(git status --porcelain)" ]; then
  echo "NOTHING_TO_COMMIT"
  exit 0
fi

BRANCH="$(git branch --show-current)"

echo "=== BRANCH ==="
echo "$BRANCH"

echo
echo "=== TASK_NUMBER ==="
# Match [A-Z]+-\d+ first (TASK-42, PROJ-7), else a standalone digit run.
if [[ "$BRANCH" =~ ([A-Z]+-[0-9]+) ]]; then
  echo "${BASH_REMATCH[1]}"
elif [[ "$BRANCH" =~ (^|[/-])([0-9]+)([/-]|$) ]]; then
  echo "${BASH_REMATCH[2]}"
else
  echo "NONE"
fi

echo
echo "=== STATUS ==="
git status --short

echo
echo "=== SENSITIVE (will be auto-excluded by commit.sh) ==="
git status --porcelain | sed 's/^...//' | grep -iE '(^|/)\.env|secret|credential|token|key|password' || echo "none"

echo
echo "=== DIFFSTAT (tracked changes vs HEAD) ==="
git diff --stat HEAD || true

echo
echo "=== UNTRACKED FILES (new, not yet tracked) ==="
git ls-files --others --exclude-standard || echo "none"

echo
echo "=== RECENT_COMMITS (match this style) ==="
git log --oneline -8 || true

echo
echo "=== DIFF (tracked changes vs HEAD, capped at 1500 lines) ==="
git diff HEAD | head -1500 || true

echo
echo "=== NEW FILE CONTENT (untracked, capped at 800 lines total) ==="
# Show untracked additions so all-new-file commits still get a real message.
# Read-only: diff each new file against /dev/null (skips binaries automatically).
git ls-files --others --exclude-standard -z \
  | xargs -0 -I{} git --no-pager diff --no-color --no-index -- /dev/null {} 2>/dev/null \
  | head -800 || true
echo "=== END_DIFF ==="
