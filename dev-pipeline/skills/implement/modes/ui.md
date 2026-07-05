# Mode: ui — Implement, Then Verify by Eye with Evidence

For visual and UX work — layout, styling, interaction feel — where the judge is a human eyeball, not an assertion. The task's Verification Checklist is the contract: each item names something observable and the expected observation.

## The Loop

1. **Read the Verification Checklist** and any design references in the task spec. If a checklist item isn't observable ("looks clean"), tighten it with the developer before implementing.
2. **Implement** against the task's pattern references and the project's component conventions.
3. **Self-verify and gather evidence.** Run the app or component workbench (Storybook or similar if the project has one). Walk every checklist item and capture evidence — screenshots at the states and viewport sizes the checklist names; use Playwright for capture if it's available in the project, otherwise describe exactly what to check and where.
4. **Cover the testable seams.** Assert what automation *can* judge: the component renders without errors, conditional states appear (loading/empty/error), handlers fire, accessibility basics (roles, labels, focus order) — using the project's existing component-test setup. Do not attempt to assert visual aesthetics.
5. **Present the checklist with evidence** — item by item: expected vs. observed, with the screenshot or reproduction steps. **Collaborative:** the developer confirms each session of checklist items. **Autonomous:** the checklist WITH evidence is the end-of-task summary; the human confirmation happens there — a ui task is never silently self-approved.

## Mode-Specific Rules

- The checklist is verified against a **running** app or workbench — never from reading the code.
- If substantial logic appears mid-task (calculations, branching state), that logic deserved its own `tdd`/`test-after` task — extract or flag it; don't bury logic in a ui task without tests.
- Respect the design system/tokens the project already uses; a checklist pass that violates project conventions is not a pass.
- Note the browsers/viewports actually verified; don't claim coverage you didn't observe.
