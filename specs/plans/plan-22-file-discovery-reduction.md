# Plan: Reduce Multi-Turn File Discovery in plan-architecture and plan-requirements

## Context

The PR on `feat/22/optimize-file-reads-replace-glob-grep-with-native-bash` added two bash scripts (`file-tree.sh`, `search-codebase.sh`) and "Context Gathering" sections to both `plan-architecture` and `plan-requirements` SKILL.md files. The intent is to replace iterative Glob/Grep/Read tool calls with one or two upfront bash invocations.

The scripts are good infrastructure but three problems remain:

1. `search-codebase.sh` returns full line content for content matches — very verbose for discovery (file paths are what you need, not line text)
2. `file-tree.sh` hardcodes subdirectory expansion to `scripts skills agents rules specs` — won't generalize
3. The SKILL.md instructions are too loose: no prohibition on Glob/Grep fallback, no keyword extraction guidance, no "when is enough enough" rule — so Claude may still do iterative discovery after running the scripts
4. `plan-requirements` doesn't need codebase search at all (it's a problem-space interview) — the current section risks anchoring the interviewer to solution-space patterns

## Changes

### 1. `dev-pipeline/scripts/search-codebase.sh`

Add a `--files-only` flag (and `FILES_ONLY=1` env var alternative).

- Parse `--files-only` as the first positional arg; shift it off before collecting keywords
- In `search_keyword()`: when `FILES_ONLY=1`, use `grep -rl` instead of `grep -rn` and append results to `tmp_name_matcher` (not `tmp_content_matcher`) — they're file paths, so they flow into the "Files Found" table naturally; deduplication via `sort -u` handles overlaps with `find -name` results correctly
- "Content Matches" section will hit the empty branch in files-only mode — that's correct
- Update header comment to document the flag
- Update summary line to include `[mode: files-only | full]`

### 2. `dev-pipeline/scripts/file-tree.sh`

Replace hardcoded subdirectory list with auto-detection + `EXPAND_DIRS` override.

- Replace the `for subdir in scripts skills agents rules specs` loop with:
  - If `EXPAND_DIRS` env var is set: use that space-separated list
  - Otherwise: auto-detect via `find "$TARGET_DIR" -maxdepth 1 -mindepth 1 -type d -not -path "*/\.*"`, skip `node_modules .git __pycache__ target dist build vendor`, include subdirs that contain at least one file (`find -maxdepth 3 -type f | grep -q .`)
- Update header comment to document `EXPAND_DIRS` and `MAX_DEPTH`

### 3. `dev-pipeline/skills/plan-architecture/SKILL.md`

**Replace the `## Context Gathering` section** (lines 54–80, added in this PR) with this precise version:

```markdown
## Context Gathering

Context gathering is a **one-time, upfront bash sequence**. Run both scripts before
the conversation begins. Do not use Glob, Grep, or Read for general discovery —
if a file you expected is missing, re-run `search-codebase.sh` with better keywords.
Targeted `Read` calls on specific files are allowed as a follow-up, not as discovery.

**Step 1 — File tree (run first):**

```bash
./dev-pipeline/scripts/file-tree.sh [<directory>]
```

Extract: tech stack, top-level layout, directory names relevant to the feature.

**Step 2 — Files-only keyword search (run second):**

```bash
./dev-pipeline/scripts/search-codebase.sh --files-only <kw1> <kw2> ...
```

Extract: which files match, which directories they cluster in, any unexpected
cross-cutting hits.

**Keyword selection:** Use noun phrases — module names, entity names, file-name
fragments, domain words (e.g. `auth`, `UserService`, `SKILL`, `migration`).
Avoid verbs (`add`, `fix`), adjectives (`new`), and generic terms (`file`, `module`).
Aim for 3–6 keywords derived from the brief or REQ.

**Step 3 — Targeted Read (exception only):**

If a specific file from Step 2 needs its content inspected to understand an existing
pattern, `Read` that file. This is the exception. Do not `Read` speculatively.

**Hard rule:** Do not use Glob, Grep, or Read for general discovery.
If a file is missing from script output, re-run with better keywords — do not
fall back to iterative tool calls.
```

**Also replace the Phase D2 "Before walking the code" block** (lines 183–190):

```markdown
**Before walking the code**, run `search-codebase.sh` in files-only mode to get the
affected-area map in one call:

```bash
./dev-pipeline/scripts/search-codebase.sh --files-only <module-name> <related-keywords>
```

Extract the file list from the output. If content of a specific file is needed to
understand an existing pattern, use a targeted `Read`. Do not use iterative Glob
or Grep — if a file isn't in the output, re-run with a better keyword.
```

### 4. `dev-pipeline/skills/plan-requirements/SKILL.md`

**Delete the entire `## Context Gathering` section** (lines 49–74).

Rationale: plan-requirements is a problem-space interview. Running codebase search before the interview anchors the interviewer to solution-space patterns (existing modules, naming conventions) before the user has stated intent. Requirements come from the user's mind, not from surveying the code.

**Add a single conditional note to the existing `## Important Reminders` section** (after the first bullet):

```markdown
- If the user references specific existing files, modules, or a document path in
  their brief, read that document or run `./dev-pipeline/scripts/file-tree.sh` to
  orient yourself — but do not run general keyword searches before the interview.
  Requirements come from the user's intent, not from surveying the codebase.
```

## Implementation Order

1. `search-codebase.sh` — flag implementation (no dependencies)
2. `file-tree.sh` — standalone bash change (no dependencies)
3. `plan-architecture/SKILL.md` — depends on `--files-only` flag existing to reference it
4. `plan-requirements/SKILL.md` — standalone section deletion + note addition

## Verification

- Run `./dev-pipeline/scripts/search-codebase.sh --files-only SKILL review` — output should show "Files Found" table with file paths only; "Content Matches" section should be empty or absent
- Run `FILES_ONLY=1 ./dev-pipeline/scripts/search-codebase.sh SKILL` — same result via env var
- Run `./dev-pipeline/scripts/file-tree.sh` in this repo — output should auto-expand `dev-pipeline/`, `specs/`, `.claude/` (and any other non-trivial subdirs) without hardcoded names
- Run `EXPAND_DIRS="dev-pipeline specs" ./dev-pipeline/scripts/file-tree.sh` — should expand only those two
- Read the new `plan-architecture/SKILL.md` Context Gathering section and confirm: (a) hard prohibition on Glob/Grep is explicit, (b) keyword guidance is concrete, (c) targeted Read exception is clearly labeled as exception not default
- Read `plan-requirements/SKILL.md` — confirm no Context Gathering section exists; confirm the Important Reminders note is present and conditional ("if the user references...")

## Critical Files

- `dev-pipeline/scripts/search-codebase.sh`
- `dev-pipeline/scripts/file-tree.sh`
- `dev-pipeline/skills/plan-architecture/SKILL.md` (lines 54–80 and 183–190)
- `dev-pipeline/skills/plan-requirements/SKILL.md` (lines 49–74 and the Important Reminders section)
