#!/usr/bin/env bash
# gh-start-task — zero-confirmation bootstrap: GitHub issue → feature branch + context file
# Usage:
#   gh-start-task <issue-number>
#   gh-start-task <issue-number> <branch-type>
#   gh-start-task <issue-number> <branch-type> <slug>
#
# Examples:
#   gh-start-task 42
#   gh-start-task 42 feat
#   gh-start-task 42 fix payment-null-pointer

set -euo pipefail

ISSUE_NUM="${1:?Usage: gh-start-task <issue-number> [type] [slug]}"
TYPE="${2:-feat}"
SLUG="${3:-}"

# ── Validate gh is available ──────────────────────────────────────────────────
if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI is not installed." >&2
  echo "Install it via: brew install gh" >&2
  exit 1
fi

# ── Detect default branch ───────────────────────────────────────────────────
DEFAULT_BRANCH="$(git remote show origin 2>/dev/null | grep 'HEAD branch' | sed 's/.*: //' || true)"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

# ── Fetch issue ───────────────────────────────────────────────────────────────
echo "Fetching GitHub issue #${ISSUE_NUM}..."
ISSUE_JSON=$(gh issue view "${ISSUE_NUM}" --json title,body,labels,state --jq '{title,body,labels:[.labels[].name],state}')

TITLE=$(echo "$ISSUE_JSON" | jq -r '.title')
BODY=$(echo "$ISSUE_JSON" | jq -r '.body')
LABELS=$(echo "$ISSUE_JSON" | jq -r '.labels | join(",")')
STATE=$(echo "$ISSUE_JSON" | jq -r '.state')

if [[ "$TITLE" == "null" ]] || [[ -z "$TITLE" ]]; then
  echo "Error: Issue #${ISSUE_NUM} not found or inaccessible." >&2
  echo "Check that you're authenticated: gh auth status" >&2
  exit 1
fi

echo "  Title: $TITLE"
echo "  Labels: ${LABELS:-none}"
echo "  State: $STATE"

# ── Derive type from labels if not provided ───────────────────────────────────
if [[ -z "${2:-}" ]]; then
  if echo "$LABELS" | grep -qiE 'enhancement|feature'; then
    TYPE="feat"
  elif echo "$LABELS" | grep -qiE 'bug|fix|hotfix'; then
    TYPE="fix"
  elif echo "$LABELS" | grep -qiE 'refactor'; then
    TYPE="refactor"
  elif echo "$LABELS" | grep -qiE 'docs|documentation'; then
    TYPE="docs"
  elif echo "$LABELS" | grep -qiE 'test|tests'; then
    TYPE="test"
  elif echo "$LABELS" | grep -qiE 'ci|github-actions'; then
    TYPE="ci"
  elif echo "$LABELS" | grep -qiE 'chore|deps|dependencies'; then
    TYPE="chore"
  fi
fi

# ── Derive slug from title ─────────────────────────────────────────────────────
if [[ -z "$SLUG" ]]; then
  SLUG=$(echo "$TITLE" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^-a-z0-9 ]/ /g' \
    | tr -s ' ' \
    | tr ' ' '-' \
    | sed 's/^-//; s/-$//' \
    | cut -c1-60)
fi

# Sanitize slug — only allow [a-z0-9-]
SLUG=$(echo "$SLUG" | sed 's/[^a-z0-9-]/-/g' | sed 's/-\+/-/g' | sed 's/^-//; s/-$//')

BRANCH_NAME="${TYPE}/${ISSUE_NUM}/${SLUG}"

echo ""
echo "Branch: $BRANCH_NAME"
echo ""

# ── Git operations ────────────────────────────────────────────────────────────
# Check git status for uncommitted changes
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  echo "Error: You have uncommitted changes. Commit or stash them before running this script." >&2
  exit 1
fi

# Sync with default branch
echo "Syncing with ${DEFAULT_BRANCH}..."
git fetch origin "${DEFAULT_BRANCH}" --quiet 2>/dev/null || true
git checkout "${DEFAULT_BRANCH}" --quiet 2>/dev/null || {
  echo "Error: Failed to checkout '${DEFAULT_BRANCH}'." >&2
  exit 1
}
git pull origin "${DEFAULT_BRANCH}" --quiet 2>/dev/null || {
  echo "Error: Failed to pull '${DEFAULT_BRANCH}'." >&2
  exit 1
}

# Check if branch already exists — switch automatically, no prompt
if git rev-parse --verify "$BRANCH_NAME" &>/dev/null; then
  echo "Branch '$BRANCH_NAME' already exists locally — switching to it."
  git checkout "$BRANCH_NAME" || {
    echo "Error: Failed to switch to existing branch '$BRANCH_NAME'." >&2
    exit 1
  }
else
  git checkout -b "$BRANCH_NAME" 2>/dev/null || {
    echo "Error: Failed to create branch '$BRANCH_NAME'." >&2
    exit 1
  }
  echo "Created branch: $BRANCH_NAME"
fi

# ── Create context file ───────────────────────────────────────────────────────
mkdir -p specs/context

CONTEXT_FILE="specs/context/${ISSUE_NUM}.md"

cat > "$CONTEXT_FILE" << 'EOF'
---
name: __ISSUE_NUM__
description: "__TITLE__"
type: task
source: github
---

# Task __ISSUE_NUM__: __TITLE__

- **Type:** __TYPE__
- **Source:** GitHub issue #__ISSUE_NUM__
- **State:** __STATE__
- **Labels:** __LABELS__
- **Created:** __DATE__

## Description

__BODY__

## Notes

<!-- Add your notes, acceptance criteria, and context here -->

EOF

# Substitute placeholders with actual values (no further bash expansion after this).
sed -i \
  -e "s|__ISSUE_NUM__|${ISSUE_NUM}|g" \
  -e "s|__TITLE__|${TITLE}|g" \
  -e "s|__TYPE__|${TYPE}|g" \
  -e "s|__STATE__|${STATE}|g" \
  -e "s|__LABELS__|${LABELS:-none}|g" \
  -e "s|__DATE__|$(date +%Y-%m-%d)|g" \
  "$CONTEXT_FILE"

# Substitute __BODY__ separately so multi-line body content lands verbatim.
awk -v body="${BODY:-_No description provided._}" '{gsub(/__BODY__/, body); print}' "$CONTEXT_FILE" > "${CONTEXT_FILE}.tmp"
mv "${CONTEXT_FILE}.tmp" "$CONTEXT_FILE"

echo "Context saved to: $CONTEXT_FILE"

# ── Commit the context file on the branch ─────────────────────────────────────
# Only the file this script just generated — never the developer's other changes.
if [[ -n "$(git status --porcelain -- "$CONTEXT_FILE")" ]]; then
  git add -- "$CONTEXT_FILE"
  git commit --quiet -m "chore(${ISSUE_NUM}): add task context

Refs: ${ISSUE_NUM}" -- "$CONTEXT_FILE" || {
    echo "Error: Failed to commit context file." >&2
    exit 1
  }
  echo "Committed context file on ${BRANCH_NAME}."
fi

# ── Push to origin ────────────────────────────────────────────────────────────
echo "Pushing to origin..."
git push -u origin "$BRANCH_NAME" 2>/dev/null || {
  echo "Error: Failed to push branch. Check your permissions." >&2
  exit 1
}

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "Done! Branch '$BRANCH_NAME' is ready."