---
name: start-task-v2
description: "Zero-confirmation GitHub issue branch bootstrap. Parses issue number from args, fetches the issue, generates a clean slug via LLM, and runs the script in one shot. GitHub-only. Supports: 'github issue 100', 'gh issue 100', 'issue 100', '#100', or bare '100'. Use start-task for Jira or local specs."
model: inherit
color: cyan
---

# start-task-v2

Bootstrap a GitHub issue as a feature branch in one shot. No confirmation prompts. Parse → fetch → slug → branch → done.

## Step 0 — Parse args (no bash)

Extract the numeric issue number from whatever the user typed after the skill name. Strip any of: `github`, `gh`, `issue`, `issues`, `#`. The remaining numeric token is `ISSUE_NUM`.

If no numeric token is found: hard-stop with exactly this message — do not ask for clarification:

```
No issue number found. Usage: /start-task-v2 100
```

## Step 1 — Check prerequisites (1 bash call)

```bash
which gh && gh auth status
```

- `gh` not found → hard-stop: `"gh CLI is not installed. Run: brew install gh"`
- Auth failure → hard-stop: `"Not authenticated to GitHub. Run: gh auth login"`

No questions. If either check fails, the skill ends here.

## Step 2 — Fetch issue (1 bash call)

```bash
gh issue view <ISSUE_NUM> --json title,labels --jq '{title: .title, labels: [.labels[].name]}'
```

If the command fails or title is null: hard-stop with the error verbatim.

Extract `TITLE` and `LABELS` from the JSON output.

## Step 3 — Derive type and slug (LLM reasoning, no bash)

**Derive TYPE from labels** (first match wins):

| Labels contain | TYPE |
|---|---|
| `bug`, `fix`, `hotfix` | `fix` |
| `enhancement`, `feature` | `feat` |
| `refactor` | `refactor` |
| `docs`, `documentation` | `docs` |
| `test`, `tests` | `test` |
| `ci`, `github-actions` | `ci` |
| `chore`, `deps`, `dependencies` | `chore` |
| _(no match)_ | `feat` |

**Derive SLUG from TITLE:**

1. Lower-case everything
2. Drop: articles (`a`, `an`, `the`), prepositions (`for`, `with`, `via`, `in`, `on`, `at`, `of`, `to`, `into`, `from`), helper verbs (`is`, `be`, `has`, `are`, `was`, `do`, `does`)
3. Keep the core action verb + object noun(s)
4. Limit to 2–4 words
5. Hyphenate between words; only `[a-z0-9-]`

Examples:
- "Add user authentication to the login form" → `add-user-auth`
- "Fix null pointer in payment processing flow" → `fix-null-pointer-payment`
- "Remove legacy REST API endpoints for v1" → `remove-legacy-api`
- "Update dependencies to latest versions" → `update-dependencies`
- "Implement dark mode toggle in settings" → `dark-mode-toggle`

## Step 4 — Run the script (1 bash call)

```bash
bash {base_directory}/gh-start-task-v2.sh <ISSUE_NUM> <TYPE> <SLUG>
```

- Exit 0 → proceed to Step 5.
- Non-zero → hard-stop and print stderr verbatim. Do not paraphrase or ask questions.

## Step 5 — Report result (no bash)

Print this summary and nothing else:

```
Branch: <TYPE>/<ISSUE_NUM>/<SLUG>
Issue:  #<ISSUE_NUM> — <TITLE>
Context: specs/context/<ISSUE_NUM>.md

Next:
  /plan-requirements   — capture WHAT and WHY
  /plan-architecture   — design the solution
  /tdd                 — start coding
```

## Rules

- **Never ask for confirmation** at any step of the happy path.
- **Never paraphrase errors** — print script stderr verbatim so the developer gets the exact actionable message.
- **Hard-stop means stop** — do not offer alternatives, retries, or follow-up questions on failure.
- The slug Claude derives in Step 3 is passed as `$3` to the script, overriding the script's own regex sanitization.
