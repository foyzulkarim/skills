#!/usr/bin/env bash
set -euo pipefail

# sync-skills.sh — bidirectional sync between repo skills and ~/.claude/skills.
#
#   scripts/sync-skills.sh push              push ALL skills to target
#   scripts/sync-skills.sh push commit implement   push only named skills
#   scripts/sync-skills.sh pull              pull ALL synced skills back
#   scripts/sync-skills.sh pull implement          pull only named skill back
#   scripts/sync-skills.sh import implement        import non-tracked skill from target (names required)
#   scripts/sync-skills.sh nuke              remove all synced skills from target
#   scripts/sync-skills.sh nuke --force implement  force-remove a skill from target (bypass marker check)
#
# Each copy gets a .synced-from marker holding its source path. Push refreshes
# dirs that carry a marker and refuses to touch dirs that don't (they're real
# personal skills); pull only touches marker-owned dirs pointing into this repo.
# import copies skills that are NOT tracked by this repo into the repo.

REPO_SKILLS_DIR="$(cd "$(dirname "$0")/../dev-pipeline/skills" && pwd)"
TARGET_DIR="${HOME}/.claude/skills"
MARKER=".synced-from"

mkdir -p "$TARGET_DIR"

usage() {
  cat <<EOF >&2
usage: $(basename "$0") <command> [skill...]

commands:
  push                   copy repo skills → ~/.claude/skills (creates/refreshes .synced-from marker)
  push commit implement        push only named skills
  pull                   pull ALL synced skills back into repo (strips marker)
  pull implement               pull only named synced skill back
  import <skill...>      import non-tracked skills from ~/.claude/skills into repo (names required)
  nuke                   delete marked skills from ~/.claude/skills only
  nuke --force <skill...>  force-remove named skills from target (bypasses marker check)
EOF
  exit 1
}

nuke() {
  local force=false
  local names=()
  for arg in "$@"; do
    case "$arg" in
      --force) force=true ;;
      -*) echo "error: unknown flag '$arg'" >&2; exit 1 ;;
      *) names+=("$arg") ;;
    esac
  done

  local removed=0

  if $force; then
    [ ${#names[@]} -eq 0 ] && { echo "error: --force requires at least one skill name" >&2; exit 1; }
    for name in "${names[@]}"; do
      local dir="$TARGET_DIR/$name"
      if [ ! -d "$dir" ]; then
        echo "error: skill '$name' not found in $TARGET_DIR" >&2
        exit 1
      fi
      rm -rf "$dir"
      echo "removed  $name"
      removed=$((removed + 1))
    done
  else
    [ ${#names[@]} -gt 0 ] && { echo "error: nuke without --force takes no arguments" >&2; exit 1; }
    for dir in "$TARGET_DIR"/*/; do
      [ -f "${dir}${MARKER}" ] || continue
      case "$(cat "${dir}${MARKER}")" in
        "$REPO_SKILLS_DIR"/*)
          rm -rf "$dir"
          echo "removed  $(basename "$dir")"
          removed=$((removed + 1)) ;;
      esac
    done
  fi

  echo "Done: $removed skill(s) removed from $TARGET_DIR."
}

push_one() {
  local name="$1"
  local src="$REPO_SKILLS_DIR/$name"
  local dst="$TARGET_DIR/$name"

  if [ ! -d "$src" ]; then
    echo "error: no such skill '$name' in $REPO_SKILLS_DIR" >&2
    echo "available: $(ls "$REPO_SKILLS_DIR" | tr '\n' ' ')" >&2
    exit 1
  fi

  if [ -d "$dst" ]; then
    if [ -f "$dst/$MARKER" ]; then
      rm -rf "$dst"
      cp -R "$src" "$dst"
      echo "$src" > "$dst/$MARKER"
      echo "refreshed $name"
    else
      echo "skipped  $name — $dst exists and is not managed by this script"
    fi
  else
    cp -R "$src" "$dst"
    echo "$src" > "$dst/$MARKER"
    echo "synced   $name"
  fi
}

pull_one() {
  local name="$1"
  local src="$REPO_SKILLS_DIR/$name"
  local dst="$TARGET_DIR/$name"

  if [ ! -d "$dst" ]; then
    echo "error: skill '$name' not found in $TARGET_DIR" >&2
    exit 1
  fi

  if [ ! -f "$dst/$MARKER" ]; then
    echo "skipped  $name — $dst is not managed by this script"
    return
  fi

  case "$(cat "$dst/$MARKER")" in
    "$REPO_SKILLS_DIR"/*) ;;
    *)
      echo "skipped  $name — $dst marker does not point to this repo"
      return ;;
  esac

  if [ ! -d "$src" ]; then
    echo "recreated $name — did not exist in repo"
  fi

  rm -rf "$src.tmp"
  cp -R "$dst" "$src.tmp"
  rm -rf "$src"
  mv "$src.tmp" "$src"
  rm -f "$src/$MARKER"
  echo "pulled   $name"
}

import_one() {
  local name="$1"
  local src="$REPO_SKILLS_DIR/$name"
  local dst="$TARGET_DIR/$name"

  if [ ! -d "$dst" ]; then
    echo "error: skill '$name' not found in $TARGET_DIR" >&2
    exit 1
  fi

  if [ -f "$dst/$MARKER" ]; then
    case "$(cat "$dst/$MARKER")" in
      "$REPO_SKILLS_DIR"/*)
        echo "skipped  $name — tracked by this repo (use 'pull' instead)"
        return ;;
    esac
  fi

  if [ -d "$src" ]; then
    echo "skipped  $name — already exists in repo"
    return
  fi

  cp -R "$dst" "$src"
  rm -f "$src/$MARKER"
  echo "imported $name"
}

# --- argument parsing --------------------------------------------------------

[ "$#" -eq 0 ] && usage

CMD="$1"
shift

case "$CMD" in
  nuke)
    nuke "$@" ;;

  push)
    if [ "$#" -gt 0 ]; then
      for name in "$@"; do push_one "$name"; done
    else
      for src in "$REPO_SKILLS_DIR"/*/; do
        [ -d "$src" ] || continue
        push_one "$(basename "$src")"
      done
    fi
    echo
    echo "Skills landed in $TARGET_DIR — picked up at the start of a new session."
    echo "Note: if the dev-pipeline plugin is installed, /dev-pipeline:<name> variants exist alongside these bare /<name> copies."
    ;;

  pull)
    if [ "$#" -gt 0 ]; then
      for name in "$@"; do pull_one "$name"; done
    else
      for dst in "$TARGET_DIR"/*/; do
        [ -d "$dst" ] || continue
        [ -f "${dst}${MARKER}" ] || continue
        case "$(cat "${dst}${MARKER}")" in
          "$REPO_SKILLS_DIR"/*)
            pull_one "$(basename "$dst")" ;;
        esac
      done
    fi
    echo
    echo "Skills pulled back into $REPO_SKILLS_DIR."
    ;;

  import)
    if [ "$#" -eq 0 ]; then
      echo "error: import requires at least one skill name" >&2
      exit 1
    fi
    for name in "$@"; do import_one "$name"; done
    echo
    echo "Skills imported into $REPO_SKILLS_DIR."
    ;;

  *)
    echo "error: unknown command '$CMD'" >&2
    usage ;;
esac
