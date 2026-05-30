#!/usr/bin/env bash
set -euo pipefail

# gather.sh — collect commit context ADAPTIVELY, in one shot.
#
# ALL selection/trimming happens here in deterministic bash — no LLM is
# involved in the adaptation. The model is invoked exactly once, afterward,
# to draft the message from this curated output. Read-only: mutates nothing.
#
# Strategy:
#   - The full --stat is ALWAYS included (cheap, complete shape).
#   - Small change (<= THRESHOLD lines): emit the WHOLE diff — zero quality loss.
#   - Large change: drop known-noise paths (lockfiles, generated, vendored) and
#     cap each remaining file to PER_FILE_CAP lines so breadth is preserved and
#     no single file can crowd out the signal.

THRESHOLD="${COMMIT_GATHER_THRESHOLD:-500}"   # total changed lines at/under which we send the full diff
PER_FILE_CAP="${COMMIT_GATHER_PER_FILE_CAP:-80}"  # lines shown per file when trimming a large change

# Glob patterns treated as noise: excluded from CONTENT (still in the --stat).
is_noise() {
  case "$1" in
    *.lock|*package-lock.json|*yarn.lock|*pnpm-lock.yaml|*go.sum|*Cargo.lock|\
    *composer.lock|*.min.js|*.min.css|*.map|*.snap|\
    */dist/*|*/build/*|*/vendor/*|*/node_modules/*) return 0 ;;
    *) return 1 ;;
  esac
}

# Cap stdin to N lines using awk (reads all input — no SIGPIPE under pipefail).
cap() { awk -v n="$1" 'NR<=n'; }

if [ -z "$(git status --porcelain)" ]; then
  echo "NOTHING_TO_COMMIT"
  exit 0
fi

BRANCH="$(git branch --show-current)"

echo "=== BRANCH ==="
echo "$BRANCH"

echo
echo "=== TASK_NUMBER ==="
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
echo "=== SENSITIVE (auto-excluded by commit.sh) ==="
git status --porcelain | sed 's/^...//' | grep -iE '(^|/)\.env|secret|credential|token|key|password' || echo "none"

UNTRACKED="$(git ls-files --others --exclude-standard)"

echo
echo "=== DIFFSTAT (full — every tracked file, always) ==="
git diff --stat HEAD || true
if [ -n "$UNTRACKED" ]; then
  echo "-- untracked (new) --"
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ -f "$f" ] || continue
    printf ' %s | %s lines\n' "$f" "$(wc -l < "$f" 2>/dev/null | tr -d ' ')"
  done <<< "$UNTRACKED"
fi

echo
echo "=== RECENT_COMMITS (style, last 3) ==="
git log --oneline -3 || true

# --- Decide full vs trimmed, in bash ---
TRACKED_LINES=$(git diff HEAD | wc -l | tr -d ' ')
UNTRACKED_LINES=0
if [ -n "$UNTRACKED" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ -f "$f" ] || continue
    n=$(wc -l < "$f" 2>/dev/null | tr -d ' ')
    UNTRACKED_LINES=$((UNTRACKED_LINES + ${n:-0}))
  done <<< "$UNTRACKED"
fi
TOTAL=$((TRACKED_LINES + UNTRACKED_LINES))

echo
if [ "$TOTAL" -le "$THRESHOLD" ]; then
  echo "=== DIFF: FULL (total ${TOTAL} lines <= ${THRESHOLD}) ==="
  echo "--- tracked changes ---"
  git diff HEAD || true
  if [ -n "$UNTRACKED" ]; then
    echo "--- new file content ---"
    git ls-files --others --exclude-standard -z \
      | xargs -0 -I{} git --no-pager diff --no-color --no-index -- /dev/null {} 2>/dev/null || true
  fi
else
  echo "=== DIFF: TRIMMED (total ${TOTAL} lines > ${THRESHOLD}; noise dropped, ${PER_FILE_CAP} lines/file) ==="
  # Tracked changes, per-file capped, noise skipped.
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    is_noise "$f" && { echo "----- $f -----"; echo "[noise — see --stat]"; continue; }
    d=$(git --no-pager diff --no-color HEAD -- "$f" || true)
    nf=$(printf '%s\n' "$d" | wc -l | tr -d ' ')
    echo "----- $f -----"
    printf '%s\n' "$d" | cap "$PER_FILE_CAP"
    [ "${nf:-0}" -gt "$PER_FILE_CAP" ] && echo "... [truncated: ${nf} diff lines, showing first ${PER_FILE_CAP}]"
  done < <(git diff --name-only HEAD)
  # New files, per-file capped, noise skipped.
  if [ -n "$UNTRACKED" ]; then
    echo "--- new file content (capped ${PER_FILE_CAP} lines/file) ---"
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      [ -f "$f" ] || continue
      is_noise "$f" && { echo "----- $f -----"; echo "[noise — see --stat]"; continue; }
      n=$(wc -l < "$f" 2>/dev/null | tr -d ' ')
      echo "----- $f -----"
      cap "$PER_FILE_CAP" < "$f"
      [ "${n:-0}" -gt "$PER_FILE_CAP" ] && echo "... [truncated: ${n} lines, showing first ${PER_FILE_CAP}]"
    done <<< "$UNTRACKED"
  fi
fi
echo "=== END ==="
