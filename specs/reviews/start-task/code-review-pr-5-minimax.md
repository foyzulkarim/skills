# Review Report

## Metadata

| Field | Value |
|-------|-------|
| **Review Mode** | PR #5 |
| **Target** | https://github.com/foyzulkarim/skills/pull/5 |
| **Date** | 2026-04-03 |
| **Tech Stack** | Claude Code plugin (Markdown SKILL.md), Git CLI, Atlassian CLI (acli), GitHub CLI (gh) |
| **Checks Run** | Code Quality & Patterns, Security, Documentation, Configuration & Dependencies |
| **Checks Skipped** | TypeScript, React, Express, Database, Test Coverage, Performance, Runtime, Async, Migration & Breaking Changes, Accessibility |
| **Files Changed** | 5 |
| **Lines Changed** | +540 / -8 |

## Review Process
- [x] Preflight checks passed
- [x] Diff gathered (5 files, ~550 lines)
- [x] Tech stack detected
- [x] Context read (PR description, commit messages)
- [x] CLAUDE.md read (none exists)
- [x] Triage agreed with developer
- [x] 4 agents launched
- [x] Results collected and deduplicated
- [x] Report compiled
- [ ] Verdict determined

## Verdict: ❌ REQUEST CHANGES

The skill implementation is well-structured and the documentation is solid. However, there are 2 High-severity security findings — potential command injection vectors in Jira key handling and branch slug construction — that block merge. These require explicit input validation before the skill can be considered safe to use with untrusted user input.

### Finding Counts

| Category | 🔴 | 🟠 | 🟡 | 💭 | ⚠️ |
|----------|-----|-----|-----|-----|-----|
| Code Quality | 0 | 0 | 0 | 2 | 0 |
| Security | 0 | 2 | 2 | 0 | 0 |
| Documentation | 0 | 0 | 1 | 1 | 0 |
| Configuration | 0 | 0 | 0 | 0 | 0 |
| **Total** | **0** | **2** | **3** | **4** | **0** |

---

## Code Quality & Patterns

**Result:** ✅ No critical or high-severity findings.

**Files reviewed:**
- `dev-pipeline/skills/start-task/SKILL.md`
- `specs/plans/PLAN-start-task-skill.md`

### Observations (Non-Actionable)

**Observation 1 — Plan/Implementation Status Mismatch (💭 Low)**
**File:** `specs/plans/PLAN-start-task-skill.md` — Lines 181-182, 241-242

Both Task T1 ("Rewrite SKILL.md Conversation Flow") and Task T2 ("Add Context File Creation") are marked **Status: done**. However, T1's scope explicitly stated "Do NOT add context file creation logic (that's T2)", yet SKILL.md already includes Phase 5 (Context File) at lines 188-206. This suggests the implementation went beyond T1's scope, or the plan wasn't updated after T2 was completed. Not a functional issue, but could cause confusion during future audits.

**Confidence:** Medium

**Observation 2 — Repetitive Confirmation Prompt Pattern (💭 Low)**
**File:** `dev-pipeline/skills/start-task/SKILL.md` — Lines 42-44

Three consecutive lines show confirmation prompts with nearly identical phrasing. This is documentation by example — intentional and useful for a skill file that guides LLM behavior. The current approach is defensible.

**Confidence:** Low

---

## Security

**Result:** ❌ 4 findings (2 High, 2 Medium)

**Files reviewed:** `dev-pipeline/skills/start-task/SKILL.md`

### Findings Table

| # | Severity | File | Line | Issue | Risk | Recommendation |
|---|----------|------|------|-------|------|----------------|
| 1 | 🟠 High | SKILL.md | 35 | Jira key pattern `[A-Z]+-\d+` is **not anchored** to string boundaries. If implementation passes the full user input to `acli` rather than just the matched regex group, command injection is possible. | `acli jira issue view "TASK-42; rm -rf /"` could execute arbitrary commands | Anchor the regex: `^[A-Z]+-\d+$`. Extract only the matched group for the CLI call, not the full user input. Add a validation step: verify extracted key contains only `[A-Z0-9-]` before calling `acli`. |
| 2 | 🟠 High | SKILL.md | 160 | Branch slug is "derived from task title" with only an implicit "kebab-case" assumption. Task titles from Jira/GitHub could contain shell metacharacters (`` ` ``, `$`, `;`) that become dangerous in `git checkout -b` and `git push -u origin`. | `git checkout -b "feat/TASK-42/add-auth-$(whoami)"` or backtick substitution | Add explicit validation: reject or sanitize any slug containing characters outside `[a-z0-9-]`. Document the sanitization step explicitly in the branch creation phase. |
| 3 | 🟡 Medium | SKILL.md | 37 | File path detection (contains `/` + ends in `.md`/`.txt`/`.yaml`) allows path traversal sequences like `../../etc/passwd.md`. No validation before file read. | Read sensitive system files or configs via path traversal | Add path validation: reject paths containing `..`, or resolve to absolute path and verify it starts with an allowed directory (e.g., `/specs/`). |
| 4 | 🟡 Medium | SKILL.md | 192 | Context file identifier derived from task number/key/slug without sanitization. Could write to unintended paths via `../` sequences. | Write to arbitrary paths under `/specs/context/` | Validate identifier contains only `[a-zA-Z0-9_-]` before constructing the file path. |

### Review Comments

##### #1: Jira key pattern not anchored
File: `dev-pipeline/skills/start-task/SKILL.md:35`

> The regex `[A-Z]+-\d+` for Jira key detection isn't anchored. If the user's input is passed directly to `acli jira issue view` (rather than only the extracted key), someone could inject commands. For example, if a user says "TASK-42; curl evil.com", the regex would match `TASK-42` but the rest of the input is still in the buffer.
>
> Would it make sense to anchor the regex (`^[A-Z]+-\d+$`) and explicitly document that only the matched group is passed to the CLI? That would make the boundary explicit.

##### #2: Branch slug not validated
File: `dev-pipeline/skills/start-task/SKILL.md:160`

> The skill says the slug is "2-4 word kebab-case summary derived from the task title". But there's no explicit validation that the slug only contains `[a-z0-9-]` before it gets interpolated into `git checkout -b` and `git push -u origin`. A Jira title like "Add auth for `hostname`" could produce a dangerous slug.
>
> I noticed the "kebab-case" convention is mentioned but not enforced. Would it help to explicitly state the sanitization step — "reject or transform any character not in `[a-z0-9-]`" — so it's clear what happens with edge-case titles?

##### #3: File path allows traversal
File: `dev-pipeline/skills/start-task/SKILL.md:37`

> The file path detection (`contains /` + extension check) would match `../../etc/passwd.md`. If this path is then used in a file read operation without validation, someone could potentially read sensitive files.
>
> Is there a sandbox boundary in the Claude Code environment that prevents reading outside the project? If not, adding a `..` rejection or prefix check would be prudent.

##### #4: Context file identifier not sanitized
File: `dev-pipeline/skills/start-task/SKILL.md:192`

> The context file path is `/specs/context/{identifier}.md` where identifier comes from the task key/number. If that identifier contains `../`, file writes could escape the intended directory.
>
> Would a simple character allowlist (`[a-zA-Z0-9_-]`) on the identifier before path construction address this?

---

## Documentation

**Result:** ⚠️ 1 Medium, 1 Low

**Files reviewed:**
- `dev-pipeline/skills/start-task/SKILL.md`
- `dev-pipeline/README.md`
- `dev-pipeline/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`

### Findings Table

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | 🟡 Medium | README.md | 52-58 | **Output Conventions gap**: SKILL.md creates context files at `/specs/context/{identifier}.md` but README's Output Conventions section only documents `/specs/plans/` and `/specs/tasks/`. A user reading the README would not know context files exist as a skill output. | Add `Context files: /specs/context/{identifier}.md` to the Output Conventions section. If context files are intentionally internal (session-persistence only), clarify that in the skill description instead. |
| 2 | 💭 Low | README.md | 9 | **Pipeline diagram opt-in ambiguity**: The diagram shows `/start-task → sync main` with arrow notation, implying a linear flow. SKILL.md emphasizes "Opt-in only" but the diagram doesn't convey this. | Consider adding "(opt-in)" label to the diagram node, or clarifying in the diagram caption that `/start-task` is invoked explicitly, not as part of a chain. |

### Review Comment

##### #1: Context file not in README Output Conventions
File: `dev-pipeline/README.md:52-58`

> I noticed the context file output (`/specs/context/{identifier}.md`) is well-documented in the SKILL.md (lines 192, 204, 214), but the README's Output Conventions section doesn't mention it. The listed outputs are plan files, task specs, and review reports — but the context file is conspicuously absent.
>
> Is the context file meant to be an internal artifact (session-persistence for downstream skills), or should it be listed as a user-facing output alongside the plan and review report? That distinction will determine whether this needs a doc fix.

---

## Configuration & Dependencies

**Result:** ✅ No findings.

**Files reviewed:**
- `.claude-plugin/marketplace.json`
- `dev-pipeline/.claude-plugin/plugin.json`

**Checks performed:**
- Version 1.1.0 → 1.2.0 consistent across both files ✅
- Description updates ("task bootstrapping") consistent ✅
- No new dependencies introduced ✅
- No breaking changes ✅

---

## Prioritized Action Items

### Must Fix (🟠 High)

1. **[Security #1]** Anchor Jira key regex and validate extracted key before CLI call — prevents command injection
2. **[Security #2]** Add explicit slug sanitization (allowlist `[a-z0-9-]`) before git branch commands — prevents branch name injection

### Should Address (🟡 Medium)

3. **[Security #3]** Add path traversal validation (`..` rejection or prefix check) before reading user-supplied file paths
4. **[Security #4]** Validate context file identifier with allowlist `[a-zA-Z0-9_-]` before constructing file path
5. **[Docs #1]** Add context file output to README.md Output Conventions section, or clarify it's an internal artifact

### Nice to Have (💭 Low)

6. **[Docs #2]** Consider clarifying "opt-in" nature in README pipeline diagram
7. **[Code Quality #Obs1]** Update PLAN-start-task-skill.md to reflect both T1 and T2 as completed

---

*Generated by Review — 2026-04-03*
