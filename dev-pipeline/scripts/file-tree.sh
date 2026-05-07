#!/usr/bin/env bash
# file-tree — generate project structure snapshot for LLM context
# Usage:
#   file-tree [<directory>]
#   file-tree --help
#
# Outputs markdown showing directory structure and detected tech stack.
# Run before search-codebase.sh to give LLM the lay of the land.

set -euo pipefail

# ── Usage ───────────────────────────────────────────────────────────────────
usage() {
  echo "Usage: file-tree [<directory>]"
  echo "       file-tree --help"
  echo ""
  echo "Output project structure and tech stack detection in markdown."
  echo "Run before search-codebase.sh for better keyword selection."
}

if [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

TARGET_DIR="${1:-.}"

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

# ── File Tree Generator ─────────────────────────────────────────────────────
# Uses find for portability — limits depth, excludes common ignore dirs
generate_tree() {
  local dir="$1"
  local max_depth="${MAX_DEPTH:-4}"

  # Build find command that excludes common non-source dirs
  find "$dir" -maxdepth "$max_depth" \
    -not -path "*/\.*" \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/__pycache__/*" \
    -not -path "*/target/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -path "*/vendor/*" \
    -type f -o -type d \
  2>/dev/null | sort | awk '
    BEGIN { prev_depth = 0 }
    {
      # Get depth from path
      n = gsub(/\//, "/", $0)
      depth = n

      # Get just the name
      name = $0
      sub(/.*\//, "", name)
      if (name == "") next  # skip empty names

      # Indent based on depth
      indent = ""
      for (i = 1; i < depth; i++) indent = indent "│   "

      # File or directory marker
      if (system("[ -d \"" $0 "\" ]") == 0) {
        marker = "├── "
      } else {
        marker = "├── "
      }

      print indent marker name
      prev_depth = depth
    }
  '
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
if [[ -d "$TARGET_DIR" ]]; then
  # Show top-level structure with key subdirs
  ls -la "$TARGET_DIR" 2>/dev/null | tail -n +2 | awk '{print $1, $NF}' | while read -r perms name; do
    if [[ "$name" == "." ]] || [[ "$name" == ".." ]]; then continue; fi
    if [[ "${perms}" == d* ]]; then
      echo "├── $name/"
    else
      echo "├── $name"
    fi
  done

  # Show key subdirectory contents (first 2 levels)
  for subdir in scripts skills agents rules specs; do
    if [[ -d "$TARGET_DIR/$subdir" ]]; then
      echo ""
      echo "$subdir/"
      ls "$TARGET_DIR/$subdir" 2>/dev/null | while read -r item; do
        if [[ -d "$TARGET_DIR/$subdir/$item" ]]; then
          echo "│   ├── $item/"
        else
          echo "│   ├── $item"
        fi
      done
    fi
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