#!/usr/bin/env bash
# search-codebase — one-shot file discovery and content search
# Usage:
#   search-codebase [-m N | --max-matches N] <keyword> [<keyword> ...]
#   search-codebase --help
#
# Takes space-separated keywords and searches both filenames and contents.
# Returns deduplicated results with keyword attribution in markdown format.
# -m N / --max-matches N caps content matches per file (default 3, 0=unlimited).

set -euo pipefail

MAX_RESULTS="${MAX_RESULTS:-100}"
MAX_MATCHES="${MAX_MATCHES:-3}"

# ── Usage ───────────────────────────────────────────────────────────────────
usage() {
  echo "Usage: search-codebase [-m N | --max-matches N] <keyword> [<keyword> ...]"
  echo "       search-codebase --help"
  echo ""
  echo "Search filenames and contents for keywords, return markdown results."
  echo "Keywords are case-sensitive. Use quotes for patterns with special chars."
  echo "  -m N / --max-matches N  Cap content matches per file (default 3, 0=unlimited)"
  echo "  MAX_RESULTS env var     Limits filename results per keyword (default: 100)"
  exit 0
}

if [[ "${1:-}" == "--help" ]]; then
  usage
fi

# ── Flag parsing (must happen before keyword collection) ─────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-matches|-m)
      MAX_MATCHES="$2"
      shift 2
      ;;
    --max-matches=*)
      MAX_MATCHES="${1#*=}"
      shift
      ;;
    *)
      break
      ;;
  esac
done

if [[ $# -eq 0 ]]; then
  usage >&2
  exit 1
fi

KEYWORDS=("$@")

# ── Temp files for accumulating results ─────────────────────────────────────
tmp_name_matcher=$(mktemp)
tmp_content_matcher=$(mktemp)
tmp_files_sorted=$(mktemp)

cleanup() {
  rm -f "$tmp_name_matcher" "$tmp_content_matcher" "$tmp_files_sorted"
}
trap cleanup EXIT

# ── Search Function ──────────────────────────────────────────────────────────
search_keyword() {
  local kw="$1"
  local search_dir="${SEARCH_DIR:-.}"

  # Search filenames — append to temp file
  find "$search_dir" -name "*${kw}*" -type f 2>/dev/null | head -"$MAX_RESULTS" >> "$tmp_name_matcher"

  # Search contents — cap per file, emit truncation indicator for capped files
  if [[ "$MAX_MATCHES" == "0" ]]; then
    grep -rn --line-buffered "$kw" "$search_dir" 2>/dev/null | head -"$MAX_RESULTS" >> "$tmp_content_matcher"
  else
    grep -rn -m "$MAX_MATCHES" "$kw" "$search_dir" 2>/dev/null >> "$tmp_content_matcher"
    # Count-only pass to detect files where matches were capped
    local file_counts
    file_counts=$(grep -rc "$kw" "$search_dir" 2>/dev/null || true)
    while IFS=: read -r file count; do
      [[ -z "$file" || -z "$count" ]] && continue
      # Skip non-numeric counts (e.g. "binary file matches")
      [[ "$count" =~ ^[0-9]+$ ]] || continue
      if [[ "$count" -gt "$MAX_MATCHES" ]]; then
        echo "  ... ($((count - MAX_MATCHES)) more matches — use --max-matches 0 or Read $file for full content)" >> "$tmp_content_matcher"
      fi
    done <<< "$file_counts"
  fi
}

# ── Run searches ─────────────────────────────────────────────────────────────
for kw in "${KEYWORDS[@]}"; do
  search_keyword "$kw"
done

# ── Process filename results ──────────────────────────────────────────────────
echo "## search-codebase Results"
echo ""
echo "### Files Found (by name)"
echo ""

# Deduplicate filename matches and build output
name_count=0
name_output=""
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  # Avoid duplicates in output
  if ! echo "$name_output" | grep -q "^| .* | $file |"; then
    # Build keyword attribution for this file by checking which keywords matched it
    kw_attribs=""
    for kw in "${KEYWORDS[@]}"; do
      if [[ "$file" == *"$kw"* ]]; then
        if [[ -z "$kw_attribs" ]]; then
          kw_attribs="$kw"
        else
          kw_attribs="$kw_attribs, $kw"
        fi
      fi
    done
    name_output="${name_output}| $kw_attribs | $file |"$'\n'
    name_count=$((name_count + 1))
  fi
done < <(sort -u "$tmp_name_matcher" 2>/dev/null)

if [[ $name_count -eq 0 ]]; then
  echo "No name matches."
else
  echo "| Keywords | Path |"
  echo "|----------|------|"
  echo "$name_output"
fi

echo ""

# ── Process content results ──────────────────────────────────────────────────
echo "### Content Matches"
echo ""

content_count=0
content_output=""
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  # Pass truncation indicator lines through unchanged
  if [[ "$line" == "  ..."* ]]; then
    content_output="${content_output}${line}"$'\n'
    continue
  fi
  # Parse grep output: "file:line:content"
  file="${line%%:*}"
  rest="${line#*:}"
  linenum="${rest%%:*}"
  content="${rest#*:}"

  # Avoid duplicate lines in output
  if ! echo "$content_output" | grep -qF "$file | $linenum |"; then
    # Build keyword attribution for this match
    kw_attribs=""
    for kw in "${KEYWORDS[@]}"; do
      if echo "$line" | grep -q "$kw"; then
        if [[ -z "$kw_attribs" ]]; then
          kw_attribs="$kw"
        else
          kw_attribs="$kw_attribs, $kw"
        fi
      fi
    done
    # Escape pipes in content for markdown table
    content_escaped="${content//|/\\|}"
    content_output="${content_output}| $kw_attribs | $file | $linenum | \`$content_escaped\` |"$'\n'
    content_count=$((content_count + 1))
  fi
done < <(sort -u "$tmp_content_matcher" 2>/dev/null)

if [[ $content_count -eq 0 ]]; then
  echo "No content matches."
else
  echo "| Keywords | File | Line | Content |"
  echo "|----------|------|------|---------|"
  echo "$content_output"
fi

echo ""

# ── Summary + size hint ───────────────────────────────────────────────────────
total_files=$(cat "$tmp_name_matcher" "$tmp_content_matcher" 2>/dev/null | cut -d: -f1 | sort -u | wc -l | tr -d ' ')
total_matches=$(wc -l < "$tmp_content_matcher" 2>/dev/null | tr -d ' ' || echo 0)
keyword_list=$(IFS=', '; echo "${KEYWORDS[*]}")
total_bytes=$(cat "$tmp_name_matcher" "$tmp_content_matcher" 2>/dev/null | wc -c | tr -d ' ')

echo "**Summary:** $total_files files, $total_matches content matches, ${#KEYWORDS[@]} keywords searched ($keyword_list)"
echo "# $total_files files, $total_matches content matches, ~${total_bytes} bytes"
