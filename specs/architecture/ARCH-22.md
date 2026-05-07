# Architecture: search-codebase.sh — One-Shot File Discovery and Search

> **Date:** 2026-05-07
> **Phase:** 2 of 5 (System Architecture)
> **Requirements source:** Standalone brief — see Inferred Requirements
> **Type:** feature

## Architecture Summary

A bash script that takes an array of space-separated keywords and searches both filenames and file contents in one deterministic call. The script runs `find` (for filename matching) and `grep` (for content matching) internally, deduplicates results, attributes matches to keywords, and returns structured markdown. The `plan-requirements` skill calls this script instead of making iterative Glob/Grep tool calls — one call, comprehensive results, zero back-and-forth.

## Inferred Requirements

| ID  | Inferred Requirement                          | Source                              |
|-----|----------------------------------------------|-------------------------------------|
| R1  | LLM must be able to invoke the script with keywords in a single Bash call | Issue #22 brief |
| R2  | Script must search both filenames and file contents | Issue #22 brief |
| R3  | Results must show which keyword(s) matched each result | Conversation |
| R4  | Output must be markdown — human-readable and LLM-parseable | Conversation |
| R5  | Results must be deduplicated (same file/line appearing for multiple keywords shows once) | Conversation |
| R6  | Script must be callable from skill SKILL.md files via Bash tool | Conversation |

## High-Level Structure

```
┌──────────────────────────────────────┐
│  LLM (extracts keywords from intent)  │
│  e.g.: Glob, Grep, tools             │
└──────────────┬───────────────────────┘
               │ Bash (one call)
               ▼
┌──────────────────────────────────────┐
│  dev-pipeline/scripts/               │
│  search-codebase.sh                  │
│                                      │
│  - find -name "*${kw}*"              │
│  - grep -rn --line-buffered          │
│  - deduplicate + attribute           │
│  - output markdown                   │
└──────────────┬───────────────────────┘
               │ markdown response
               ▼
┌──────────────────────────────────────┐
│  LLM (uses result, no more turns)    │
└──────────────────────────────────────┘
```

## Tech Choices

| Area           | Decision                    | Alternatives Considered    | Rationale                         |
|----------------|-----------------------------|----------------------------|-----------------------------------|
| Shell          | bash + set -euo pipefail    | sh, zsh                    | Aligns with gh-start-task.sh; portable enough |
| Search (files) | find -name                  | Glob tool                  | Native, no extra dependency       |
| Search (content)| grep -rn --line-buffered   | Grep tool                  | Native, line-buffered for safety  |
| Output format  | markdown tables             | JSON                       | Human-readable on CLI; sufficient structure for LLM |
| Dependencies   | None (standard Unix tools)  | jq, ripgrep                | No added deps; keeps script self-contained |

## Patterns & Conventions

- **Header comment** — script starts with usage docs, examples, and output format description (following gh-start-task.sh pattern)
- **Exit codes** — 0 for success, 1 for usage error, 2+ for search errors
- **Result limits** — max 100 matches per keyword to avoid unbounded output
- **`--line-buffered`** — grep flag prevents buffering issues in pipes

## Script Interface

### Invocation

```bash
./dev-pipeline/scripts/search-codebase.sh Glob Grep tools
./dev-pipeline/scripts/search-codebase.sh "*.md" tools    # quotes for glob patterns with special chars
./dev-pipeline/scripts/search-codebase.sh --help          # show usage
```

### Output Format

```markdown
## search-codebase Results

### Files Found (by name)

| Keywords | Path |
|----------|------|
| Glob, tools | dev-pipeline/skills/tdd/SKILL.md |
| Grep | dev-pipeline/agents/review-orchestrator.md |

### Content Matches

| Keywords | File | Line | Content |
|----------|------|------|---------|
| Glob, Grep, tools | dev-pipeline/skills/tdd/SKILL.md | 15 | `tools: Read, Bash, Glob, Grep` |
| tools | dev-pipeline/agents/code-quality-reviewer.md | 7 | `tools: Read, Bash, Glob, Grep` |

**Summary:** 2 files, 5 matches, 3 keywords searched (Glob, Grep, tools)
```

### Behavior

- Each keyword is searched against **both** filenames (`find -name "*${kw}*"`) and file **contents** (`grep -rn --line-buffered`)
- Results are grouped: "Files Found" (name matches) and "Content Matches" (content matches)
- Each result line shows which keyword(s) matched — deduplicated across keywords
- If no matches: outputs `No matches found.` with exit code 0
- If usage error (no keywords): outputs usage string with exit code 1

## Change Footprint

### New files / modules

| Path                                      | Purpose                              | Pattern reference                  |
|-------------------------------------------|--------------------------------------|------------------------------------|
| `dev-pipeline/scripts/search-codebase.sh` | One-shot file/content search script | Mirrors gh-start-task.sh conventions |

### Modified files / modules

| Path                                              | What changes here                                       |
|---------------------------------------------------|--------------------------------------------------------|
| `dev-pipeline/skills/plan-requirements/SKILL.md`  | Skill instructs LLM to call script instead of Glob/Grep for file discovery |

### Deleted / replaced

| Path    | Reason                                    |
|---------|-------------------------------------------|
| (none)  | No deletions — additive change            |

### Touched but not changed

| Path                             | Why it matters                                                    |
|----------------------------------|-------------------------------------------------------------------|
| `dev-pipeline/scripts/gh-start-task.sh` | Reference pattern; script follows same conventions          |

## Areas of Impact

| Area                    | Impact                                      | Risk (L/M/H) | Why                           |
|-------------------------|---------------------------------------------|--------------|-------------------------------|
| `plan-requirements` skill | Will call script instead of doing manual file discovery | L | New capability; no existing behavior broken |
| LLM interaction pattern | Changes how LLM does file discovery — one call vs iterative | L | Behavioral change but strictly better |
| Other skills (future)   | Script available for any skill to use      | L | Extensibility, not a breaking change |

**Contract changes:** None — this is a new script with markdown output; no external API or contract shift.

**Cross-cutting ripples:** None — script has no dependencies beyond standard Unix tools; no effect on auth, telemetry, migrations, or build.

## Cross-Cutting Concerns

- **Errors:** Usage errors (no args) → exit 1 + usage string; search errors (permission denied) → exit 2 + message; no silent failures
- **Performance:** Bounded by `--max-results` (default 100 per keyword); `find` is fast for filename-only searches; `grep` is the time-consuming part but runs once
- **Security:** No input validation concerns — keywords are treated as literals, not executed; no path traversal risk from keyword input
- **Logging:** Script produces no logs; all output is the structured result

## Architecture Decisions Log

| #   | Decision                              | Alternatives                       | Chosen Because                     | Satisfies REQs |
|-----|---------------------------------------|------------------------------------|------------------------------------|----------------|
| A1  | Keywords as positional args, no flags | `--pattern`/`--search` flag design  | Simpler LLM interface: just pass array | R1            |
| A2  | Deduplicate results with keyword attribution | Return all results, even duplicates | Cleaner for LLM consumption; attribution preserved | R3, R5 |
| A3  | Markdown output                       | JSON                               | Human-readable on CLI; sufficient structure | R4        |
| A4  | Both filename and content search      | Search one or the other            | Single script handles both discovery needs | R2        |

## Risk & Stress-Test Scenarios

### Forward — runtime failure scenarios

| Scenario                              | How the Design Handles It                            |
|---------------------------------------|------------------------------------------------------|
| Keyword matches nothing               | Outputs "No matches found.", exit 0 — not an error |
| Keyword contains special chars (`*`, `?`) | Quoting handled by caller; script receives literal string |
| Very large codebase (10K+ files)      | `find` is fast; grep could be slow — bounded by max-results |
| grep returns binary file matches      | `grep -I` flag skips binary files                    |
| Script run with 0 keywords            | Usage string + exit 1                                |

### Backward — regression risk

| Touched area (from Change Footprint)  | What could regress                | How we'd know / mitigation         |
|---------------------------------------|-----------------------------------|------------------------------------|
| `plan-requirements/SKILL.md`         | Skill might miscall script        | Verify script output is consumed correctly in test run |

## Open Questions

- None — scope is small and well-bounded for a POC

## Out of Scope

- Changes to review agents (will be deleted)
- Changes to other skill SKILL.md files beyond plan-requirements
- JSON output format
- Async or parallel search execution
- File content caching

---

# Tasks

_This section is populated by the **generate-tasks** skill (Phase 3)._
_Run: `/generate-tasks from: specs/architecture/ARCH-22.md`_