#!/usr/bin/env bash
set -euo pipefail

# commit.sh <message-file>
# Stages all changes except sensitive files and commits with the given message
# file (hooks run normally). Does not push. Identical to commit-v2's commit.sh.

MSG_FILE="${1:?message file required}"
[ -f "$MSG_FILE" ] || { echo "message file not found: $MSG_FILE" >&2; exit 1; }

git add -A

SENSITIVE="$(git diff --cached --name-only | grep -iE '(^|/)\.env|secret|credential|token|key|password' || true)"
if [ -n "$SENSITIVE" ]; then
  echo "→ Excluding sensitive files from this commit:"
  echo "$SENSITIVE"
  while IFS= read -r f; do
    [ -n "$f" ] && git reset --quiet -- "$f"
  done <<< "$SENSITIVE"
fi

if git diff --cached --quiet; then
  echo "NOTHING_STAGED"
  exit 1
fi

git commit -F "$MSG_FILE"

echo "✓ Committed to $(git branch --show-current)"
