#!/usr/bin/env bash
# file-tree — generate project structure snapshot for LLM context
# Usage:
#   file-tree [<directory>]
#   file-tree --help
#
# Outputs markdown showing directory structure and detected tech stack.
# Run before search-codebase.sh to give LLM the lay of the land.
#
# Env vars:
#   EXPAND_DIRS="dir1 dir2"  — expand only these subdirs (bypasses auto-detection)
#   MAX_DEPTH=4              — depth limit for subdir expansion (default 4)
#   ENTRY_LIMIT=400          — max entries before truncation (default 400)

set -euo pipefail

# ── Usage ───────────────────────────────────────────────────────────────────
usage() {
  echo "Usage: file-tree [<directory>]"
  echo "       file-tree --help"
  echo ""
  echo "Output project structure and tech stack detection in markdown."
  echo "Run before search-codebase.sh for better keyword selection."
  echo ""
  echo "Env vars:"
  echo "  EXPAND_DIRS='dir1 dir2'  Expand only these subdirs (bypasses auto-detection)"
  echo "  MAX_DEPTH=4              Depth limit for subdir listing (default 4)"
  echo "  ENTRY_LIMIT=400          Max entries before truncation (default 400)"
}

if [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

TARGET_DIR="$(cd "${1:-.}" && pwd)"
ENTRY_LIMIT="${ENTRY_LIMIT:-400}"
ENTRY_COUNT=0
byte_count=0

# ── Tech Stack Detection ──────────────────────────────────────────────────────
detect_tech_stack() {
  local dir="$1"
  local stacks=""

  append_stack() { stacks="${stacks:+$stacks, }$1"; }

  [[ -f "$dir/package.json" ]]                                        && append_stack "Node.js (package.json)"
  [[ -f "$dir/go.mod" ]]                                              && append_stack "Go (go.mod)"
  [[ -f "$dir/requirements.txt" ]]                                    && append_stack "Python (requirements.txt)"
  [[ -f "$dir/Cargo.toml" ]]                                          && append_stack "Rust (Cargo.toml)"
  [[ -f "$dir/pom.xml" ]]                                             && append_stack "Java (pom.xml)"
  [[ -f "$dir/build.gradle" || -f "$dir/build.gradle.kts" ]]         && append_stack "Gradle (build.gradle)"
  [[ -f "$dir/.env" || -f "$dir/.env.example" ]]                      && append_stack "Environment config (.env)"
  [[ -f "$dir/tsconfig.json" ]]                                       && append_stack "TypeScript (tsconfig.json)"

  echo "${stacks:-_No detected_}"
}

# ── Emit one entry, increment counter, check cap ─────────────────────────────
# Hoisted at startup so emit_entry never re-scans the filesystem.
TOP_DIRS=$(find "$TARGET_DIR" -maxdepth 1 -mindepth 1 -type d \
  -not -path "*/\.*" -not -path "*/node_modules" -not -path "*/.git" \
  2>/dev/null | sort | xargs -n1 basename 2>/dev/null | tr '\n' ' ' || true)

emit_entry() {
  local line="$1"
  echo "$line"
  ENTRY_COUNT=$((ENTRY_COUNT + 1))
  byte_count=$((byte_count + ${#line} + 1))
  if [[ "$ENTRY_COUNT" -ge "$ENTRY_LIMIT" ]]; then
    echo ""
    echo "# Output truncated at $ENTRY_LIMIT entries."
    echo "# Top-level dirs: ${TOP_DIRS:-none}"
    echo "# Re-run with EXPAND_DIRS=\"dir1 dir2\" or MAX_DEPTH=2 to focus."
    echo "# $ENTRY_COUNT entries"
    return 1
  fi
  return 0
}

# ── Main Output ───────────────────────────────────────────────────────────────
echo "## File Tree: $TARGET_DIR"
echo ""
echo "### Tech Stack"
detect_tech_stack "$TARGET_DIR"
echo ""

echo "### Directory Structure"
echo "\`\`\`"

while IFS= read -r entry; do
  name="${entry##*/}"
  if [[ -d "$entry" ]]; then line="├── $name/"; else line="├── $name"; fi
  emit_entry "$line" || { echo "\`\`\`"; echo ""; exit 0; }
done < <(find "$TARGET_DIR" -maxdepth 1 -mindepth 1 2>/dev/null | sort)

echo ""

if [[ -n "${EXPAND_DIRS:-}" ]]; then
  read -ra SUBDIRS <<< "$EXPAND_DIRS"
  resolved_subdirs=()
  for d in "${SUBDIRS[@]}"; do
    if [[ -d "$TARGET_DIR/$d" ]]; then
      resolved_subdirs+=("$TARGET_DIR/$d")
    elif [[ -d "$d" ]]; then
      resolved_subdirs+=("$d")
    fi
  done
else
  resolved_subdirs=()
  while IFS= read -r d; do
    resolved_subdirs+=("$d")
  done < <(find "$TARGET_DIR" -maxdepth 1 -mindepth 1 -type d \
    -not -path "*/node_modules" -not -path "*/.git" \
    -not -path "*/__pycache__" -not -path "*/target" \
    -not -path "*/dist" -not -path "*/build" -not -path "*/vendor" \
    -not -path "*/\.*" 2>/dev/null | sort)
fi

max_depth="${MAX_DEPTH:-4}"

for subdir in "${resolved_subdirs[@]}"; do
  [[ -d "$subdir" ]] || continue
  subname="${subdir##*/}"
  echo "${subname}/"

  while IFS= read -r item; do
    name="${item##*/}"
    if [[ -d "$item" ]]; then line="│   ├── $name/"; else line="│   ├── $name"; fi
    emit_entry "$line" || { echo "\`\`\`"; echo ""; exit 0; }
  done < <(find "$subdir" -maxdepth "$max_depth" -mindepth 1 \
    -not -path "*/node_modules/*" -not -path "*/.git/*" \
    -not -path "*/__pycache__/*" -not -path "*/\.*" \
    2>/dev/null | sort)

  echo ""
done

echo "\`\`\`"
echo ""

echo "### Key Files"
echo ""
echo "| Path | Purpose |"
echo "|------|---------|"
[[ -f "$TARGET_DIR/CLAUDE.md" ]]        && echo "| CLAUDE.md | Project guidance for Claude |"
[[ -f "$TARGET_DIR/package.json" ]]     && echo "| package.json | Node.js dependencies |"
[[ -f "$TARGET_DIR/README.md" ]]        && echo "| README.md | Project documentation |"
[[ -d "$TARGET_DIR/.claude-plugin" ]]   && echo "| .claude-plugin/ | Plugin configuration |"
[[ -d "$TARGET_DIR/specs" ]]            && echo "| specs/ | Requirements and architecture docs |"
[[ -d "$TARGET_DIR/.claude" ]]          && echo "| .claude/ | Claude settings and memory |"

echo ""

# ── Size hint footer ──────────────────────────────────────────────────────────
echo "# $ENTRY_COUNT entries, ~${byte_count} bytes"
