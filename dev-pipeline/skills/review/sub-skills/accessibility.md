# Accessibility Check

_Read `_protocol.md` first._

**Scope:** .tsx, .jsx, .html, .css files with UI/component code.
**Report section title:** `Accessibility`

## Severity Calibration

| Severity | Criteria |
|----------|----------|
| 🔴 Critical | Interactive element completely unreachable via keyboard, form with no label (screen reader cannot describe field) |
| 🟠 High | Missing ARIA label on a complex interactive element, focus not managed after modal opens |
| 🟡 Medium | Non-semantic HTML where semantic exists, heading hierarchy skipped, ARIA live region missing for dynamic content |
| 💭 Low | Minor ARIA improvement, additional context opportunity |
| ⚠️ Manual | Cannot verify from code — developer must test with a screen reader or axe DevTools |

For each finding, reference the relevant WCAG 2.1 criterion (e.g., "WCAG 2.1.1 Keyboard", "WCAG 1.1.1 Non-text Content").

## Focus Areas

- **Missing ARIA attributes:** `aria-label`, `aria-describedby`, `role` missing on interactive elements that lack visible text labels (icon buttons, custom dropdowns, dialogs)
- **Keyboard navigation:** Interactive elements not reachable via `Tab`, clickable `<div>`/`<span>` without `onKeyDown`/`onKeyPress` handler and `tabIndex`, custom widgets without full keyboard support (arrow keys for menus)
- **Semantic HTML:** `<div>` or `<span>` used where semantic elements are appropriate (`<button>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`, `<aside>`)
- **Form accessibility:** Inputs without associated `<label>` or `aria-label`, missing `htmlFor`/`id` pairs, no error announcements (`aria-live` or `aria-describedby` pointing to error message)
- **Focus management:** Focus not moved after dynamic content changes (modal opens without focus moving inside, route transitions leaving focus on unmounted elements, toast notifications not announced)
- **Image `alt` text:** Missing `alt` attribute on `<img>` tags, non-descriptive alt text ("image", "photo", "icon"), decorative images not marked as `alt=""`
- **Color contrast:** Hardcoded color values that may not meet WCAG AA ratios (4.5:1 for normal text, 3:1 for large text ≥18pt or 14pt bold) — flag suspicious low-contrast combinations
- **ARIA live regions:** Dynamic content updates (real-time data, notifications, status messages) not announced via `aria-live="polite"` or `aria-live="assertive"` for screen readers
- **Heading hierarchy:** Skipped heading levels (`h1` → `h3` without `h2`), multiple `h1` tags on a single page, headings used for styling rather than document structure

## Check-Specific Rules

- False-positive additions: UI library components (MUI Button, Radix Dialog) handle accessibility internally; `aria-hidden="true"` on decorative elements is correct, not a finding. Backend-only, API-only, and test-only changes: skip this check.
- Findings table adds a **WCAG** column (the criterion reference) between Issue and Recommendation.

## Comment Guidance

- Reference the WCAG criterion and explain the real-world impact for screen reader users; open with "Screen reader users may find..." where apt.
