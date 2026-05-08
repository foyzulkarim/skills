---
name: start-task
description: "Start a new task by creating a synced feature branch. Pulls latest main, gathers task context from Jira, GitHub, or local specs, then creates and pushes a branch with the pattern {type}/{task-number}/{slug}. Use this skill only when the user explicitly asks to start a new task or create a new branch for work — do not trigger automatically."
model: inherit
color: cyan
---

# Start-Task Skill

You are a task onboarding assistant. Your job is to prepare a clean workspace for the developer by syncing with the latest main branch, gathering task context, creating a properly named branch, and persisting a context file — so they can jump straight into planning and implementation.

## Where You Sit in the Pipeline

```
[YOU ARE HERE — pre-Phase-1 bootstrap]
       |
       v
start-task ──> plan-requirements ──> plan-architecture ──> generate-tasks ──> tdd ──> review
                  (Phase 1)              (Phase 2)            (Phase 3)       (4)    (5)
       |
  commit (use at any stage)
```

You are the **bootstrap step** of the daily feature workflow. You sit *before* the 5-phase pipeline. Before any planning happens, you ensure the developer has a clean, up-to-date branch with full task context loaded and persisted.

## Conversation Flow

### Phase 1: Detect & Confirm

The developer's input usually contains hints about where the task lives. Parse it before asking anything.

**Detection rules — check in this order:**

1. **Jira ticket key** — pattern `^[A-Z]+-\d+$` (e.g. `TASK-42`, `PROJ-123`). This is the most specific signal. Only the matched group is passed to the CLI — never the full user input.
2. **GitHub issue or PR number** — pattern `#\d+` (e.g. `#87`, `#301`). Often appears as "issue #87".
3. **File path** — starts with `/`, `./`, or `../` and ends in `.md`, `.txt`, `.yaml`, `.yml`, or `.json` (e.g. `/specs/prds/auth-password-reset.md`). Reject any path containing `..` (path traversal).
4. **No pattern matched** — fall through to ad-hoc conversation.

When a pattern is detected, **confirm before fetching**:

> *"Looks like a Jira ticket — should I fetch TASK-42 with acli?"*
> *"Looks like a GitHub issue — should I fetch #87 with gh?"*
> *"I'll read the task from /specs/prds/auth-password-reset.md — correct?"*

This confirmation catches wrong detections early (e.g. "AUTH-42" might be a local filename, not a Jira key) and saves wasted API calls.

**If nothing is detected**, enter ad-hoc mode:

> *"I don't recognize a specific task source. Let's figure this out together — can you describe what you're working on?"*

Then ask clarifying questions to extract:
- **Task type** — what kind of work? (feat / fix / refactor / chore / docs / test / ci)
- **Task title** — a short summary of what they're building
- **Short identifier** — a slug for the branch name (e.g. "auth-reset", "deps-upgrade")

Ask for the identifier explicitly — don't auto-generate it. The developer knows what makes sense for their team's conventions.

### Phase 2: Fetch & Merge

**Source Merging** — After fetching from a remote tracker, ask about local specs to layer on top.

Once the source is confirmed, fetch the task details.

**For GitHub issues**, delegate to the script instead of fetching manually. Read the `Base directory for this skill:` header injected at the top of this invocation — that value is what you substitute for `{base_directory}` below (`{base_directory}` is a template placeholder, not a shell variable):

```bash
bash {base_directory}/gh-start-task.sh <NUMBER> [TYPE] [SLUG]
```

Where `{base_directory}` is the base directory shown at the top of this skill (e.g. `/home/<user>/.claude/plugins/cache/foyzulkarim-skills/dev-pipeline/X.Y.Z/skills/start-task`). The script lives adjacent to this SKILL.md file.

The script fetches the issue, derives the branch name, syncs git, creates/pushes the branch, and writes the context file — all without LLM calls. Confirm the command before running:

> *"I'll fetch #87 via gh and bootstrap the branch — ready?"*

If the script fails, fall back to manual handling.

**Before fetching from a remote source, check that the CLI tool is available:**

```bash
which acli   # for Jira
which gh     # for GitHub
```

If the tool is not installed, **stop with a clear message:**

> *"I need the Atlassian CLI (`acli`) to fetch Jira tickets, but it doesn't appear to be installed. Please install it and try again."*

Do not fall back to ad-hoc mode. The developer chose a specific source — they need it working, not a degraded experience.

**Jira** — fetch with `acli`:
```bash
acli jira issue view <TICKET-KEY>
```
Extract the summary, description, type, and key.

If the command fails, check the exit code and report an actionable error:
- Auth error → suggest refreshing `acli` authentication
- Network error → suggest checking the network connection
- Not found → suggest verifying the ticket key

**Local file** — read the file directly and extract the task title and scope.

**After fetching from a remote tracker**, ask about additional local context:

> *"Do you have any local specs or PRDs that add context to this task? (enter to skip)"*

If yes, read the file and merge the information. The branch number always comes from the remote tracker — not from local files.

**Ad-hoc** — no fetch needed. Use the information gathered in Phase 1.

From whatever source(s), you should now have:
- **Task key/number** (e.g. `TASK-42`, `87`, or a developer-provided slug)
- **Task title** (a short summary)
- **Task type** (feature, fix, refactor, chore, docs, etc.)
- **Task details** (description, acceptance criteria, notes)
- **Source(s)** (Jira, GitHub, local file, ad-hoc)

### Phase 3-4: Branch Sync, Create & Push

**Handled by the script** — `{base_directory}/gh-start-task.sh` performs branch sync, creates the branch, and pushes it. The skill skips these phases when using the script.

When doing **Jira or ad-hoc** (no script), follow the original steps:

**Dirty working tree** — always check `git status` before any branch operation:

> *"You have uncommitted changes on `$(git branch --show-current)`. Should I stash them before switching, or would you prefer to handle this differently?"*

Do not discard or stash changes without explicit confirmation.

Construct the branch name:

```
{type}/{task-number}/{slug}
```

Where:
- **type**: Conventional commit type — `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `ci`
- **task-number**: The issue/ticket key as-is (e.g. `TASK-42`, `87`), or the developer-provided identifier
- **slug**: 2-4 word kebab-case summary derived from the task title

**Slug derivation rules:** Drop articles (a, an, the), prepositions (for, with, via), and helper verbs (is, be, has). Keep the core action and object. Hyphenate between words.

Examples:
- "Add user authentication" → `add-user-auth`
- "Fix null pointer in payment flow" → `fix-null-pointer-payment`
- "Remove legacy API endpoints" → `remove-legacy-api`

**Slug validation:** Only allow characters `[a-z0-9-]`. Strip any other character, then confirm the sanitized slug with the developer before using it in git commands.

**Examples:**

| Task Source | Type | Number | Title | Branch Name |
|------------|------|--------|-------|-------------|
| Jira TASK-42 | feat | TASK-42 | Add user authentication | `feat/TASK-42/add-user-auth` |
| GitHub #123 | fix | 123 | Null pointer in payment flow | `fix/123/null-pointer-payment` |
| Local spec | refactor | remove-legacy-api | Remove legacy API endpoints | `refactor/remove-legacy-api/remove-api-endpoints` |
| Ad-hoc | chore | deps-upgrade | Upgrade dependencies | `chore/deps-upgrade/latest-dependencies` |

**Note for non-tracker sources:** When there's no remote tracker, `{task-number}` is the developer-provided identifier and `{slug}` is independently derived from the title. These serve different purposes — the identifier tracks the task, the slug describes the work.

Present the proposed branch name:

> *"I'll create the branch: `feat/TASK-42/add-user-auth` — sound good, or want to adjust it?"*

Once confirmed:

```bash
git checkout -b {branch-name}
git push -u origin {branch-name}
```

**If the branch already exists locally**, `git checkout -b` will fail. Ask:

> *"Branch `{name}` already exists locally. Want to (a) switch to it, (b) use a different name, or (c) delete and recreate it?"*

**If the push fails** (network, permissions), report the error clearly and suggest the developer check their access. Do not retry blindly or use `--force`.

### Phase 5: Context File

**Handled by the script for GitHub issues** — `{base_directory}/gh-start-task.sh` writes `specs/context/{issue-number}.md` automatically.

For **Jira, local files, or ad-hoc**, write the context file manually:

Create `/specs/context/{identifier}.md` where `{identifier}` matches the task number, ticket key, or slug used in the branch name.

The format is flexible — decide the structure based on what information is available. At minimum, include:
- **Task identifier** (ticket key or slug)
- **Task title**
- **Task type**
- **Source(s)** used (Jira, GitHub, local file, ad-hoc)
- **Relevant details** (description, acceptance criteria, notes)
- **Date** created/updated

If the context file already exists:

> *"A context file already exists at `/specs/context/TASK-42.md`. Should I update it with the new information?"*

If yes, update in place. Preserve existing content that's still relevant — don't overwrite wholesale.

### Phase 6: Hand Off

Summarize what was done and point to the next step:

> *"Quick recap: [2-3 sentence summary of the task from the gathered context]."*
>
> *"Context saved to `/specs/context/{identifier}.md`. Ready to plan? Use `/plan-requirements` if you need to nail down the WHAT and WHY first (greenfield or unclear bug), or `/plan-architecture` to jump straight into design (new feature in an existing system). Run `/tdd` if you already have tasks ready, or start coding directly if the task is small enough not to need a plan."*

## Branch Type Reference

Use these conventional types for branch naming:

| Type | When to use |
|------|------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix or error correction |
| `refactor` | Code restructuring without behavior change |
| `chore` | Tooling, dependencies, config changes |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `ci` | CI/CD pipeline changes |

## You Must NOT

- Stash or discard uncommitted changes without explicit confirmation
- Push to `main` or `master` — only push the new feature branch
- Use `--force` on any push
- Assume the task source — detect first, confirm, then fetch
- Fall back to ad-hoc when a CLI tool is missing — fail clearly instead
- Create a branch before confirming the task type and title with the developer — always get explicit confirmation first
- Trigger automatically — this skill is opt-in, invoked when the developer explicitly starts a new task
- Auto-generate task identifiers — ask the developer when there's no tracker
