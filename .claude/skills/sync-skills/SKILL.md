---
name: sync-skills
description: "Copy this repo's skills into another agent harness's skills directory by name — resolves the harness alias to its path via scripts/sync-targets.json and runs sync-skills.sh. Use when the user says to copy/sync/push the skills to another harness (oh-my-pi, opencode, kimi, codex, etc.), e.g. \"copy the skills to oh-my-pi\" or \"push commit and implement to opencode\"."
model: inherit
color: orange
---

# Sync-Skills

Thin natural-language wrapper over `scripts/sync-skills.sh`. The user names a
harness ("copy the skills to oh-my-pi"); you resolve it to a skills directory
and run the sync. All copying, marker safety, and dir resolution live in the
script — you only parse intent, invoke, and relay.

This is a **repo-local dev tool** for maintaining THIS repo. It is not shipped
with the plugin.

## Resolve the repo + script (every run)

The script derives its source dir from its own location, so it must be the repo
copy — never a synced copy. Resolve it once:

```bash
ROOT="$(git -C "$PWD" rev-parse --show-toplevel)"
```

Then use `"$ROOT/scripts/sync-skills.sh"`. If `$ROOT/scripts/sync-skills.sh`
does not exist, stop and tell the user to run this from the skills repo checkout.

## Steps

1. **Parse the request** into:
   - a **harness alias** — normalize the user's phrasing to a canonical key
     ("omp" / "oh my pi" → `oh-my-pi`; "oc" → `opencode`). To see valid keys:
     ```bash
     bash "$ROOT/scripts/sync-skills.sh" list-targets
     ```
   - **skill names**, if any were named (otherwise all skills are pushed).
   - the **verb**: default `push` ("copy to X"). Only use `pull` / `import` /
     `nuke` if the user explicitly asked for that direction.

2. **Run** (push, the common case):
   ```bash
   bash "$ROOT/scripts/sync-skills.sh" --to <alias> push [skill...]
   ```
   Echo the resolved destination (from `list-targets`) before/with the run, then
   relay the script's summary verbatim.

3. **Unknown alias → discovery fallback.** If `--to` exits non-zero with
   "unknown harness", do NOT retry blindly. Instead:
   - Probe a few conventional locations and show what exists:
     ```bash
     ls -d ~/."<name>"/skills ~/.config/"<name>"/skills ~/."<name>" 2>/dev/null
     ```
   - Ask the user to confirm which is the harness's skills bucket (or supply the
     path).
   - Run once against the confirmed path with the literal escape hatch:
     ```bash
     bash "$ROOT/scripts/sync-skills.sh" --target <confirmed-dir> push [skill...]
     ```
   - **Offer** to remember it: append `"<alias>": "<dir>"` to
     `$ROOT/scripts/sync-targets.json` (use `~` for a `$HOME`-relative path) so
     next time `--to <alias>` just works. Only edit the file after the user
     agrees.

## Confirm before running when

- The target is **brand-new / unmapped** (first push to a harness) — show the
  resolved path and get a yes.
- The verb is **`nuke`** or any **`--force`** — these delete/overwrite at the
  target. State exactly what will be removed/overwritten and where, then wait.

A normal `push` to an already-mapped harness needs no confirmation — just echo
the destination and go.

## You Must NOT

- Copy files yourself (`cp`, `rsync`, manual `mkdir`) — the script owns all
  mutation and its marker logic protects unmanaged dirs at the target.
- Call the script via `{base_directory}` — that points at this skill's dir, not
  the repo's `scripts/`. Always resolve `$ROOT` via git.
- Push to a path you guessed without the user confirming it (fallback path).
- Edit `sync-targets.json` before the user agrees to persist a new mapping.
- Run `nuke`/`--force` without an explicit go-ahead.
