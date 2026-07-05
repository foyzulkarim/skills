# Skill Refactoring Guide — effectiveness + token efficiency

Playbook for optimizing the `dev-pipeline` SKILL.md files. Derived from the
plan-requirements (332 → 213 lines) and plan-architecture (489 → 326 lines)
rewrites on `claude/skill-files-optimization-s2q2pw` — read those two diffs
as the reference standard before starting.

**Goal per skill: ~30–40% fewer tokens, zero behavior change.** If a cut
would change what the agent does, don't make it.

## Ground rules

1. **All user-facing skills are user-command-only.** Every skill a user
   invokes with `/name` has `disable-model-invocation: true` in frontmatter
   (already applied to all 9). This means its description is NEVER loaded
   into session context — it only appears in the `/` picker and marketplace
   UI. Keep the flag when rewriting.
2. **Descriptions are picker one-liners.** No trigger keywords, no "use this
   when…", no "does NOT do X" disclaimers — the user already chose to invoke
   it. Format used so far:
   `"Phase N of 5 — <what it does in ~10 words>; outputs <artifact> for <next skill>."`
   Non-phase skills: one sentence saying what the command does.
3. **The body can assume deliberate invocation.** Delete "When to Use This
   Skill" sections; keep only *skip conditions* ("for X, go straight to
   /other-skill") compressed to 1–2 sentences in the intro.

## The cut list (apply in order)

1. **Say each principle exactly once.** These files typically state their
   3–4 core themes in the intro, again in a dedicated section, again in
   "You Must NOT", again in the checklist, again in the gate. Pick the one
   authoritative home for each theme (usually: numbered principles at the
   top for framing; "You Must NOT" for hard constraints), and delete the
   other restatements. A checklist item may *reference* a principle in a
   few words but must not re-explain it.
2. **Merge "Readiness Checklist" + "Phase N Gate" into one "Readiness
   Gate".** In every skill so far these were near-verbatim duplicates.
3. **Replace pipeline ASCII diagrams and "Where You Sit in the Pipeline"
   sections with one sentence** in the intro: what feeds in, what the output
   is, which skill consumes it.
4. **Fold "Conversation Style / Do" lists back into the phases.** Most items
   repeat instructions already embedded in Phase A/B/C text. Keep only
   style rules that are genuinely global (e.g. "one question at a time")
   and not stated elsewhere.
5. **Compress example lists to the minimum that teaches the pattern.**
   2–3 examples beat 7. Bullet lists of short items can become inline
   prose ("dependency down for 30s; concurrent creates; 10K → 10M rows").
6. **Deduplicate cross-references between sections.** If Section A defines a
   procedure and Section B needs it, Section B says "same discipline as
   Section A" — it does not restate the rules (see plan-architecture's
   Context Gathering vs. Phase D2).

## Extract artifact templates into bundled files

For **multi-turn conversational skills** whose output template is only needed
at the final phase (plan-requirements, plan-architecture, generate-tasks if
applicable), move the ```markdown template out of SKILL.md into
`<skill>/artifact-template.md` and replace the section with a reference:

> The full template lives at `{base_directory}/artifact-template.md`. When
> you reach Phase F — not earlier — read that file and follow its structure
> exactly, filling every section. Do NOT write the artifact from memory or
> improvise the format.

Why: the template would otherwise ride along in context for every turn of a
long interview; as a file it enters context once, at generation time. The
"not earlier / do not improvise" wording is mandatory — it prevents both
premature loading and the agent winging the format. Do NOT do this for
one-shot skills (commit, session-stats): they execute immediately, so
inlining is cheaper than an extra Read.

## What you must NOT cut

- **Artifact templates are the output contract** — whether inline or
  extracted per above, carry them through verbatim. Only cut a template
  section if it's demonstrably redundant with another section of the
  template.
- **Probe/check lists that drive quality** (edge-case categories, stress-test
  angles, footprint walk steps). Compress wording, never drop a category.
- **Concrete thresholds and calibration rules** (">100 matches → too broad",
  "-m 3", "≥2 scenarios", "at least 3 edge cases"). Numbers are load-bearing.
- **"You Must NOT" lists** — keep as a single blunt list; this is where the
  deduplicated hard constraints live.
- **Verbatim script invocations** (`bash {base_directory}/…`) and the
  `{base_directory}` convention.
- **Scripted quotes the agent should say** — keep one exemplar per situation.

## Per-skill notes (remaining work)

- **generate-tasks (419 lines)** — expect the same gate/checklist duplication
  and heavy example task specs. The embedded task-spec template is the
  artifact contract: keep one full example, cut repeats.
- **implement (replaces tdd)** — already restructured: router SKILL.md +
  bundled modes/*.md loaded per task. Keep that shape; don't re-inline modes.
- **review** — done: checks converted to plain `sub-skills/<check>.md`
  reference files; shared scaffolding (role, false-positive rules, tracing,
  output format) hoisted into `sub-skills/_protocol.md`; report format
  extracted to `report-template.md`. Keep that shape — new checks add only
  domain content (Scope, severity calibration, Focus Areas, extras).
- **commit (85), start-task (107), session-stats (42), setup-cost-tracking
  (120)** — already lean. Only shrink descriptions to one-liners and apply
  cut-list items if obvious. Do not over-trim: script-backed skills mostly
  contain operational instructions that are all load-bearing.

## Process per skill

1. Read the whole SKILL.md. List its core themes and mark every place each
   theme is restated.
2. Rewrite in place applying the cut list. Preserve section order where it
   survives — smaller diffs are easier to review.
3. Verify:
   - `bash .github/scripts/test-doc-hygiene.sh` passes
   - frontmatter intact: `name`, one-line `description`, `model: inherit`,
     `disable-model-invocation: true` (user-facing only), `color`
   - `wc -l` before/after — expect 30–40% reduction; if you got <20%, look
     again for duplicate gates/diagrams; if >50%, check you didn't cut
     contract material
   - sanity-test the skill: `scripts/sync-skills.sh push <skill>` and invoke
     it on a toy example
4. One commit per skill, conventional style:
   `refactor: make <skill> skill token-efficient` with a body listing what
   was deduplicated and what was kept intact.
5. `git push -u origin claude/skill-files-optimization-s2q2pw` — the work
   lands on the existing PR #28.

## Style for what remains

Keep imperative voice directed at the agent ("You are…", "Do not…"), keep
sentences complete, don't compress into fragments or telegraphese — the goal
is fewer *repetitions*, not denser prose. English only. Use today's date
convention and `{base_directory}` references exactly as the originals do.
