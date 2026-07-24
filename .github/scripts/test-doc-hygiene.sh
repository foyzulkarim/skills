#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="$SCRIPT_DIR/check-doc-hygiene.sh"

pass=0
fail=0

assert_exit() {
  local desc="$1" expected="$2" actual
  shift 2
  set +e
  "$@" >/dev/null 2>&1
  actual=$?
  set -e
  if [ "$actual" -eq "$expected" ]; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (expected exit $expected, got $actual)"
    fail=$((fail + 1))
  fi
}

make_root() { mktemp -d; }
cleanup() { rm -rf "${1:?cleanup called with empty path}"; }

# --- Test 1: specs/ with a file is detected ---

root=$(make_root)
mkdir -p "$root/specs/context"
touch "$root/specs/context/42.md"
assert_exit "exits 1 when specs/ contains a file" 1 "$CHECK" "$root"
cleanup "$root"

# --- Test 2: CODE-REVIEW-*.md is detected ---

root=$(make_root)
touch "$root/CODE-REVIEW-PR-7.md"
assert_exit "exits 1 when a CODE-REVIEW-*.md artifact exists" 1 "$CHECK" "$root"
cleanup "$root"

# --- Test 3: SKILL.md files are allowed ---

root=$(make_root)
mkdir -p "$root/dev-pipeline/skills/start-task"
touch "$root/dev-pipeline/skills/start-task/SKILL.md"
assert_exit "exits 0 when only SKILL.md files exist" 0 "$CHECK" "$root"
cleanup "$root"

# --- Test 4: dev-pipeline/README.md is allowed ---

root=$(make_root)
mkdir -p "$root/dev-pipeline"
touch "$root/README.md" "$root/CLAUDE.md" "$root/dev-pipeline/README.md"
assert_exit "exits 0 for root and plugin README/CLAUDE.md files" 0 "$CHECK" "$root"
cleanup "$root"

# --- Test 5: empty specs/ dir is allowed ---

root=$(make_root)
mkdir -p "$root/specs"
assert_exit "exits 0 when specs/ exists but is empty" 0 "$CHECK" "$root"
cleanup "$root"

# --- Test 6: no specs/ dir at all is allowed ---

root=$(make_root)
assert_exit "exits 0 when specs/ does not exist" 0 "$CHECK" "$root"
cleanup "$root"

# --- Test 7: .wiki/ (archive-issue clone) is not this branch's concern ---

root=$(make_root)
mkdir -p "$root/.wiki/issue-35"
touch "$root/.wiki/issue-35/CODE-REVIEW-PR-63.md"
assert_exit "exits 0 for artifacts inside the .wiki/ clone" 0 "$CHECK" "$root"
cleanup "$root"

# --- Test 8: .worktrees/ (parallel lanes) is not this branch's concern ---

root=$(make_root)
mkdir -p "$root/.worktrees/42/specs/reviews" "$root/.worktrees/42/specs/context"
touch "$root/.worktrees/42/specs/reviews/CODE-REVIEW-PIPELINE-42-x.md"
touch "$root/.worktrees/42/specs/context/42.md"
assert_exit "exits 0 for artifacts inside a .worktrees/ lane" 0 "$CHECK" "$root"
cleanup "$root"

# --- Test 9: a real artifact is still detected alongside pruned dirs ---

root=$(make_root)
mkdir -p "$root/.wiki" "$root/.worktrees/42" "$root/specs/architecture"
touch "$root/.wiki/CODE-REVIEW-PR-1.md"
touch "$root/specs/architecture/ARCH-35-x.md"
assert_exit "exits 1 when a real artifact sits beside pruned dirs" 1 "$CHECK" "$root"
cleanup "$root"

# --- summary ---

echo ""
echo "Results: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
