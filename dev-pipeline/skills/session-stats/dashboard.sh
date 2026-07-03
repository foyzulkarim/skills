#!/usr/bin/env bash
# session-stats — render a Claude Code session transcript as a terminal dashboard
# Usage:
#   dashboard.sh                    # current session (via CLAUDE_CODE_SESSION_ID)
#   dashboard.sh <session-id>       # any session by id
#   dashboard.sh --color            # force ANSI colors (auto-on when stdout is a TTY)
set -euo pipefail

command -v jq >/dev/null 2>&1 || { echo "Error: jq is required. Install it via: brew install jq" >&2; exit 1; }

# ── args ──────────────────────────────────────────────────────────────────────
COLOR_MODE="auto"
ARGS=()
for a in "$@"; do
  case "$a" in
    --color)    COLOR_MODE="on" ;;
    --no-color) COLOR_MODE="off" ;;
    *)          ARGS+=("$a") ;;
  esac
done
SESSION_ID="${ARGS[0]:-${CLAUDE_CODE_SESSION_ID:-}}"
[[ -n "$SESSION_ID" ]] || { echo "Error: no session id — pass one as an argument or run inside a Claude Code session." >&2; exit 1; }

# Session ids are UUIDs, unique across projects — glob instead of guessing the
# project-directory slug rules.
JSONL="$(ls "$HOME"/.claude/projects/*/"$SESSION_ID".jsonl 2>/dev/null | head -1 || true)"
[[ -n "$JSONL" ]] || { echo "Error: no transcript found for session ${SESSION_ID}." >&2; exit 1; }
# Sidecars are globbed the same way (not assumed transcript-adjacent): a mid-session
# cd can split one session's sidecars across mapped project dirs.
COST_FILES=()
while IFS= read -r f; do COST_FILES+=("$f"); done \
  < <(ls "$HOME"/.claude/projects/*/"$SESSION_ID".cost.jsonl 2>/dev/null || true)

if [[ "$COLOR_MODE" == "on" || ( "$COLOR_MODE" == "auto" && -t 1 ) ]]; then
  B='\033[1m'; D='\033[2m'; C='\033[36m'; G='\033[32m'; Y='\033[33m'; M='\033[35m'; R='\033[0m'
else
  B=''; D=''; C=''; G=''; Y=''; M=''; R=''
fi

# ── aggregate transcript ──────────────────────────────────────────────────────
read -r USER_MSGS ASST_MSGS OUT_TOK IN_TOK CACHE_RD CACHE_WR MODEL STARTED MINUTES <<EOF
$(jq -rs '
  def ts: sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601? // empty;
  [ .[] | select(.type=="user" and (.message.content|type)=="string") ] as $u |
  [ .[] | select(.type=="assistant") ] as $a |
  [ .[] | .timestamp? // empty | ts ] as $t |
  [ ($u|length),
    ($a|length),
    ([$a[].message.usage.output_tokens // 0] | add // 0),
    ([$a[].message.usage.input_tokens // 0] | add // 0),
    ([$a[].message.usage.cache_read_input_tokens // 0] | add // 0),
    ([$a[].message.usage.cache_creation_input_tokens // 0] | add // 0),
    ($a[-1].message.model // "?"),
    (if ($t|length) > 0 then ($t|min|strftime("%H:%M")) else "?" end),
    (if ($t|length) > 1 then ((($t|max) - ($t|min)) / 60 | round) else 0 end)
  ] | @tsv' "$JSONL")
EOF

TOOL_TOTAL="$(jq -rs '[ .[] | select(.type=="assistant") | .message.content[]?
  | select(.type=="tool_use") ] | length' "$JSONL")"
TOOLS="$(jq -rs '[ .[] | select(.type=="assistant") | .message.content[]?
  | select(.type=="tool_use") | .name ]
  | group_by(.) | map({n: .[0], c: length}) | sort_by(-.c) | .[:6][]
  | "\(.c)\t\(.n)"' "$JSONL")"
TOOL_MAX="$(printf '%s\n' "$TOOLS" | awk -F'\t' 'NR==1{print $1+0}')"

# ── cost sidecar (optional; schema is internal to Claude Code) ────────────────
COST_USD="—"; CTX_PCT="—"; TURNS="—"; ADDED="—"; REMOVED="—"; SPARK=""; SPARK_N=0
if (( ${#COST_FILES[@]} > 0 )); then
  read -r COST_USD CTX_PCT TURNS ADDED REMOVED <<EOF
$(jq -rs '
  sort_by(.timestamp // "") |
  [ (.[-1].cumulative_cost_usd // 0 | . * 100 | round / 100),
    (.[-1].context_pct // "—"),
    (.[-1].sample // .[-1].turn // "—"),
    ([.[].lines_added // 0] | add // 0),
    ([.[].lines_removed // 0] | add // 0)
  ] | @tsv' "${COST_FILES[@]}")
EOF
  IFS=$'\t' read -r SPARK SPARK_N <<EOF
$(jq -rs '
    sort_by(.timestamp // "") |
    "▁▂▃▄▅▆▇█" as $s |
    [ .[-30:][] | .cost_delta_usd // 0 ] as $d |
    ($d | max // 0) as $m |
    if $m <= 0 then "\t0" else
      ([ $d[] | ((. / $m * 7) | floor) as $i | $s[$i:$i+1] ] | join(""))
      + "\t" + ($d | length | tostring)
    end' "${COST_FILES[@]}")
EOF
fi

fmt() { awk -v n="$1" 'BEGIN{ if (n>=1000000) printf "%.1fM", n/1000000; else if (n>=1000) printf "%.1fk", n/1000; else printf "%d", n }'; }
line() { printf "${D}%s${R}\n" "──────────────────────────────────────────────────────"; }

# ── render ────────────────────────────────────────────────────────────────────
echo
printf "${B}${C} Session ${R}${D}%s…${R}  ${D}model${R} %s  ${D}since${R} %s UTC (%sm)\n" \
  "${SESSION_ID:0:8}" "$MODEL" "$STARTED" "$MINUTES"
line
printf "${B} Conversation${R}   %s user ⇄ %s assistant msgs   %s cost samples\n" "$USER_MSGS" "$ASST_MSGS" "$TURNS"
printf "${B} Tokens${R}         out ${G}%s${R}  in %s  cache-read ${C}%s${R}  cache-write %s\n" \
  "$(fmt "$OUT_TOK")" "$(fmt "$IN_TOK")" "$(fmt "$CACHE_RD")" "$(fmt "$CACHE_WR")"
printf "${B} Cost / ctx${R}     ${Y}\$%s${R}   context %s%%   ${G}+%s${R}/${M}-%s${R} lines\n" \
  "$COST_USD" "$CTX_PCT" "$ADDED" "$REMOVED"
[[ -n "$SPARK" ]] && printf "${B} \$/sample${R}       ${Y}%s${R} ${D}(last %s samples)${R}\n" "$SPARK" "$SPARK_N"
line
printf "${B} Tools${R} (%s calls)\n" "$TOOL_TOTAL"
if [[ "$TOOL_TOTAL" -eq 0 ]]; then
  printf "   ${D}none yet${R}\n"
else
  while IFS=$'\t' read -r c n; do
    [[ -z "${c:-}" ]] && continue
    w=$(( c * 24 / (TOOL_MAX > 0 ? TOOL_MAX : 1) )); (( w < 1 )) && w=1
    bar="$(printf '█%.0s' $(seq 1 "$w"))"
    printf "   %-18s ${C}%s${R}%*s %s\n" "$n" "$bar" "$(( 24 - w ))" "" "$c"
  done <<< "$TOOLS"
fi
line
echo
