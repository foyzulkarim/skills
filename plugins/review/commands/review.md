---
allowed-tools: Bash(git *), Bash(gh *), Bash(grep *), Bash(wc *), Bash(command *), Read, Write, Glob, Grep, Agent
argument-hint: "[mode] [target] (pr 123 | branch name | staged | diff file.diff)"
description: Comprehensive code review using 7 parallel agents - works with any repository, language, or framework
---

# Code Review Skill

Perform a comprehensive code review using 7 specialized parallel agents. This skill works with any repository regardless of language, framework, or tech stack.


### Usage Examples

```bash
# Review a pull request
/review pr 123

# Compare a branch against default branch
/review branch feature/auth-redesign

# Review staged changes before committing
/review staged

# Review a diff file
/review diff changes.diff

# No arguments defaults to staged
/review
```

---

## Severity Scale

All agents MUST use this consistent severity scale:

| Severity | Criteria | Merge Impact |
|----------|----------|--------------|
| **Critical** | Security vulnerability, data loss risk, crash/outage, broken core functionality | Blocks merge |
| **High** | Significant bug, major performance issue, missing critical tests, auth/authz gap | Strongly blocks merge |
| **Medium** | Code smell, moderate performance concern, missing edge case tests, unclear error handling | Should fix, doesn't block |
| **Low** | Style inconsistency, minor refactoring opportunity, documentation gap, nice-to-have improvement | Optional improvement |

---

## Step 1: Parse Arguments and Determine Review Mode

Parse the provided arguments to determine the review mode:

| Mode | Usage | Description |
|------|-------|-------------|
| `pr` | `/review pr 123` | Review a pull request by number |
| `branch` | `/review branch feature-x` | Compare branch against main/master |
| `staged` | `/review staged` | Review currently staged changes |
| `diff` | `/review diff changes.diff` | Review a diff file |

**Argument parsing:**
- First argument: mode (`pr`, `branch`, `staged`, `diff`)
- Second argument: target (PR number, branch name, or diff file path)
- If no arguments provided, default to `staged` mode

Set variables:
- `REVIEW_MODE`: The detected mode
- `REVIEW_TARGET`: The specific target (number, branch name, file path)
- `REVIEW_IDENTIFIER`: A unique identifier for the report filename

---

## Step 2: Preflight Checks

Before gathering changes, validate the environment:

```bash
# Check if we're in a git repository
git rev-parse --is-inside-work-tree || { echo "ERROR: Not inside a git repository"; exit 1; }

# For PR mode: check gh CLI is installed and authenticated
if [ "$REVIEW_MODE" = "pr" ]; then
  command -v gh >/dev/null 2>&1 || { echo "ERROR: GitHub CLI (gh) is not installed. Install it from https://cli.github.com"; exit 1; }
  gh auth status 2>/dev/null || { echo "ERROR: GitHub CLI is not authenticated. Run 'gh auth login' first"; exit 1; }
fi
```

If any check fails, stop and report the issue clearly to the user. Do not proceed with empty or invalid data.

---

## Step 3: Gather Changes Based on Mode

### Detect Default Branch
```bash
DEFAULT_BRANCH=$(git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}')
if [ -z "$DEFAULT_BRANCH" ]; then
  DEFAULT_BRANCH=$(git branch -l main master --format '%(refname:short)' | head -1)
fi
if [ -z "$DEFAULT_BRANCH" ]; then
  DEFAULT_BRANCH=main
fi
```

### Gather Diff Content

**For PR mode:**
```bash
gh pr diff $REVIEW_TARGET
gh pr view $REVIEW_TARGET --json title,author,baseRefName,headRefName,additions,deletions,changedFiles,url
```

**For branch mode:**
```bash
git diff $DEFAULT_BRANCH...$REVIEW_TARGET
git log $DEFAULT_BRANCH..$REVIEW_TARGET --oneline
git diff $DEFAULT_BRANCH...$REVIEW_TARGET --stat
```

**For staged mode:**
```bash
git diff --cached
git diff --cached --stat
```

**For diff file mode:**
```bash
# Verify file exists
[ -f "$REVIEW_TARGET" ] || { echo "ERROR: Diff file '$REVIEW_TARGET' not found"; exit 1; }
cat "$REVIEW_TARGET"
```

### Validate Diff Content

```bash
# Check if diff is empty
if [ -z "$DIFF_CONTENT" ]; then
  echo "WARNING: No changes detected. Nothing to review."
  exit 0
fi
```

### Diff Size Check

Count the approximate lines in the diff:
```bash
DIFF_LINES=$(echo "$DIFF_CONTENT" | wc -l)
```

- If `DIFF_LINES` > **3000 lines**: Warn the user that this is a large diff and token usage will be significant. Ask if they want to proceed or scope to specific files/directories.
- If `DIFF_LINES` > **8000 lines**: Strongly recommend scoping the review. Suggest: `git diff --cached -- src/specific-dir/` or reviewing in batches.

Store the diff content and metadata for the parallel agents.

---

## Step 4: Detect Tech Stack

Before launching agents, detect the project's tech stack so agents can provide framework-specific advice:

```bash
TECH_STACK=""

# Detect from files in repository
[ -f "package.json" ] && TECH_STACK="${TECH_STACK}, Node.js"
[ -f "tsconfig.json" ] && TECH_STACK="${TECH_STACK}, TypeScript"
{ [ -f "requirements.txt" ] || [ -f "pyproject.toml" ] || [ -f "setup.py" ]; } && TECH_STACK="${TECH_STACK}, Python"
[ -f "go.mod" ] && TECH_STACK="${TECH_STACK}, Go"
[ -f "Cargo.toml" ] && TECH_STACK="${TECH_STACK}, Rust"
{ [ -f "pom.xml" ] || [ -f "build.gradle" ]; } && TECH_STACK="${TECH_STACK}, Java"
[ -f "Gemfile" ] && TECH_STACK="${TECH_STACK}, Ruby"

# Detect frameworks from package.json or equivalent
grep -qE '"react"' package.json 2>/dev/null && TECH_STACK="${TECH_STACK}, React"
grep -qE '"next"' package.json 2>/dev/null && TECH_STACK="${TECH_STACK}, Next.js"
grep -qE '"express"' package.json 2>/dev/null && TECH_STACK="${TECH_STACK}, Express"
grep -qE '"nestjs"' package.json 2>/dev/null && TECH_STACK="${TECH_STACK}, NestJS"
grep -qE '"vue"' package.json 2>/dev/null && TECH_STACK="${TECH_STACK}, Vue"
grep -qE '"angular"' package.json 2>/dev/null && TECH_STACK="${TECH_STACK}, Angular"
grep -qiE '(django|flask|fastapi)' requirements.txt 2>/dev/null && TECH_STACK="${TECH_STACK}, $(grep -oiE '(django|flask|fastapi)' requirements.txt | head -1)"

# Clean up leading comma-space
TECH_STACK=$(echo "$TECH_STACK" | sed 's/^, //')
```

Pass the detected `TECH_STACK` string to each agent as context. This allows agents to give targeted advice (e.g., React re-render issues, Express middleware ordering, Django ORM N+1 queries).

---

## Step 5: Launch 7 Parallel Review Agents

Spin up **all 7 agents in parallel** (in a single message with multiple Agent tool calls) with `subagent_type: general-purpose`. Each agent receives:
- The full diff content
- The detected `TECH_STACK`
- The severity scale defined above

---

### Agent 1: Code Quality Review

```
You are reviewing code changes for CODE QUALITY.

**Tech Stack:** {TECH_STACK}
**Diff Content:** {DIFF_CONTENT}

**Severity Scale:**
- Critical: Security vulnerability, data loss, crash/outage
- High: Significant bug, major issue
- Medium: Code smell, moderate concern
- Low: Style, minor improvement

**Focus Areas:**
- Code duplication and DRY violations
- Naming conventions (variables, functions, classes — clear, consistent, descriptive)
- Single Responsibility Principle adherence
- Dead code and unused imports
- Code readability and maintainability
- Consistent coding style
- Function/method length and complexity (cyclomatic complexity)
- Magic numbers and hardcoded values
- Proper abstraction levels
- Deep nesting (> 3 levels)

**Required Output Format:**

#### Findings Table
Number each finding sequentially:
| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | {severity} | {file path} | {line number or range} | {description of issue} | {specific recommendation} |

#### Review Comments
For EACH finding, draft a comment labeled by its number:

##### #1: {Brief title}
File: `{path}:{line}`

> [Comment text written in collaborative tone]
>
> ```suggestion (if applicable)
> // suggested code fix
> ```
>
> What do you think?

**Comment Tone Guidelines:**
- Open with curiosity: "I noticed...", "Just curious about...", "I was wondering...", "Would it make sense to..."
- Ask questions rather than demand changes
- Provide context for WHY something is worth considering
- Include code examples in markdown when helpful
- End with soft closings: "What do you think?", "Thoughts?", "Just a thought, not a blocker!"
- Be educational — explain the principle behind the suggestion
```

---

### Agent 2: Test Coverage Review

```
You are reviewing code changes for TEST COVERAGE.

**Tech Stack:** {TECH_STACK}
**Diff Content:** {DIFF_CONTENT}

**Severity Scale:**
- Critical: Security vulnerability, data loss, crash/outage
- High: Significant bug, major issue
- Medium: Code smell, moderate concern
- Low: Style, minor improvement

**Focus Areas:**
- Presence of unit tests for new/modified code
- Edge case coverage (null, empty, boundary values)
- Error and exception scenario testing
- Mock and stub appropriateness (not over-mocking)
- Test naming, organization, and readability
- Test isolation and independence
- Assertion quality and completeness
- Integration test considerations
- Test data management
- Regression test coverage for bug fixes

Compare test files against source files to identify coverage gaps. For each untested function or code path, provide a concrete example test case.

**Required Output Format:**

#### Findings Table
Number each finding sequentially:
| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | {severity} | {file path} | {line number or range} | {description of issue} | {specific recommendation} |

#### Missing Tests
List each untested scenario as:
- `{source file}:{function/method}` — {what should be tested} — Priority: {High/Medium/Low}

#### Review Comments
For EACH finding, draft a comment labeled by its number:

##### #1: {Brief title}
File: `{path}:{line}`

> [Comment text in collaborative tone]
>
> Here's an example test case:
> ```{language}
> // example test code
> ```
>
> Would this make sense to add?

**Comment Tone Guidelines:**
- Open with curiosity: "I noticed...", "Just curious about...", "I was wondering...", "Would it make sense to..."
- Ask questions rather than demand changes
- Provide context for WHY something is worth considering
- Include concrete test examples in code blocks
- End with soft closings: "What do you think?", "Thoughts?", "Just a thought, not a blocker!"
```

---

### Agent 3: Performance Review

```
You are reviewing code changes for PERFORMANCE.

**Tech Stack:** {TECH_STACK}
**Diff Content:** {DIFF_CONTENT}

**Severity Scale:**
- Critical: Security vulnerability, data loss, crash/outage
- High: Significant bug, major issue
- Medium: Code smell, moderate concern
- Low: Style, minor improvement

**Focus Areas:**
- Time complexity of algorithms (identify O(n²), O(n³) patterns)
- Space complexity and memory usage
- N+1 query problems (especially with ORMs)
- Missing caching opportunities
- Unnecessary computations inside loops
- Large data structure operations (deep clones, large array copies)
- Async/await and concurrency patterns (parallelizable work done sequentially)
- Resource cleanup and disposal (streams, connections, file handles)
- Batch processing opportunities (individual API calls that could be batched)
- Index usage for database queries
- Unnecessary re-renders (React), re-computations, or DOM thrashing
- Bundle size impact of new dependencies

For each finding, estimate the impact: how would this behave with 10x, 100x, 1000x data?

**Required Output Format:**

#### Findings Table
Number each finding sequentially:
| # | Severity | File | Line | Issue | Impact | Recommendation |
|---|----------|------|------|-------|--------|----------------|
| 1 | {severity} | {file path} | {line number or range} | {description} | {estimated impact} | {recommendation with code example} |

#### Review Comments
For EACH finding, draft a comment labeled by its number:

##### #1: {Brief title}
File: `{path}:{line}`

> [Comment text in collaborative tone]
>
> Current complexity: O(n²) — with 10k items, this could mean ~100M operations.
>
> One approach that could help:
> ```{language}
> // optimized code suggestion
> ```
>
> Thoughts?

**Comment Tone Guidelines:**
- Open with curiosity: "I noticed...", "Just curious about...", "I was wondering...", "Would it make sense to..."
- Ask questions rather than demand changes
- Quantify impact where possible (O notation, estimated latency, memory usage)
- Include optimized code examples
- End with soft closings: "What do you think?", "Thoughts?", "Just a thought, not a blocker!"
```

---

### Agent 4: Security Review

```
You are reviewing code changes for SECURITY.

**Tech Stack:** {TECH_STACK}
**Diff Content:** {DIFF_CONTENT}

**Severity Scale:**
- Critical: Exploitable vulnerability, credential exposure, auth bypass
- High: Significant security gap, missing validation on sensitive paths
- Medium: Hardening opportunity, missing defense-in-depth layer
- Low: Minor security improvement, best practice suggestion

**Focus Areas:**
- Input validation and sanitization (all external inputs)
- Authentication and authorization checks
- Secrets and credentials exposure (hardcoded keys, tokens, passwords)
- SQL injection vulnerabilities
- XSS (Cross-Site Scripting) risks
- CSRF protection
- Sensitive data in logs or error messages
- Secure communication (HTTPS, TLS)
- Dependency vulnerabilities (known CVEs)
- OWASP Top 10 compliance
- Rate limiting considerations
- File upload security (type validation, size limits, storage)
- JWT/token handling (expiry, rotation, storage)
- CORS configuration
- Path traversal risks

**Required Output Format:**

#### Findings Table
Number each finding sequentially:
| # | Severity | File | Line | Vulnerability | Risk | Remediation |
|---|----------|------|------|---------------|------|-------------|
| 1 | {severity} | {file path} | {line number or range} | {vulnerability description} | {risk assessment} | {remediation steps} |

#### OWASP Compliance
For each applicable OWASP Top 10 category, mark as:
- ✅ Compliant — no issues found
- ⚠️ Concern — potential issue identified
- ❌ Violation — definite vulnerability
- N/A — not applicable to these changes

#### Review Comments
For EACH finding, draft a comment labeled by its number:

##### #1: {Brief title}
File: `{path}:{line}`

> **Severity: {Critical/High/Medium/Low}**
>
> [Comment text in collaborative tone explaining the risk]
>
> A possible fix:
> ```{language}
> // secure code suggestion
> ```
>
> What do you think?

**Comment Tone Guidelines:**
- Open with curiosity: "I noticed...", "Just curious about...", "I was wondering...", "Would it make sense to..."
- For Critical/High: be direct about the risk while remaining collaborative
- Explain the attack vector or risk scenario briefly
- Include secure code alternatives
- End with soft closings: "What do you think?", "Thoughts?", "Happy to chat more about this"
```

---

### Agent 5: Documentation Review

```
You are reviewing code changes for DOCUMENTATION.

**Tech Stack:** {TECH_STACK}
**Diff Content:** {DIFF_CONTENT}

**Severity Scale:**
- Critical: Missing docs for breaking change or public API
- High: Missing docs for significant new feature or behavior change
- Medium: Incomplete docs, missing JSDoc/docstrings on public functions
- Low: Minor documentation improvement, typo, formatting

**Focus Areas:**
- README updates for new features or changed behavior
- API documentation completeness (endpoints, parameters, responses)
- Code comments for complex logic (the "why", not the "what")
- JSDoc/TSDoc/docstrings on public APIs and exported functions
- Usage examples for new features
- Configuration documentation (new env vars, config options)
- Changelog entries
- Migration guides (if breaking changes)
- Inline documentation quality
- Architecture decision records (for significant design choices)

Evaluate: could a new team member understand these changes from the documentation alone?

**Required Output Format:**

#### Findings Table
Number each finding sequentially:
| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | {severity} | {file path} | {line number or range} | {what's missing or unclear} | {specific recommendation} |

#### Documentation Checklist
Mark each as ✅, ⚠️, ❌, or N/A:
- README updated
- API documentation updated
- Code comments adequate for complex logic
- Public functions have JSDoc/docstrings
- Changelog updated
- Migration guide provided (if needed)
- Configuration changes documented

#### Review Comments
For EACH finding, draft a comment labeled by its number:

##### #1: {Brief title}
File: `{path}:{line}`

> [Comment text in collaborative tone]
>
> Something like this could help:
> ```{language}
> /**
>  * Example JSDoc/docstring
>  */
> ```
>
> Just a thought, not a blocker!

**Comment Tone Guidelines:**
- Open with curiosity: "I noticed...", "Just curious about...", "I was wondering...", "Would it make sense to..."
- Ask questions rather than demand changes
- Provide example documentation text when suggesting additions
- End with soft closings: "What do you think?", "Thoughts?", "Just a thought, not a blocker!"
```

---

### Agent 6: Error Handling & Observability Review

```
You are reviewing code changes for ERROR HANDLING & OBSERVABILITY.

**Tech Stack:** {TECH_STACK}
**Diff Content:** {DIFF_CONTENT}

**Severity Scale:**
- Critical: Unhandled errors that could crash the application or lose data
- High: Silent failures, swallowed exceptions, missing error handling on critical paths
- Medium: Inconsistent error handling, missing logging, unclear error messages
- Low: Logging improvements, observability nice-to-haves

**Focus Areas:**
- Try-catch block appropriateness and specificity
- Error message clarity and usefulness
- Logging quality (appropriate levels: debug, info, warn, error)
- Sensitive data NOT in logs (PII, tokens, passwords)
- Monitoring and alerting hooks
- Graceful degradation patterns
- Retry logic and circuit breakers
- Error propagation (are errors properly bubbled up?)
- Stack trace preservation
- User-facing vs. internal error messages
- Health check endpoints
- Metrics and tracing instrumentation
- Dead letter queues / failure recovery

**Required Output Format:**

#### Findings Table
Number each finding sequentially:
| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | {severity} | {file path} | {line number or range} | {issue description} | {recommendation} |

#### Observability Checklist
Mark each as ✅, ⚠️, ❌, or N/A:
- Appropriate logging levels used
- No sensitive data in logs
- Error messages are clear and actionable
- Monitoring/alerting hooks in place
- Graceful degradation implemented
- Retry logic where appropriate

#### Review Comments
For EACH finding, draft a comment labeled by its number:

##### #1: {Brief title}
File: `{path}:{line}`

> [Comment text in collaborative tone]
>
> One pattern that could work here:
> ```{language}
> // error handling example
> ```
>
> What do you think?

**Comment Tone Guidelines:**
- Open with curiosity: "I noticed...", "Just curious about...", "I was wondering...", "Would it make sense to..."
- Ask questions rather than demand changes
- Explain the failure scenario (what happens when X goes wrong?)
- Include code examples for error handling patterns
- End with soft closings: "What do you think?", "Thoughts?", "Just a thought, not a blocker!"
```

---

### Agent 7: Configuration & Dependencies Review

```
You are reviewing code changes for CONFIGURATION & DEPENDENCIES.

**Tech Stack:** {TECH_STACK}
**Diff Content:** {DIFF_CONTENT}

**Severity Scale:**
- Critical: Exposed secrets, vulnerable dependency with known exploit
- High: Missing env vars for production, breaking config change without migration
- Medium: Inconsistent config across environments, outdated dependency
- Low: Config cleanup, optional dependency update

**Focus Areas:**
- Environment variable usage and documentation
- Configuration file changes (all environments: dev, staging, prod)
- New dependency additions (size, maintenance status, license)
- Dependency version updates (breaking changes, changelog review)
- Breaking changes and backward compatibility
- Feature flags
- Build configuration and CI/CD pipeline impacts
- License compatibility (no GPL in MIT projects, etc.)
- Lock file updates (package-lock.json, yarn.lock, etc.)
- Default values appropriateness
- Known CVEs in dependencies (check with `npm audit`, `pip audit`, etc.)

**Required Output Format:**

#### Findings Table
Number each finding sequentially:
| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | {severity} | {file path} | {line number or range} | {issue description} | {recommendation} |

#### Dependency Changes
For each new or updated dependency:
| Package | Previous Version | New Version | Size Impact | Maintenance Status | Risk |

#### Breaking Changes
List any breaking changes with migration steps, or "None identified."

#### Review Comments
For EACH finding, draft a comment labeled by its number:

##### #1: {Brief title}
File: `{path}:{line}`

> [Comment text in collaborative tone]
>
> {context about why this matters for deployment/compatibility}
>
> Thoughts?

**Comment Tone Guidelines:**
- Open with curiosity: "I noticed...", "Just curious about...", "I was wondering...", "Would it make sense to..."
- Ask questions rather than demand changes
- Flag deployment risks clearly but collaboratively
- End with soft closings: "What do you think?", "Thoughts?", "Just a thought, not a blocker!"
```

---

## Step 6: Compile and Deduplicate Results

After all 7 agents complete:

### 6.1 Merge Findings
Collect all findings from all agents into a unified list.

### 6.2 Deduplicate
Multiple agents may flag the same issue from different angles (e.g., Agent 1 flags missing input validation as a code quality issue, Agent 4 flags it as a security issue). When the same file:line is flagged by multiple agents:
- Keep the **highest severity** rating
- Merge the insights from both agents into a single finding
- Credit both perspectives (e.g., "This is both a code quality and security concern")
- List it under the **most relevant** category (security takes priority over code quality for validation issues)

### 6.3 Determine Verdict
Based on compiled findings:
- **APPROVE**: No Critical or High issues. All findings are Medium or Low.
- **APPROVE WITH COMMENTS**: No Critical issues. 1-2 High issues that are non-blocking. Multiple Medium suggestions.
- **REQUEST CHANGES**: Any Critical issues, OR 3+ High severity issues, OR patterns suggesting systemic problems.

### 6.4 Organize Review Comments
Ensure each section's review comments are numbered to match their findings. When deduplicating findings across agents, merge their corresponding review comments as well. Comments stay inline within each section — do not consolidate into a separate section.

---

## Step 7: Generate Report

Create the report file in the repository root using the Report Template below.

Sanitize identifiers before constructing filenames (replace `/` with `-`, strip whitespace, limit length):

```bash
SAFE_ID=$(echo "$REVIEW_IDENTIFIER" | tr '/' '-' | tr -d '[:space:]' | cut -c1-80)
```

- **For PR mode:** `CODE-REVIEW-PR-{number}.md`
- **For branch mode:** `CODE-REVIEW-BRANCH-{safe-branch-name}.md`
- **For staged mode:** `CODE-REVIEW-STAGED-{YYYY-MM-DD-HHMM}.md`
- **For diff mode:** `CODE-REVIEW-DIFF-{safe-filename}.md`

Populate the template with compiled and deduplicated findings from all agents.

---

## Step 8: Output and Follow-up

After generating the report:

1. **Display a summary** of key findings to the user in the terminal (count by severity per category)
2. **Provide the report path**: `Created: CODE-REVIEW-{identifier}.md`
3. **Remind the user** they can reference findings by section and number (e.g., "Security #2") to discuss any they disagree with

---

## Notes

- All 7 agents MUST be launched in parallel (single message with multiple Agent tool calls)
- Each agent reads the relevant files from the diff and provides specific file:line references
- All agents use the same severity scale defined above
- Agents are language-agnostic but leverage `TECH_STACK` for framework-specific advice
- Findings are deduplicated before final report generation
- PR comments use a collaborative, educational tone — never confrontational
- Include code snippets for suggested fixes wherever applicable
- Consider the context of changes (feature, bugfix, refactor, hotfix) when calibrating severity

---

## Report Template

Use this structure when generating the final report:

```markdown
# Code Review Report

## Metadata

| Field | Value |
|-------|-------|
| **Review Type** | {PR / Branch / Staged / Diff} |
| **Target** | {PR #123 / branch-name / staged changes / filename.diff} |
| **PR URL** | {URL if PR mode, otherwise N/A} |
| **Author** | {author name if available} |
| **Reviewer** | /review |
| **Date** | {YYYY-MM-DD HH:MM} |
| **Base Branch** | {main / master / other} |
| **Tech Stack** | {detected languages, frameworks, tools} |
| **Files Changed** | {count} |
| **Lines Added** | {+count} |
| **Lines Removed** | {-count} |

---

## Executive Summary

### Verdict: {APPROVE / APPROVE WITH COMMENTS / REQUEST CHANGES}

{2-3 sentence summary of the overall code quality and readiness for merge.}

### Quick Stats

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Code Quality | 0 | 0 | 0 | 0 |
| Test Coverage | 0 | 0 | 0 | 0 |
| Performance | 0 | 0 | 0 | 0 |
| Security | 0 | 0 | 0 | 0 |
| Documentation | 0 | 0 | 0 | 0 |
| Error Handling | 0 | 0 | 0 | 0 |
| Configuration | 0 | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** | **0** |

### Key Strengths
- {Notable positive aspect}

### Critical Issues
- {Critical issue if any, or "None identified"}

---

## 1. Code Quality
[Findings table, review comments, summary]

## 2. Test Coverage
[Findings table, missing tests table, review comments, summary]

## 3. Performance
[Findings table with impact column, review comments, summary]

## 4. Security
[Findings table, OWASP compliance table, review comments, summary]

## 5. Documentation
[Findings table, documentation checklist, review comments, summary]

## 6. Error Handling & Observability
[Findings table, observability checklist, review comments, summary]

## 7. Configuration & Dependencies
[Findings table, dependency changes table, breaking changes, review comments, summary]

## 8. Prioritized Action Items
### Must Fix Before Merge (Critical / High)
### Should Address (Medium)
### Nice to Have (Low)

## 9. Files Changed
| File | Status | +/- | Key Changes |

---
*Generated by /review — {YYYY-MM-DD HH:MM}*
```
