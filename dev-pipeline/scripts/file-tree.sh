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

TARGET_DIR="${1:-.}"
ENTRY_LIMIT="${ENTRY_LIMIT:-400}"
ENTRY_COUNT=0

# ── Tech Stack Detection ──────────────────────────────────────────────────────
detect_tech_stack() {
  local dir="$1"
  local stacks=""

  if [[ -f "$dir/package.json" ]]; then
    stacks="${stacks}Node.js (package.json)"
  fi
  if [[ -f "$dir/go.mod" ]]; then
    [[ -n "$stacks" ]] && stacks="$stacks, "
    stacks="${stacks}Go (go.mod)"
  fi
  if [[ -f "$dir/requirements.txt" ]]; then
    [[ -n "$stacks" ]] && stacks="$stacks, "
    stacks="${stacks}Python (requirements.txt)"
  fi
  if [[ -f "$dir/Cargo.toml" ]]; then
    [[ -n "$stacks" ]] && stacks="$stacks, "
    stacks="${stacks}Rust (Cargo.toml)"
  fi
  if [[ -f "$dir/pom.xml" ]]; then
    [[ -n "$stacks" ]] && stacks="$stacks, "
    stacks="${stacks}Java (pom.xml)"
  fi
  if [[ -f "$dir/build.gradle" ]] || [[ -f "$dir/build.gradle.kts" ]]; then
    [[ -n "$stacks" ]] && stacks="$stacks, "
    stacks="${stacks}Gradle (build.gradle)"
  fi
  if [[ -f "$dir/.env" ]] || [[ -f "$dir/.env.example" ]]; then
    [[ -n "$stacks" ]] && stacks="$stacks, "
    stacks="${stacks}Environment config (.env)"
  fi
  if [[ -f "$dir/tsconfig.json" ]]; then
    [[ -n "$stacks" ]] && stacks="$stacks, "
    stacks="${stacks}TypeScript (tsconfig.json)"
  fi

  if [[ -z "$stacks" ]]; then
    echo "_No detected_"
  else
    echo "$stacks"
  fi
}

# ── Emit one entry, increment counter, check cap ──────────────────────────────
emit_entry() {
  local line="$1"
  echo "$line"
  ENTRY_COUNT=$((ENTRY_COUNT + 1))
  if [[ "$ENTRY_COUNT" -ge "$ENTRY_LIMIT" ]]; then
    echo ""
    echo "# Output truncated at $ENTRY_LIMIT entries."
    local top_dirs
    top_dirs=$(find "$TARGET_DIR" -maxdepth 1 -mindepth 1 -type d \
      -not -path "*/\.*" -not -path "*/node_modules" -not -path "*/.git" \
      2>/dev/null | sort | xargs -n1 basename 2>/dev/null | tr '\n' ' ')
    echo "# Top-level dirs: ${top_dirs:-none}"
    echo "# Re-run with EXPAND_DIRS=\"dir1 dir2\" or MAX_DEPTH=2 to focus."
    echo "# $ENTRY_COUNT entries"
    return 1
  fi
  return 0
}

# ── Main Output ──────────────────────────────────────────────────────────────
TECH_STACK=$(detect_tech_stack "$TARGET_DIR")

echo "## File Tree: $TARGET_DIR"
echo ""
echo "### Tech Stack"
echo "$TECH_STACK"
echo ""

echo "### Directory Structure"
echo "\`\`\`"

tree_output=""

if [[ -d "$TARGET_DIR" ]]; then
  # Top-level entries
  while IFS= read -r entry; do
    name=$(basename "$entry")
    [[ "$name" == "." || "$name" == ".." ]] && continue
    if [[ -d "$entry" ]]; then
      line="├── $name/"
    else
      line="├── $name"
    fi
    tree_output="${tree_output}${line}"$'\n'
    emit_entry "$line" || { echo "\`\`\`"; echo ""; exit 0; }
  done < <(find "$TARGET_DIR" -maxdepth 1 -mindepth 1 2>/dev/null | sort)

  echo ""
  tree_output="${tree_output}"$'\n'

  # Determine which subdirs to expand
  if [[ -n "${EXPAND_DIRS:-}" ]]; then
    read -ra SUBDIRS <<< "$EXPAND_DIRS"
    # Make paths relative to TARGET_DIR if not already absolute
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
    subname=$(basename "$subdir")
    header="${subname}/"
    echo "$header"
    tree_output="${tree_output}${header}"$'\n'

    while IFS= read -r item; do
      name=$(basename "$item")
      if [[ -d "$item" ]]; then
        line="│   ├── $name/"
      else
        line="│   ├── $name"
      fi
      tree_output="${tree_output}${line}"$'\n'
      emit_entry "$line" || { echo "\`\`\`"; echo ""; exit 0; }
    done < <(find "$subdir" -maxdepth "$max_depth" -mindepth 1 \
      -not -path "*/node_modules/*" -not -path "*/.git/*" \
      -not -path "*/__pycache__/*" -not -path "*/\.*" \
      2>/dev/null | sort)

    echo ""
    tree_output="${tree_output}"$'\n'
  done
else
  echo "_Directory not found: $TARGET_DIR_"
fi

echo "\`\`\`"
echo ""

# Key files summary
echo "### Key Files"
echo ""
echo "| Path | Purpose |"
echo "|------|---------|"
if [[ -f "$TARGET_DIR/CLAUDE.md" ]]; then
  echo "| CLAUDE.md | Project guidance for Claude |"
fi
if [[ -f "$TARGET_DIR/package.json" ]]; then
  echo "| package.json | Node.js dependencies |"
fi
if [[ -f "$TARGET_DIR/README.md" ]]; then
  echo "| README.md | Project documentation |"
fi
if [[ -d "$TARGET_DIR/.claude-plugin" ]]; then
  echo "| .claude-plugin/ | Plugin configuration |"
fi
if [[ -d "$TARGET_DIR/specs" ]]; then
  echo "| specs/ | Requirements and architecture docs |"
fi
if [[ -d "$TARGET_DIR/.claude" ]]; then
  echo "| .claude/ | Claude settings and memory |"
fi

echo ""

# ── Size hint footer ──────────────────────────────────────────────────────────
byte_count=$(printf '%s' "$tree_output" | wc -c | tr -d ' ')
echo "# $ENTRY_COUNT entries, ~${byte_count} bytes"
