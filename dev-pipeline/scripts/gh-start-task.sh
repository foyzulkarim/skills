#!/usr/bin/env bash
# gh-start-task — bootstrap a GitHub issue as a feature branch with context file
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
if [[ "$TYPE" == "feat" ]] && echo "$LABELS" | grep -qiE 'bug|fix|hotfix'; then
  TYPE="fix"
fi
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
echo "Proposed branch: $BRANCH_NAME"
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

# Check if branch already exists
if git revparse --verify "$BRANCH_NAME" &>/dev/null; then
  echo "Branch '$BRANCH_NAME' already exists locally."
  read -p "Switch to it? [y/n] " -r回应
  if [[ "$回应" =~ ^[Yy]$ ]]; then
    git checkout "$BRANCH_NAME"
  else
    echo "Aborted." >&2
    exit 1
  fi
else
  git checkout -b "$BRANCH_NAME" 2>/dev/null || {
    echo "Error: Failed to create branch '$BRANCH_NAME'." >&2
    exit 1
  }
  echo "Created branch: $BRANCH_NAME"
fi

# Push to origin
echo "Pushing to origin..."
git push -u origin "$BRANCH_NAME" 2>/dev/null || {
  echo "Error: Failed to push branch. Check your permissions." >&2
  exit 1
}

# ── Create context file ───────────────────────────────────────────────────────
mkdir -p specs/context

CONTEXT_FILE="specs/context/${ISSUE_NUM}.md"

cat > "$CONTEXT_FILE" << EOF
---
name: ${ISSUE_NUM}
description: "${TITLE}"
type: task
source: github
---

# Task ${ISSUE_NUM}: ${TITLE}

- **Type:** ${TYPE}
- **Source:** GitHub issue #${ISSUE_NUM}
- **State:** ${STATE}
- **Labels:** ${LABELS:-none}
- **Created:** $(date +%Y-%m-%d)

## Description

${BODY:-_No description provided._}

## Notes

<!-- Add your notes, acceptance criteria, and context here -->

EOF

echo "Context saved to: $CONTEXT_FILE"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "Done! Branch '$BRANCH_NAME' is ready."
echo ""
echo "Next steps:"
echo "  /plan-requirements   — capture WHAT and WHY (for greenfield/unclear bugs)"
echo "  /plan-architecture  — design the solution (for known features)"
echo "  /tdd                 — start coding with test-driven development"