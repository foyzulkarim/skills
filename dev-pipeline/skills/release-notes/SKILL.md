---
name: release-notes
description: "Draft a changelog for the next release by summarizing git commits since the last tag. Use when preparing a version bump or cutting a release."
model: inherit
color: plum
---

# Release Notes

Draft a release changelog by summarizing the commits since the last release, then suggest the
next semver version and prepend the entry to `CHANGELOG.md` at the project root.

## Steps

1. **Find the commit range and version baseline.** Determine the last released tag:

   ```bash
   git describe --tags --abbrev=0 2>/dev/null
   ```

   - If a tag exists, the range is `<tag>..HEAD`, and the tag itself is the version baseline.
   - If no tag exists (fresh repo), use the full history and **ask the developer** for the
     current version — do not infer it from any manifest, lockfile, or config file belonging to
     the project. This skill only reads git; it never inspects a project's toolchain.

2. **Collect the commits** in the range:

   ```bash
   # with a tag:
   git log <tag>..HEAD --oneline --no-merges
   # without a tag:
   git log --oneline --no-merges
   ```

3. **Group the commits** by type, inferring the type from the message
   (Conventional Commits prefix if present, otherwise from the wording):
   - **Features** — new functionality (`feat`, "Add", "Support")
   - **Fixes** — bug fixes (`fix`, "Fix", "Correct")
   - **Chores / Maintenance** — `chore`, `refactor`, `docs`, deps, tooling
   - Drop noise (pure formatting/typo commits) or fold them into a related entry.

4. **Suggest the next version** from the baseline established in Step 1 (the tag, or the
   version the developer gave you), using semver:
   - Breaking changes → **major**
   - Any new feature → **minor**
   - Only fixes/chores → **patch**

   State the bump explicitly (e.g. `1.1.0 → 1.2.0`) and the one reason for it.

5. **Draft the release entry** in this shape (omit empty sections):

   ```markdown
   ## v<next-version> — <YYYY-MM-DD>

   ### Features
   - <user-facing summary> (<short-sha>)

   ### Fixes
   - <user-facing summary> (<short-sha>)

   ### Maintenance
   - <user-facing summary> (<short-sha>)
   ```

6. **Write the entry to `CHANGELOG.md`** at the project root:

   - If `CHANGELOG.md` does not exist, create it with a top-level heading:
     ```markdown
     # Changelog
     ```
   - Read the current contents of `CHANGELOG.md`.
   - Prepend the new entry (insert it immediately after the `# Changelog`
     heading line, before any existing entries) so the file stays newest-first.
   - Write the updated file.

   Use the Read and Write (or Edit) tools to do this — do **not** shell out to
   `sed` or `awk`.

7. **Report to the user** what was written: show the new entry inline and
   confirm the file was updated.

## Notes

- Write entries from the **user's** perspective (what changed for them), not a
  verbatim commit-message dump.
- Include today's date (from the `currentDate` context, or `date +%Y-%m-%d`)
  in the entry heading.
- Do **not** create the tag, bump any version file, or push anything unless the
  user explicitly asks — this skill only drafts and records the notes.
