# Review Report

## Metadata

| Field | Value |
|-------|-------|
| **Review Mode** | Unstaged (general) |
| **Target** | unstaged working tree changes |
| **Date** | 2026-07-03 16:25 |
| **Tech Stack** | Shell scripts (bash), Markdown documentation, JavaScript (Node.js CLI) |
| **Checks Run** | code-quality, documentation, config-dependencies |
| **Checks Skipped** | task-completion (not pipeline mode), test-coverage (no tests in repo), security (no user-facing surface), performance (no algorithms/DB), error-handling (covered by code-quality), typescript-strictness (no TS files), runtime-behavior (no JS/TS runtime), async-patterns (no async code), react-patterns (no React), express-patterns (no Express), database-patterns (no DB), migration (internal-only changes), accessibility (no frontend) |
| **Files Changed** | 32 (21 tracked + 11 untracked) |
| **Lines Changed** | ~2,435 tracked diff lines + untracked additions |

## Review Process
- [x] Preflight checks passed
- [x] Diff gathered (21 tracked files, ~2,435 lines; 11 untracked files)
- [x] Tech stack detected: bash + markdown + JS CLI
- [x] Context read (CLAUDE.md, README.md, dev-pipeline/README.md)
- [x] Triage agreed with developer
- [x] 3 sub-skills dispatched (code-quality, documentation, config-dependencies)
- [x] Results collected and deduplicated
- [x] Report compiled

## Verdict: ⚠️ APPROVE WITH COMMENTS

No Critical or High findings. The changeset is a well-structured v3.0.0 major cleanup: old skill versions deleted, existing skills modernized with bundled scripts, new `session-stats` and `setup-cost-tracking` skills added, docs and metadata updated. There are 11 Medium and 5 Low findings across shell script quality and documentation consistency — worth addressing before merge, but none block it.

### Finding Counts

| Category | 🔴 | 🟠 | 🟡 | 💭 | ⚠️ |
|----------|-----|-----|-----|-----|-----|
| Code Quality & Conventions | 0 | 0 | 7 | 4 | 0 |
| Documentation | 0 | 0 | 4 | 1 | 0 |
| Configuration & Dependencies | 0 | 0 | 0 | 0 | 0 |
| **Total** | **0** | **0** | **11** | **5** | **0** |

---

## Code Quality & Conventions

### Findings Table

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟡 Medium | `commit.sh` | 19 | `grep` pattern `key` is overly broad — matches `keyboard.js`, `monkeypatch.sh`, `quickstart.md`, etc. | Narrow to word boundaries or more specific terms (e.g., `api-key`, `private-key`, `secret-key`) or remove `key` and rely on the other patterns. |
| 2 | 🟡 Medium | `gather.sh` | 59 | Same overly broad `key` pattern in the "SENSITIVE" preview section. | Apply the same narrowed pattern so the preview doesn't mislead the LLM into treating legitimate files as sensitive. |
| 3 | 🟡 Medium | `gather.sh` | 80, 86, 109, 121 | `wc -l \| tr -d ' '` appears 4× in this file (6× across `gather.sh` + `search-codebase.sh`). | Extract a `line_count() { wc -l \| tr -d ' '; }` helper to remove duplication and clarify intent. |
| 4 | 🟡 Medium | `search-codebase.sh` | 150 | Backticks in grep results are not escaped before being wrapped in markdown backticks, breaking table formatting. | Add backtick escaping: `content_escaped="${content_escaped//\`/\\\`}"` after the pipe escape. |
| 5 | 🟡 Medium | `statusline-command.js` | 15 | `JSON.parse(input)` is unprotected — malformed/empty stdin crashes the script. | Wrap in `try/catch` and render a minimal fallback line so a bad payload never blanks the statusline. |
| 6 | 🟡 Medium | `turn-logger.js` | 20 | `JSON.parse(input)` is unprotected — malformed/empty stdin crashes the Stop hook. | Wrap in `try/catch`; silently return on parse failure so the hook never breaks the session. |
| 7 | 🟡 Medium | `gh-start-task.sh` | 50-67 | Explicit user-provided branch type can be overridden by GitHub labels, contrary to the documented intent "derive from labels if not provided." | Guard label-based derivation with `[[ -z "${2:-}" ]]` so a caller-provided type is preserved. |
| 8 | 💭 Low | `gather.sh` | 80 | `git diff HEAD \| wc -l` counts diff text lines (context, headers, markers) rather than actual changed lines. | Consider `git diff --stat` to sum insertions+deletions, or update the comment to clarify this measures diff blob size. |
| 9 | 💭 Low | `cost-logger.js` | 85-91 | Session log upsert reads and rewrites the entire `~/.claude/cost-log.jsonl` on every invocation — O(n) over total sessions. | For future scalability, consider append-only logging or per-session files instead of in-place rewriting. |
| 10 | 💭 Low | `sync-skills.sh` | 135-136 | `pull_one` deletes the repo skill before copying from target, leaving a non-atomic replacement window. | Use a temp-dir swap: `cp -R "$dst" "$src.tmp" && rm -rf "$src" && mv "$src.tmp" "$src"`. |
| 11 | 💭 Low | `file-tree.sh` | 92, 140 | `if [[ -d "$TARGET_DIR" ]]` else branch is dead code because `cd` on line 36 already exits on invalid paths. | Remove the redundant `if/else` or validate the path before the `cd` attempt. |

### Coverage Checklist
- [x] `dev-pipeline/skills/commit/commit.sh` — naming ✅, complexity ✅, error handling ✅, shell portability ✅
- [x] `dev-pipeline/skills/commit/gather.sh` — naming ✅, complexity ✅, DRY ⚠️, shell portability ✅
- [x] `dev-pipeline/skills/plan-architecture/file-tree.sh` — naming ✅, complexity ✅, shell portability ✅
- [x] `dev-pipeline/skills/plan-architecture/search-codebase.sh` — naming ✅, complexity ✅, output escaping ⚠️, shell portability ✅
- [x] `dev-pipeline/skills/session-stats/dashboard.sh` — naming ✅, complexity ✅, shell portability ✅
- [x] `dev-pipeline/skills/setup-cost-tracking/scripts/cost-logger.js` — naming ✅, complexity ✅, error handling ✅, JS conventions ✅
- [x] `dev-pipeline/skills/setup-cost-tracking/scripts/statusline-command.js` — naming ✅, complexity ✅, error handling ⚠️, JS conventions ✅
- [x] `dev-pipeline/skills/setup-cost-tracking/scripts/statusline-wrapper.js` — naming ✅, complexity ✅, error handling ✅, JS conventions ✅
- [x] `dev-pipeline/skills/setup-cost-tracking/scripts/turn-logger.js` — naming ✅, complexity ✅, error handling ⚠️, JS conventions ✅
- [x] `scripts/sync-skills.sh` — naming ✅, complexity ✅, shell portability ✅, idempotency ✅
- [x] `dev-pipeline/skills/start-task/gh-start-task.sh` — naming ✅, complexity ✅, logic correctness ⚠️, shell portability ✅

### Review Comments

**Overly broad `key` pattern in sensitive-file detection**
I noticed the sensitive-file pattern in `commit.sh` includes `key` as a standalone match, which would catch files like `keyboard.js`, `monkeypatch.sh`, or `quickstart.md`. Since the script auto-excludes anything matching this pattern, a false positive means legitimate files get silently dropped from commits. Would it make sense to narrow `key` to more specific phrases like `api-key`, `private-key`, or `secret-key`, or remove it and let the other patterns (`.env`, `secret`, `credential`, `token`, `password`) carry the load? Thoughts?

**`wc -l | tr -d ' '` repeated across `gather.sh` and `search-codebase.sh`**
I counted six instances of `wc -l | tr -d ' '` across these two files. It's a small idiom, but repeating it this many times makes the scripts harder to skim. Would a `line_count() { wc -l | tr -d ' '; }` helper clean this up? It would also make the intent explicit — "I want a numeric line count, not the `wc` preamble." What do you think?

**Backticks in search results break markdown tables**
In `search-codebase.sh`, content matches are wrapped in markdown backticks. If a line contains a literal backtick (e.g., a JS template literal or markdown doc), the table column breaks. Adding a backtick escape alongside the existing pipe escape would make the output robust. Would it make sense to add something like `content_escaped="${content_escaped//\`/\\\`}"` after the pipe escape?

**Unprotected `JSON.parse` in JS entry points**
`statusline-command.js` and `turn-logger.js` both call `JSON.parse(input)` at the top of their `stdin` end handler without a try-catch. If Claude Code ever sends an empty or malformed payload, the script crashes with an unhandled exception. Since these are hooks that run inside a Claude Code session, a crash could blank the statusline or break the stop-hook. Would wrapping the parse in a `try/catch` that renders a minimal fallback (or silently returns for the hook) be worth adding?

**`gh-start-task.sh` overrides explicit user type with labels**
The script comment says "Derive type from labels if not provided," but the implementation on lines 50-67 runs the label-based derivation unconditionally — even when the user explicitly passed a type as `$2`. For example, passing `fix` as the type argument could still result in `feat` if the issue has an `enhancement` label. The SKILL.md says the LLM computes the type and passes it to the script, so the script overriding it feels like a mismatch. Would guarding the label logic with `[[ -z "${2:-}" ]]` preserve the caller's intent while still defaulting from labels when no type is given?

---

## Documentation

### Findings Table

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟡 Medium | `dev-pipeline/README.md` | 46-48 | `/commit` description is stale — still describes the old interactive v1 behavior (inspects staged/unstaged, asks what to stage, confirms before executing). The skill was rewritten to zero-confirmation-by-default with bundled `gather.sh`/`commit.sh` and an `ask` mode. | Update the description to match the new `commit/SKILL.md` behavior: "One-shot conventional commit — bundled scripts adaptively curate diff context, zero confirmation by default, `ask` mode for selective staging and draft review." |
| 2 | 🟡 Medium | `README.md` | 26-34 | Skill table omits the new `setup-cost-tracking` skill. It is a public, user-facing skill in the repo but has zero discoverability from the README. | Add a row for `[/setup-cost-tracking](./dev-pipeline/skills/setup-cost-tracking)` with phase `any` and a brief description of its purpose. |
| 3 | 🟡 Medium | `README.md` | 51-65 | Plugin structure tree omits `setup-cost-tracking/` under `skills/`. | Add `│   ├── setup-cost-tracking/` to the tree so the structure diagram is complete. |
| 4 | 🟡 Medium | `CLAUDE.md` | 47-52 | Supporting skills section lists `commit`, `session-stats`, `start-task`, and sub-checks, but omits `setup-cost-tracking`. Since this is the contributor guidance file, it should enumerate all skills in the plugin. | Add a bullet for `setup-cost-tracking` describing it as a one-time system-level setup skill for per-session cost capture. |
| 5 | 💭 Low | `dev-pipeline/skills/setup-cost-tracking/SKILL.md` | 1-4 | Missing `model` and `color` YAML frontmatter fields. Every other SKILL.md in the repo includes `model: inherit` and a `color` value (e.g., `lightcoral`, `green`, `cyan`). | Add `model: inherit` and `color: <value>` to the frontmatter for consistency with the project's SKILL.md format convention. |

### Coverage Checklist
- [x] README (root) — `/commit` description updated for new zero-confirmation behavior ✅
- [x] README (root) — `/start-task` description updated for new issue/ticket flow ✅
- [x] README (root) — `/session-stats` added to skill table ✅
- [x] README (root) — `scripts/sync-skills.sh` documented in new "Test skills locally" section ✅
- [x] README (root) — Plugin structure tree updated to remove deleted skills ✅
- [x] `dev-pipeline/README.md` — `/start-task` description updated ✅
- [x] `dev-pipeline/README.md` — `/session-stats` section added ✅
- [ ] `dev-pipeline/README.md` — `/commit` description still stale ❌
- [x] `CLAUDE.md` — `/commit`, `/session-stats`, `/start-task` descriptions updated ✅
- [x] `CLAUDE.md` — Deleted skills (`create-worktrees`, `commit-v2`, `commit-v3`, `plan-architecture-v2`) removed from supporting skills list ✅
- [ ] `CLAUDE.md` — `setup-cost-tracking` not mentioned ❌
- [ ] `README.md` — `setup-cost-tracking` missing from skill table and plugin tree ❌
- [x] `commit/SKILL.md` — Accurately describes new adaptive `gather.sh` + `commit.sh` workflow ✅
- [x] `commit/SKILL.md` — `ask` mode documented correctly ✅
- [x] `start-task/SKILL.md` — GitHub/Jira/local/ad-hoc detection logic documented ✅
- [x] `start-task/SKILL.md` — `gh-start-task.sh` reference exists and script is present ✅
- [x] `session-stats/SKILL.md` — `dashboard.sh` reference exists and script is present ✅
- [x] `setup-cost-tracking/SKILL.md` — All four `.js` scripts referenced exist in `scripts/` ✅
- [x] `plan-architecture/SKILL.md` — `file-tree.sh` and `search-codebase.sh` references exist and scripts are present ✅
- [x] Version bump — `plugin.json` and `marketplace.json` both updated to `3.0.0` and are in sync ✅
- [x] Cross-reference consistency — Deleted skill directories removed from all README/CLAUDE.md trees ✅
- [x] New skill directories (`session-stats`, `setup-cost-tracking`) have `SKILL.md` present ✅

### Review Comments

**Finding 1 (dev-pipeline/README.md stale commit description):** I noticed the `/commit` section in `dev-pipeline/README.md` still describes the old step-by-step interactive flow — staging questions, type inference dialog, and confirmation before executing. The actual `commit` skill now defaults to zero-confirmation with adaptive diff curation in `gather.sh` and immediate staging in `commit.sh`, plus an optional `ask` argument for selective staging. Could we update that paragraph so developers don't expect a conversation when they invoke `/commit`? What do you think?

**Finding 2 (setup-cost-tracking missing from README table):** I noticed the new `setup-cost-tracking` skill isn't listed in the root README's skill table or the plugin structure tree. Since it's a public skill that gets installed with the plugin, a new user wouldn't know it exists without browsing the directory directly. Would it make sense to add it alongside `session-stats` and `commit` in the table? Thoughts?

**Finding 5 (setup-cost-tracking frontmatter):** I noticed `setup-cost-tracking/SKILL.md` is missing the `model` and `color` frontmatter keys that every other skill in the repo includes. It's a small consistency gap — would you mind adding them to match the project's SKILL.md format convention?

---

## Configuration & Dependencies

**Result:** ✅ No findings.
**Files reviewed:** `.claude-plugin/marketplace.json`, `dev-pipeline/.claude-plugin/plugin.json`

### Coverage Checklist
- [x] `dev-pipeline/.claude-plugin/plugin.json` — version bumped 2.4.0 → 3.0.0 ✅
- [x] `.claude-plugin/marketplace.json` — version bumped 2.4.0 → 3.0.0, in sync with plugin.json ✅
- [x] Plugin structure validity — `skills` field still auto-scans `./skills/`; deleted skill directories are cleanly removed and references purged ✅
- [x] No new runtime dependencies introduced — scripts use standard Unix tools (`find`, `grep`, `awk`, `mktemp`, `git`) and existing CLI tools (`gh`, `jq`) ✅
- [x] No new environment variables introduced — existing vars preserved and documented in inline comments ✅
- [x] No lock files or package manifests in this repo (shell + markdown) — N/A ✅
- [x] No secrets or credentials hardcoded in any modified or deleted files ✅
- [x] Version bump justification — 3.0.0 major bump appropriate because multiple public skills removed, a breaking change ✅

---

## Manual Checks Required

- [ ] Verify `setup-cost-tracking` skill works end-to-end on a fresh Claude Code install (the JS scripts touch `~/.claude/` paths and statusline hooks — test on your actual setup)
- [ ] Verify `session-stats/dashboard.sh` correctly locates the transcript JSONL via `CLAUDE_CODE_SESSION_ID` on macOS and Linux

## Prioritized Action Items

### Must Fix (🔴 Critical / 🟠 High)
_None._

### Should Address (🟡 Medium)
1. **Narrow `key` pattern in sensitive-file detection** (`commit.sh:19`, `gather.sh:59`) — false positives could silently exclude legitimate files from commits
2. **Fix stale `/commit` description in `dev-pipeline/README.md`** — contradicts the actual zero-confirmation behavior
3. **Add `setup-cost-tracking` to README skill table and plugin tree** — new skill is invisible to users
4. **Add `setup-cost-tracking` to `CLAUDE.md` supporting skills list** — contributor guidance should enumerate all skills
5. **Extract `line_count` helper** in `gather.sh`/`search-codebase.sh` — DRY violation at 6 repetitions
6. **Escape backticks in `search-codebase.sh` markdown output** — breaks table formatting on template-literal matches
7. **Add `try/catch` around `JSON.parse` in `statusline-command.js` and `turn-logger.js`** — unprotected parse crashes the statusline/stop-hook on malformed input
8. **Guard label-based type derivation in `gh-start-task.sh`** — explicit user-provided type should not be overridden by GitHub labels

### Nice to Have (💭 Low)
1. **Clarify `git diff HEAD | wc -l` semantics** in `gather.sh` — counts diff blob lines, not actual changed lines
2. **Consider append-only logging in `cost-logger.js`** — current O(n) rewrite over all sessions
3. **Atomic temp-dir swap in `sync-skills.sh` pull** — avoid non-atomic replacement window
4. **Remove dead `if [[ -d ]]` branch in `file-tree.sh`** — `cd` already exits on invalid paths
5. **Add `model` and `color` frontmatter to `setup-cost-tracking/SKILL.md`** — consistency with other skills

---
*Generated by Review — 2026-07-03 16:25*
