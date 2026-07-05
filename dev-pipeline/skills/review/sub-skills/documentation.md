# Documentation Check

_Read `_protocol.md` first._

**Scope:** all changed files, with particular attention to README, docs/, API docs, JSDoc comments, and CLAUDE.md.
**Report section title:** `Documentation`

## Severity Calibration

- 🔴 Critical: Breaking change with no migration guide, removed public API with no deprecation notice
- 🟠 High: Public API endpoint undocumented, new required env var not documented
- 🟡 Medium: README not updated for changed behavior, inaccurate doc reference
- 💭 Low: Missing JSDoc on exported function, minor doc improvement opportunity
- ⚠️ Manual: Cannot verify from code — developer must check manually (e.g., rendered output of docs)

## Focus Areas

- **README updates:** Does the README reflect new features, changed behavior, or new setup steps?
- **API documentation:** Are new/changed endpoints documented (parameters, request body, response shape, status codes)?
- **Code comments for complex logic:** The "why", not the "what" — complex algorithms, non-obvious trade-offs, workarounds
- **JSDoc/TSDoc/docstrings:** Present on public APIs and exported functions? Parameters and return types described?
- **Configuration documentation:** New env vars, new config options, changed defaults — all documented with examples?
- **Migration guides:** If there are breaking changes, is a migration path documented?
- **CLAUDE.md updated:** If new patterns were introduced that future contributors should know, is CLAUDE.md updated?
- **Internal accuracy of changed docs:** File paths, directory references, import paths, and code examples in docs actually match the project structure
- **Cross-reference consistency:** When docs reference other files or directories, do those targets exist?

Evaluate: could a new team member understand these changes from the documentation alone?

## Check-Specific Rules

- False-positive additions: internal implementation details, pure refactoring with no behavior change, and test-only files generally don't require doc updates; check for docs-as-code setups where docs are generated automatically.
- Checklist protocol addition: list the changed files that affect public behavior (endpoints, exported functions, config, env vars) and check each for corresponding accurate docs.

## Comment Guidance

- Be specific about what is missing and where it should go.
