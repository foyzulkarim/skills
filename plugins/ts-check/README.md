# ts-check

Deep TypeScript/JavaScript analysis using parallel agents with 2-level code tracing. Goes beyond surface-level linting to catch runtime patterns, type safety holes, and framework-specific anti-patterns.

## Features

- **2-level code tracing:** For each changed function, traces callers (1 level up) and callees (1 level down) to understand full context
- **3 core agents:** TypeScript Strictness, Runtime Behavior, Async Patterns (always run)
- **3 conditional agents:** React/Next.js, Express, Database — activated only when detected in `package.json`
- **Stack auto-detection:** Reads `package.json` to determine which agents to activate

## Usage

```bash
# Deep analysis of a pull request
/ts-check pr 123

# Compare a branch against default branch
/ts-check branch feature/auth-redesign

# Deep analysis of staged changes (default)
/ts-check staged

# No arguments defaults to staged
/ts-check
```

## Install

```
/install-plugin foyzulkarim/skills ts-check
```

## Output

Generates a `TS-DEEP-*.md` report with:
- Stack detection results and agents activated
- Findings with tracing notes showing caller/callee context
- Severity-ranked action items
- Verdict (APPROVE / APPROVE WITH COMMENTS / REQUEST CHANGES)
