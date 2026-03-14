# review

Comprehensive code review using 7 parallel specialized agents. Works with any repository, language, or framework.

## Features

- **7 parallel review agents:** Code Quality, Test Coverage, Performance, Security, Documentation, Error Handling, Configuration & Dependencies
- **Language-agnostic:** Auto-detects tech stack and adapts advice
- **Multiple modes:** PR, branch, staged changes, or diff files
- **Structured report:** Generates a full markdown report with severity-ranked findings
- **Collaborative tone:** Review comments use educational, curiosity-driven language

## Usage

```bash
# Review a pull request
/review pr 123

# Compare a branch against default branch
/review branch feature/auth-redesign

# Review staged changes (default)
/review staged

# Review a diff file
/review diff changes.diff

# No arguments defaults to staged
/review
```

## Install

```
/install-plugin foyzulkarim/skills review
```

## Output

Generates a `CODE-REVIEW-*.md` report in the repository root with:
- Executive summary and verdict (APPROVE / APPROVE WITH COMMENTS / REQUEST CHANGES)
- Findings by category with severity ratings
- Prioritized action items
- Inline review comments with suggested fixes
