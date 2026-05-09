# Plan: Reduce Multi-Turn File Discovery — Targeted Revision

> **Status:** Ready for implementation. Supersedes `plan-22-file-discovery-reduction.md`.
> **Goal:** Replace the 8-12 turn iterative discovery loop with 2-3 deterministic bash calls, while preserving signal quality and avoiding the over-corrections of the v1 plan.

---

## What We Learned From v1 and Real Traces

The v1 plan had the right diagnosis but over-corrected in two places:

1. **`--files-only` was too aggressive.** It eliminated the contextual signal LLMs use to triage relevance — leading to pressure for speculative `Read` calls on files the LLM couldn't evaluate from paths alone.
2. **The hard prohibition on Glob/Grep was unworkable.** Targeted symbol lookups ("find callers of X") are legitimately cheaper as a quick Grep than re-running a discovery script.

A real trace of a brownfield architecture session showed **12 tool calls, 1,357 lines consumed, and 4 unproductive "guessing" reads** — all driven by the LLM feeling around in the dark without a structured map. The scripts + refined guidance would have reduced this to **4 calls and ~180 lines**.

---

## The Targeted Approach: 4 Steps

Each step is scoped to a single file change. Ordered by impact-per-effort.

---

### Step 1: Cap Per-File Matches in `search-codebase.sh`

**File:** `dev-pipeline/scripts/search-codebase.sh`

**Change:** Make `grep -rn -m 3` the default. Add `--max-matches N` flag (default 3, 0 for unlimited).

**Implementation:**

```bash
# Parse --max-matches or -m flag
MAX_MATCHES=3
if [[ "$1" == "--max-matches" || "$1" == "-m" ]]; then
    MAX_MATCHES="$2"
    shift 2
fi

# In search_keyword():
if [[ "$MAX_MATCHES" == "0" ]]; then
    grep -rn "$kw" "$TARGET_DIR" 2>/dev/null >> "$tmp_content_matcher"
else
    grep -rn -m "$MAX_MATCHES" "$kw" "$TARGET_DIR" 2>/dev/null >> "$tmp_content_matcher"
    # Check if truncation occurred and append indicator
    local count
    count=$(grep -rn "$kw" "$TARGET_DIR" 2>/dev/null | wc -l)
    if [[ "$count" -gt "$MAX_MATCHES" ]]; then
        echo "  ... ($((count - MAX_MATCHES)) more matches — use --max-matches 0 or Read this file for full content)" >> "$tmp_content_matcher"
    fi
fi
```

**Why 3:** Preserves enough context to judge relevance ("is this the `auth` I'm looking for?") without the 200-line-per-file explosion from high-frequency keywords. One match is too little; 10 is too much. 3 is the triage threshold.

**Truncation indicator:** Essential. Without it, the LLM assumes 3 lines is the full file and won't request a targeted `Read` when it needs more.

---

### Step 2: Size Guard + Auto-Detection in `file-tree.sh`

**File:** `dev-pipeline/scripts/file-tree.sh`

**Changes (two in one):**

1. **Replace hardcoded subdirectory list** (`scripts skills agents rules specs`) with auto-detection + `EXPAND_DIRS` override.
2. **Cap total output at 400 entries** with truncation messaging.

**Implementation:**

```bash
# --- Auto-detect subdirectories to expand ---
if [[ -n "$EXPAND_DIRS" ]]; then
    read -ra SUBDIRS <<< "$EXPAND_DIRS"
else
    mapfile -t SUBDIRS < <(find "$TARGET_DIR" -maxdepth 1 -mindepth 1 -type d \
        -not -path "*/node_modules" -not -path "*/.git" \
        -not -path "*/__pycache__" -not -path "*/target" \
        -not -path "*/dist" -not -path "*/build" -not -path "*/vendor" \
        -not -path "*/\.*" | sort)
fi

# --- Output with entry cap ---
ENTRY_COUNT=0
ENTRY_LIMIT=400

echo "=== File Tree: $(basename "$TARGET_DIR") ==="

# ... (tree traversal logic) ...

# After each entry is printed:
((ENTRY_COUNT++))
if [[ "$ENTRY_COUNT" -ge "$ENTRY_LIMIT" ]]; then
    echo ""
    echo "# Output truncated at $ENTRY_LIMIT entries."
    echo "# Top-level dirs: $(find "$TARGET_DIR" -maxdepth 1 -mindepth 1 -type d -not -path "*/\.*" -not -path "*/node_modules" | sort | xargs -n1 basename | tr '\n' ' ' )"
    echo "# Re-run with EXPAND_DIRS=\"...\" or MAX_DEPTH=2 to focus."
    echo "# $ENTRY_COUNT entries, ~$(du -sh /dev/stdin 2>/dev/null || echo "?")"
    exit 0
fi

# --- Footer: always emit size hint ---
echo "# $ENTRY_COUNT entries, ~${#tree_output} bytes"
```

**Top-level dir hint in truncation:** When the cap fires, the LLM sees exactly which directories exist — enough to make an informed `EXPAND_DIRS` re-run without guessing.

---

### Step 3: Two-Tier Discovery Guidance in `plan-architecture/SKILL.md`

**File:** `dev-pipeline/skills/plan-architecture/SKILL.md`

**Replace the Context Gathering section (lines 54–80) with:**

```markdown
## Context Gathering

Context gathering is a **one-time, upfront bash sequence** (2 calls, not 12).
Run both scripts before the conversation begins. Then make targeted `Read`
calls only on files surfaced by the keyword search. Do not read files that
appear in the tree but not in the search results — if they were relevant to
your feature, your keywords would have found them.

**Step 1 — File tree (run first):**

```bash
./dev-pipeline/scripts/file-tree.sh [<directory>]
```

Extract: tech stack, top-level layout, directory conventions, where things live.
If output is truncated, re-run with `EXPAND_DIRS="dir1 dir2"` targeting the
feature area. Do not read files from the tree alone — filenames are not enough
to judge relevance.

**Step 2 — Keyword search (run second, with informed keywords):**

```bash
./dev-pipeline/scripts/search-codebase.sh -m 3 <kw1> <kw2> ...
```

Extract: which files match, which directories they cluster in, any unexpected
cross-cutting hits. The `-m 3` cap keeps output bounded. If a file looks
relevant from its 3-line preview, use a targeted `Read` to see more — not
speculatively, only when the preview signals a pattern you need.

**Keyword selection:** Use noun phrases — module names, entity names, file-name
fragments, domain words (e.g. `auth`, `UserService`, `SKILL`, `migration`,
`Proposal`, `Lens`). Avoid verbs (`add`, `fix`), adjectives (`new`), and
generic terms (`file`, `module`, `utils`). Aim for 3–6 keywords derived from
the brief or REQ.

**Keyword calibration:**
- If Step 2 returns **>100 content matches**: keywords are too broad. Remove
the most generic term and re-run.
- If Step 2 returns **<5 files**: keywords are too narrow. Add a broader synonym
or the parent module name and re-run.
- After **two attempts** with different keyword sets, if expected files are still
missing, use a single targeted `Glob` on the suspected directory as a last
resort. Do not iterate further.

**Step 3 — Targeted Read (exception only, not default):**

`Read` a specific file **only** when:
1. It appeared in Step 2's results AND its 3-line preview signals a pattern
   you need to understand for the design, OR
2. You need the exact definition of a specific symbol (type, interface, function)
   found in the search results.

This is the exception. Do not `Read` speculatively. Do not read files from the
tree that didn't appear in search results.

**What to do instead of speculative reads:**
- "I wonder how auth works" → re-run `search-codebase.sh` with `auth` as a keyword
- "Find callers of `parseConfig`" → a single targeted `Grep` is fine and cheaper
  than re-running the discovery script
- "What's in `src/utils/`" → this is speculative exploration. Run the keyword
  search with `utils` + feature name, not a `Glob` + sequential reads
```

**Replace the Phase D2 "Before walking the code" block (lines 183–190) with:**

```markdown
**Before walking the code**, run a targeted keyword search to get the affected-area
map in one call:

```bash
./dev-pipeline/scripts/search-codebase.sh -m 3 <module-name> <related-keywords>
```

Extract the file list from the output. Use targeted `Read` only on files whose
3-line preview indicates they contain a pattern you need to understand. Do not
read files that appeared in the tree but not in the search results.
```

**Key addition vs. v1:** The rule *"Do not read files that appear in the tree but not in the search results"* closes the loophole where the LLM reads `sessions.ts` just because it saw it in the tree, even though the task is about proposals.

---

### Step 4: Delete Context Gathering from `plan-requirements/SKILL.md`

**File:** `dev-pipeline/skills/plan-requirements/SKILL.md`

**Delete:** The entire `## Context Gathering` section (lines 49–74).

**Rationale (unchanged):** Requirements come from user intent, not code survey.
Running keyword searches before the interview anchors the interviewer to
solution-space patterns before the user has stated intent.

**Add to existing `## Important Reminders` section** (after the first bullet):

```markdown
- If the user references specific existing files, modules, or a document path in
their brief, read that document or run `./dev-pipeline/scripts/file-tree.sh` to
orient yourself — but do not run general keyword searches before the interview.
Requirements come from the user's intent, not from surveying the codebase.
```

---

### Step 5: Size Hint Instrumentation (Both Scripts)

**Files:** Both `file-tree.sh` and `search-codebase.sh`

**Change:** Emit a one-line size hint as the final line of output:

```bash
# 247 entries, ~3.1KB
```

**Implementation in `file-tree.sh`:**
```bash
# At the end of the script, after all output:
echo "# $ENTRY_COUNT entries, ~$(echo "$tree_output" | wc -c) bytes"
```

**Implementation in `search-codebase.sh`:**
```bash
# At the end of the script, in the summary block:
total_files=$(wc -l < "$tmp_name_matcher" 2>/dev/null || echo 0)
total_matches=$(wc -l < "$tmp_content_matcher" 2>/dev/null || echo 0)
total_bytes=$(stat -f%z "$tmp_name_matcher" 2>/dev/null || stat -c%s "$tmp_name_matcher" 2>/dev/null || echo 0)
echo "# $total_files files, $total_matches content matches, ~${total_bytes} bytes"
```

**Purpose:** This is instrumentation, not behavior change. Once flowing through
sessions, correlate discovery output size with downstream `Read` counts:

| Discovery size | Downstream Reads | Interpretation |
|---------------|------------------|----------------|
| Small + many Reads | Keywords too narrow | LLM fishing |
| Large + many Reads | Tree too broad | LLM overwhelmed |
| Large + few Reads | Good triage | Efficient follow-up |
| Small + few Reads | Trivial task or LLM gave up | Investigate |

Use this data to decide whether `--files-only` (deferred) is worth adding.

---

## What's Deferred

| Feature | Why Deferred | Revisit When |
|--------|-------------|------------|
| `--files-only` flag | `-m 3` achieves 60-80% of the bytes-savings without discarding signal | Data shows session classes where path-only is sufficient |
| `MAX_DEPTH` env var | Ships alongside `EXPAND_DIRS` in Step 2 | Tree truncation fires frequently in practice |

---

## Implementation Order

1. `search-codebase.sh` — `-m 3` default + `--max-matches` flag + truncation indicator + size hint
2. `file-tree.sh` — auto-detection + `EXPAND_DIRS` + 400-entry cap + truncation messaging + size hint
3. `plan-architecture/SKILL.md` — two-tier Context Gathering + keyword calibration + anti-speculative-read rule
4. `plan-requirements/SKILL.md` — section deletion + conditional note

No dependencies between steps. Can be shipped independently. Recommended: 1→2→3→4.

---

## Verification Checklist

### search-codebase.sh
- [ ] `./search-codebase.sh -m 3 auth` → max 3 lines per file, truncation indicator when >3 matches exist
- [ ] `./search-codebase.sh --max-matches 0 auth` → unlimited matches (old behavior)
- [ ] `./search-codebase.sh auth` (no flag) → defaults to `-m 3`
- [ ] Final line shows: `# N files, M matches, ~K bytes`

### file-tree.sh
- [ ] In a repo with subdirs → auto-expands all non-trivial directories, no hardcoded list
- [ ] `EXPAND_DIRS="src tests" ./file-tree.sh` → expands only those two
- [ ] In a 500+ file repo → truncates at 400 entries, shows top-level dirs in footer
- [ ] Final line shows: `# N entries, ~K bytes`

### plan-architecture/SKILL.md
- [ ] Context Gathering section: (a) two-tier guidance present, (b) keyword calibration rules present, (c) "don't read files not in search results" rule present, (d) "targeted Grep is fine" escape hatch present
- [ ] Phase D2 block references `-m 3` flag
- [ ] No hard prohibition on all Glob/Grep usage

### plan-requirements/SKILL.md
- [ ] No Context Gathering section exists
- [ ] Important Reminders contains conditional note with exact wording

---

## Critical Files

- `dev-pipeline/scripts/search-codebase.sh`
- `dev-pipeline/scripts/file-tree.sh`
- `dev-pipeline/skills/plan-architecture/SKILL.md` (lines 54–80 and 183–190)
- `dev-pipeline/skills/plan-requirements/SKILL.md` (lines 49–74 and Important Reminders)

---

## Expected Impact

Based on the brownfield trace analysis:

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Discovery tool calls | 8–12 | 2–3 | **-70%** |
| Lines consumed in discovery | 1,000–1,400 | 100–200 | **-85%** |
| Unproductive "guessing" reads | 3–5 | 0 | **-100%** |
| Round trips to start design | 10–14 | 3–5 | **-70%** |

Token costs: Input tokens may increase slightly (tree dump is larger than targeted queries), but output tokens and round-trip latency drop significantly. The dominant cost in most LLM APIs is round trips × latency, not input token volume.
