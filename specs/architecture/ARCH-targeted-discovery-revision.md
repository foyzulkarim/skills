# Architecture: Targeted Discovery Revision — Reduce Multi-Turn File Discovery

> **Date:** 2026-05-09
> **Phase:** 2 of 5 (System Architecture)
> **Requirements source:** Standalone brief — `specs/plans/plan-targeted-revision.md` + `specs/plans/plan-22-file-discovery-reduction.md` (v1, superseded)
> **Type:** improvement / refactor
> **GitHub Issue:** #22

## Architecture Summary

Replace the 8–12 turn iterative discovery loop in brownfield architecture sessions with 2–3 deterministic bash calls. Two bash scripts (`search-codebase.sh`, `file-tree.sh`) receive backward-compatible improvements: a per-file match cap (`-m 3` default), auto-detection of subdirectories, output size caps, and size-hint footers for measurement. Two new SKILL.md v2 files (`plan-architecture-v2`, `plan-requirements-v2`) receive revised guidance that encodes keyword calibration thresholds and an explicit anti-speculative-read rule. The originals (`plan-architecture`, `plan-requirements`) are untouched — zero diff vs master — serving as a behavioral control for self-testing.

## Inferred Requirements

| ID  | Inferred Requirement | Source |
|-----|----------------------|--------|
| R1  | `search-codebase.sh` must cap output to 3 matches per file by default, with a flag to override | plan-targeted-revision.md Step 1 |
| R2  | When output is capped, a truncation indicator must appear so the LLM knows more matches exist | plan-targeted-revision.md Step 1 |
| R3  | `file-tree.sh` must auto-detect subdirectories rather than relying on a hardcoded list | plan-targeted-revision.md Step 2 |
| R4  | `file-tree.sh` must cap total output at 400 entries and emit top-level dirs on truncation | plan-targeted-revision.md Step 2 |
| R5  | Both scripts must emit a size-hint footer as their final output line | plan-targeted-revision.md Step 5 |
| R6  | `plan-architecture-v2/SKILL.md` must encode two-tier discovery guidance, keyword calibration thresholds, and an anti-speculative-read rule | plan-targeted-revision.md Step 3 |
| R7  | `plan-requirements-v2/SKILL.md` must remove all codebase search instructions; requirements come from user intent only | plan-targeted-revision.md Step 4 |
| R8  | Original `plan-architecture/SKILL.md` and `plan-requirements/SKILL.md` must not appear in the PR diff | decision: v2-as-test-variants |

## High-Level Structure

```
┌──────────────────────────────────────────────────────┐
│  Layer 1: Script primitives (shared, affect all)     │
│                                                      │
│  search-codebase.sh                                  │
│    + --max-matches/-m flag (default 3, 0=unlimited)  │
│    + per-file truncation indicator                   │
│    + size hint footer                                │
│                                                      │
│  file-tree.sh                                        │
│    + auto-detect subdirs (replaces hardcoded list)   │
│    + EXPAND_DIRS env var override                    │
│    + 400-entry cap + truncation messaging            │
│    + size hint footer                                │
└──────────────────────────────────────────────────────┘
         ↑ explicitly invoked by
┌──────────────────────────────────────────────────────┐
│  Layer 2: v2 SKILL.md guidance (isolated variants)   │
│                                                      │
│  plan-architecture-v2/SKILL.md                       │
│    → calls both scripts (two-tier sequence)          │
│    → keyword calibration rules                       │
│    → anti-speculative-read rule                      │
│    → targeted Grep escape hatch for symbol lookups   │
│                                                      │
│  plan-requirements-v2/SKILL.md                       │
│    → calls no scripts                                │
│    → Context Gathering section deleted               │
│    → conditional note in Important Reminders only    │
└──────────────────────────────────────────────────────┘

plan-architecture/SKILL.md   ← untouched (zero diff vs master)
plan-requirements/SKILL.md   ← untouched (zero diff vs master)
```

## Tech Choices

| Area | Decision | Alternatives Considered | Rationale |
|------|----------|------------------------|-----------|
| Match cap mechanism | `grep -rn -m N` (per-file cap) | Global `MAX_RESULTS` env var (existing) | Per-file cap preserves signal across many files; global cap could exhaust budget on the first high-frequency file |
| Count pass for truncation indicator | `grep -rc "$kw"` (count-only, per-file) | Second full `grep -rn` | Avoids paying the expensive scan twice; `-c` flag returns counts only, no content |
| Subdir auto-detection | `find -maxdepth 1 -type d` with exclusion list | Keep hardcoded list | Hardcoded list breaks on any non-standard repo layout; find-based is generic |
| EXPAND_DIRS mechanism | Environment variable | CLI flag | Consistent with existing `MAX_RESULTS` and `MAX_DEPTH` env var pattern in the scripts |
| Size hint | `wc -c` on captured output variable | `du -sh /dev/stdin` | `du -sh /dev/stdin` doesn't work on piped output; `wc -c` on a captured variable is reliable cross-platform |
| v2 placement | New skill directories alongside originals | Modify originals in-place | Originals remain as behavioral control for side-by-side self-testing without any diff on master |

## Patterns & Conventions

- **Env var for tunables** — `EXPAND_DIRS`, `MAX_DEPTH`, `MAX_RESULTS` follow the existing env-var-as-override convention already in both scripts
- **Backward compatibility** — `--max-matches 0` restores unlimited behavior; no existing caller breaks
- **Truncation with guidance** — when output is capped, the indicator tells the LLM exactly what to do next (`--max-matches 0` or targeted `Read`), closing the silent-truncation trap
- **Size hints as instrumentation** — the footer line is measurement scaffolding, not behavioral change; correlate discovery output size with downstream Read counts across sessions

## API Contracts / Interfaces

### `search-codebase.sh` CLI

**New flag:**
```
./search-codebase.sh [-m N | --max-matches N] <kw1> <kw2> ...
```

| Flag | Default | Behavior |
|------|---------|----------|
| `-m N` / `--max-matches N` | `3` | Cap matches per file to N |
| `--max-matches 0` | — | Unlimited (old behavior) |
| _(no flag)_ | `3` | Defaults to 3 matches per file |

**Truncation indicator** (appended to `tmp_content_matcher` when any file has more matches than the cap):
```
  ... (N more matches in <file> — use --max-matches 0 or Read this file for full content)
```

**Size hint footer** (final output line):
```
# F files, M content matches, ~K bytes
```

### `file-tree.sh` CLI

**New env vars:**
```
EXPAND_DIRS="dir1 dir2" ./file-tree.sh [<directory>]
MAX_DEPTH=2 ./file-tree.sh [<directory>]
```

| Env var | Default | Behavior |
|---------|---------|----------|
| `EXPAND_DIRS` | _(auto-detect)_ | Space-separated list of dirs to expand; bypasses auto-detection |
| `MAX_DEPTH` | `4` | Existing var; unchanged |

**Truncation messaging** (when entry count hits 400):
```
# Output truncated at 400 entries.
# Top-level dirs: dir1 dir2 dir3 ...
# Re-run with EXPAND_DIRS="..." or MAX_DEPTH=2 to focus.
```

**Size hint footer** (final output line):
```
# N entries, ~K bytes
```

## Change Footprint

### Modified files

| Path | What changes here |
|------|------------------|
| `dev-pipeline/scripts/search-codebase.sh` | Add `--max-matches`/`-m` flag parsing; change `grep -rn` to `grep -rn -m "$MAX_MATCHES"` in `search_keyword()`; add truncation indicator using `grep -rc` for count; add size hint footer |
| `dev-pipeline/scripts/file-tree.sh` | Replace hardcoded `for subdir in scripts skills agents rules specs` loop with `find -maxdepth 1 -type d` auto-detection; add `EXPAND_DIRS` override; add entry counter + 400-cap + truncation message; add size hint footer |

### New files

| Path | Purpose | Pattern reference |
|------|---------|------------------|
| `dev-pipeline/skills/plan-architecture-v2/SKILL.md` | Revised plan-architecture guidance with two-tier discovery, keyword calibration, anti-speculative-read rule | Copy of `plan-architecture/SKILL.md` with targeted section replacements |
| `dev-pipeline/skills/plan-requirements-v2/SKILL.md` | Revised plan-requirements guidance with Context Gathering removed | Copy of `plan-requirements/SKILL.md` with section deletion + note addition |

### Untouched (zero diff vs master)

| Path | Why it matters |
|------|---------------|
| `dev-pipeline/skills/plan-architecture/SKILL.md` | Behavioral control — must be identical to master for side-by-side testing to be valid |
| `dev-pipeline/skills/plan-requirements/SKILL.md` | Behavioral control — same reason |

### Touched-but-not-changed (silent regression hotspots)

| Path | Why it matters |
|------|---------------|
| All skills that call `search-codebase.sh` | Will silently get `-m 3` default behavior; existing callers that expected unlimited output may see truncated results |
| All skills that call `file-tree.sh` | Will get auto-detected subdirs instead of hardcoded list; repos not matching `scripts/skills/agents/rules/specs` layout now expand correctly |

## Areas of Impact

| Area | Impact | Risk | Why |
|------|--------|------|-----|
| `plan-architecture` sessions (original) | Script output changes (capped, size-hinted) but SKILL.md guidance unchanged | L | Script changes are backward-compatible; original guidance still works, just gets better script output |
| `plan-architecture-v2` sessions | Both script improvements + new guidance — expected 70% reduction in discovery calls | L | Designed change; this is the intent |
| `plan-requirements-v2` sessions | No script calls; Context Gathering removed | L | Designed change |
| Any skill calling `search-codebase.sh` with high-frequency keywords | Output now capped at 3 per file; was previously unlimited (up to `MAX_RESULTS=100` per keyword globally) | M | A keyword that previously returned 200 lines now returns at most 3 per file + truncation indicators; LLM may need to adapt |
| `file-tree.sh` on repos with non-standard top-level layout | Now expands all non-trivial dirs, not just `scripts/skills/agents/rules/specs` | L | Improvement; only risk is a very wide tree on monorepos hitting the 400-entry cap early |

**Contract changes:** None. Both scripts are bash CLIs with no callers expecting a specific structured format beyond the existing markdown output.

**Cross-cutting ripples:** Size hint footers create a new measurement surface — future sessions can correlate discovery output size with downstream Read counts to decide whether deferred features (`--files-only`, `MAX_DEPTH` env var) are worth implementing.

## Detailed Design Notes

### `search-codebase.sh` — Implementation-critical details

**Flag parsing** must happen before keyword collection. Current script collects `KEYWORDS=("$@")` immediately. New flow:

```
parse --max-matches/-m → set MAX_MATCHES (default 3)
shift consumed args
collect remaining args as KEYWORDS
```

**`grep -m N` is per-file, not total.** `grep -rn -m 3 "auth"` returns up to 3 matches *per file*, not 3 total. Output could still be 3 × (number of matching files) lines. This is intentional — preserves signal across files — but implementers must not confuse it with a global 3-line cap.

**Truncation indicator via `grep -rc`:**
```bash
local file_counts
file_counts=$(grep -rc "$kw" "$TARGET_DIR" 2>/dev/null)
# For each file where count > MAX_MATCHES, emit indicator
while IFS=: read -r file count; do
  if [[ "$count" -gt "$MAX_MATCHES" ]]; then
    echo "  ... ($((count - MAX_MATCHES)) more matches — use --max-matches 0 or Read $file for full content)" >> "$tmp_content_matcher"
  fi
done <<< "$file_counts"
```

**Size hint footer:**
```bash
total_files=$(wc -l < "$tmp_name_matcher" 2>/dev/null | tr -d ' ' || echo 0)
total_matches=$(wc -l < "$tmp_content_matcher" 2>/dev/null | tr -d ' ' || echo 0)
total_bytes=$(cat "$tmp_name_matcher" "$tmp_content_matcher" 2>/dev/null | wc -c | tr -d ' ')
echo "# $total_files files, $total_matches content matches, ~${total_bytes} bytes"
```

### `file-tree.sh` — Implementation-critical details

**Replace hardcoded loop** (current: `for subdir in scripts skills agents rules specs`) with:
```bash
if [[ -n "${EXPAND_DIRS:-}" ]]; then
  read -ra SUBDIRS <<< "$EXPAND_DIRS"
else
  mapfile -t SUBDIRS < <(find "$TARGET_DIR" -maxdepth 1 -mindepth 1 -type d \
    -not -path "*/node_modules" -not -path "*/.git" \
    -not -path "*/__pycache__" -not -path "*/target" \
    -not -path "*/dist" -not -path "*/build" -not -path "*/vendor" \
    -not -path "*/\.*" | sort)
fi
```

**Entry counter + cap:**
```bash
ENTRY_COUNT=0
ENTRY_LIMIT=400
# After each entry printed: ((ENTRY_COUNT++))
# Check: if [[ "$ENTRY_COUNT" -ge "$ENTRY_LIMIT" ]]; then emit truncation message; exit 0; fi
```

**Size hint footer:**
```bash
# Capture output into variable, emit wc -c at end
echo "# $ENTRY_COUNT entries, ~$(printf '%s' "$tree_output" | wc -c | tr -d ' ') bytes"
```

### `plan-architecture-v2/SKILL.md` — Section replacements

**Replace lines 54–80** (current Context Gathering) with the two-tier guidance from `plan-targeted-revision.md` Step 3, including:
- Keyword calibration thresholds: >100 content matches = too broad; <5 files = too narrow; max two re-runs
- Anti-speculative-read rule: do not Read files that appeared in the tree but not in search results
- Targeted Grep escape hatch: single symbol lookups ("find callers of X") are fine

**Replace lines 183–190** (Phase D2 "Before walking the code" block) to reference `-m 3` flag explicitly.

### `plan-requirements-v2/SKILL.md` — Section deletion + note

**Delete** the entire `## Context Gathering` section (lines 49–74).

**Add** to `## Important Reminders` (after first bullet):
> If the user references specific existing files, modules, or a document path in their brief, read that document or run `./dev-pipeline/scripts/file-tree.sh` to orient yourself — but do not run general keyword searches before the interview. Requirements come from the user's intent, not from surveying the codebase.

## Cross-Cutting Concerns

- **Errors:** Scripts use `set -euo pipefail`; no change to error handling posture. `grep` non-matches return exit code 1 — existing `2>/dev/null` suppression handles this.
- **Logging & metrics:** Size hint footer is the only new output; it's the measurement instrument for future optimization decisions.
- **Performance:** `grep -rc` for the count pass is the key performance decision — avoids a second full content scan. On a large repo, even `-rc` scans all files; acceptable since it's count-only (no content buffering).
- **Security:** No new attack surface. Scripts read local filesystem only, no network, no user input beyond CLI args.
- **Rollout:** No deployment. Scripts are bash files; changes are live on merge. SKILL.md v2 variants are independently invokable immediately after merge via `/plan-architecture-v2`.

## Architecture Decisions Log

| # | Decision | Alternatives | Chosen Because | Satisfies |
|---|----------|-------------|----------------|-----------|
| A1 | Per-file cap via `grep -m N`, not global cap | Global `MAX_RESULTS=100` env var | Preserves signal distribution across files; global cap gets exhausted by the first high-frequency file | R1 |
| A2 | `grep -rc` for count pass | Second full `grep -rn` | Avoids double scan cost; web Claude feedback explicitly flagged this | R2 |
| A3 | `EXPAND_DIRS` as env var | New CLI flag | Consistent with `MAX_RESULTS`/`MAX_DEPTH` existing convention | R3 |
| A4 | `wc -c` on captured variable for size hint | `du -sh /dev/stdin` | `du -sh /dev/stdin` doesn't work on piped output; confirmed by web Claude review | R5 |
| A5 | v2 skill variants rather than modifying originals | Modify originals in-place | Originals serve as behavioral control; zero PR diff on originals is a hard requirement | R8 |
| A6 | Ship size hints with Steps 1 & 2 (same files) | Ship size hints as Step 5 last | Size hints are needed to measure improvement from the very first session; shipping last would lose the first data point | R5 |

## Risk & Stress-Test Scenarios

### Forward — runtime failure scenarios

| Scenario | How the Design Handles It |
|----------|--------------------------|
| Keyword matches 500 files, each with >3 matches | `grep -rn -m 3` still scans all 500 files; output is 500×3 = 1,500 lines. Truncation indicators fire for each file with >3 matches. Output is large but bounded per-file. Calibration rules in SKILL.md tell LLM to re-run with narrower keywords. |
| `EXPAND_DIRS` set to a non-existent directory | `find` on a missing dir returns nothing; script emits empty section for that dir, no crash. `set -euo pipefail` won't trigger since `find` exits 0 on empty results. |
| Repo with 50+ top-level dirs (monorepo) | Auto-detection expands all 50+; 400-entry cap fires quickly; truncation message shows top-level dir list so LLM can re-run with `EXPAND_DIRS` targeting the relevant area. |
| `grep -rc` on a binary file | `grep` outputs `binary file matches` or a count; the while-read loop may misparse. Existing `2>/dev/null` suppression handles the warning; `--include` flag could scope to text files if this becomes an issue (implementation decision for tdd phase). |

### Backward — regression risk per touched area

| Touched area | What could regress | Mitigation |
|---|---|---|
| Any existing skill calling `search-codebase.sh` | Currently gets unlimited matches; after change gets `-m 3` default. A skill relying on seeing all matches for a keyword would see truncated output without knowing. | Truncation indicator makes this visible; `--max-matches 0` restores old behavior. Risk is low since existing skills don't specify a match expectation. |
| `file-tree.sh` on this repo (skills repo) | Hardcoded list expands `scripts skills agents rules specs`; auto-detection expands whatever exists at `dev-pipeline/`. Behavioral difference is minimal for this repo but visible in the output. | `EXPAND_DIRS` override available; no callers assert exact output format. |

## Open Questions

- Should `grep -rc` count pass also exclude binary files via `--include="*.{md,sh,ts,js,py,go}"` or similar? Binary file hits produce malformed counts.
  - **Impact if unresolved:** Rare edge case in this repo (all text files); could matter on mixed repos.
  - **Suggested default:** Scope to text files via `--include` with common extensions; add a comment explaining why.

- The 400-entry cap for `file-tree.sh` is derived from reasoning, not measured data. Is it the right threshold?
  - **Impact if unresolved:** Cap might fire too early on mid-sized repos or not fire at all on large ones.
  - **Suggested default:** Ship with 400; re-calibrate once size hint data flows through sessions.

## Out of Scope

- `--files-only` flag for `search-codebase.sh` — deferred until session data shows classes where path-only is sufficient (reason: `-m 3` achieves 60–80% bytes savings without discarding relevance signal)
- `MAX_DEPTH` env var for `file-tree.sh` — deferred; ships alongside `EXPAND_DIRS` if truncation fires frequently in practice
- Modifying original `plan-architecture/SKILL.md` or `plan-requirements/SKILL.md` — explicitly out of scope; originals are the control group

---

# Tasks

## Task T1: search-codebase.sh — match cap, truncation indicator, size hint

> **Status:** done
> **Effort:** s
> **Priority:** critical
> **Depends on:** None
> **Satisfies REQs:** R1, R2, R5
> **Footprint slice:** Modified: `dev-pipeline/scripts/search-codebase.sh`
> **High-risk areas touched:** Any skill calling search-codebase.sh gets `-m 3` default (M risk — truncation indicator mitigates)

### Description

Add `--max-matches`/`-m N` flag (default 3, 0=unlimited) to cap grep output per file. When a file has more matches than the cap, emit a truncation indicator line using `grep -rc` (count-only pass, not a second full scan). Add `# F files, M content matches, ~K bytes` as the final output line.

### Verification

- `./dev-pipeline/scripts/search-codebase.sh SKILL` → max 3 lines per file in content matches; truncation indicator appears for files with >3 matches
- `./dev-pipeline/scripts/search-codebase.sh --max-matches 0 SKILL` → unlimited matches (old behavior)
- `./dev-pipeline/scripts/search-codebase.sh -m 1 SKILL` → max 1 match per file
- Final output line matches `# N files, M content matches, ~K bytes`

### Files Expected

**Modified:** `dev-pipeline/scripts/search-codebase.sh`
**Must NOT modify:** `dev-pipeline/skills/plan-architecture/SKILL.md`, `dev-pipeline/skills/plan-requirements/SKILL.md`

---

## Task T2: file-tree.sh — auto-detect subdirs, EXPAND_DIRS, 400-entry cap, size hint

> **Status:** done
> **Effort:** s
> **Priority:** critical
> **Depends on:** None
> **Satisfies REQs:** R3, R4, R5
> **Footprint slice:** Modified: `dev-pipeline/scripts/file-tree.sh`
> **High-risk areas touched:** Repos not matching hardcoded list now expand correctly (L risk)

### Description

Replace hardcoded `for subdir in scripts skills agents rules specs` loop with `find -maxdepth 1 -type d` auto-detection, excluding noise dirs. Add `EXPAND_DIRS` env var to override auto-detection. Add 400-entry cap that emits top-level dir list and re-run guidance on truncation. Add `# N entries, ~K bytes` as the final output line.

### Verification

- `./dev-pipeline/scripts/file-tree.sh` → expands all non-hidden, non-noise dirs at depth 1 (not just the hardcoded 5)
- `EXPAND_DIRS="dev-pipeline specs" ./dev-pipeline/scripts/file-tree.sh` → expands only those two
- Final output line matches `# N entries, ~K bytes`

### Files Expected

**Modified:** `dev-pipeline/scripts/file-tree.sh`
**Must NOT modify:** `dev-pipeline/skills/plan-architecture/SKILL.md`, `dev-pipeline/skills/plan-requirements/SKILL.md`

---

## Task T3: plan-architecture-v2/SKILL.md — two-tier guidance + keyword calibration

> **Status:** done
> **Effort:** s
> **Priority:** high
> **Depends on:** T1 (references `-m 3` flag)
> **Satisfies REQs:** R6
> **Footprint slice:** New (already copied): `dev-pipeline/skills/plan-architecture-v2/SKILL.md`
> **High-risk areas touched:** None — isolated variant, original untouched

### Description

Replace the Context Gathering section (lines 54–80) with two-tier discovery guidance: file-tree first, keyword search with `-m 3` second, keyword calibration thresholds (>100 = too broad, <5 = too narrow, two-attempt max), anti-speculative-read rule, and targeted Grep escape hatch. Replace the Phase D2 "Before walking the code" block (lines 183–190) to reference `-m 3` explicitly.

### Verification

- Context Gathering section contains: two-step sequence, `-m 3` flag reference, calibration thresholds, "do not Read files not in search results" rule, targeted Grep escape hatch
- Phase D2 "Before walking the code" block references `-m 3`
- No hard prohibition on all Glob/Grep usage (escape hatch present)

### Files Expected

**Modified:** `dev-pipeline/skills/plan-architecture-v2/SKILL.md`
**Must NOT modify:** `dev-pipeline/skills/plan-architecture/SKILL.md`

---

## Task T4: plan-requirements-v2/SKILL.md — remove Context Gathering, add conditional note

> **Status:** done
> **Effort:** xs
> **Priority:** high
> **Depends on:** None
> **Satisfies REQs:** R7
> **Footprint slice:** New (already copied): `dev-pipeline/skills/plan-requirements-v2/SKILL.md`
> **High-risk areas touched:** None — isolated variant, original untouched

### Description

Delete the entire `## Context Gathering` section (lines 49–74). Add a conditional note to `## Important Reminders` (after the first bullet): if the user references specific files/modules, read those or run file-tree.sh — but do not run general keyword searches before the interview.

### Verification

- No `## Context Gathering` section exists in the file
- `## Important Reminders` contains the conditional note about specific file references
- `plan-requirements/SKILL.md` (original) is unchanged

### Files Expected

**Modified:** `dev-pipeline/skills/plan-requirements-v2/SKILL.md`
**Must NOT modify:** `dev-pipeline/skills/plan-requirements/SKILL.md`
