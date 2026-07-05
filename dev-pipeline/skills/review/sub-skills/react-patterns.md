# React / Next.js Patterns Check

_Read `_protocol.md` first — including the 2-Level Tracing Protocol._

**Scope:** .tsx, .jsx, .ts files with React/Next.js code.
**Report section title:** `React / Next.js Patterns`

## Severity Calibration

| Severity | Criteria |
|----------|----------|
| 🔴 Critical | Hooks rules violation causing runtime crash, hydration mismatch causing broken rendering, Next.js routing violation shipping non-page code as a route |
| 🟠 High | Stale closure causing incorrect behavior, server/client boundary violation |
| 🟡 Medium | Unstable reference causing unnecessary re-renders, derived state stored in useState |
| 💭 Low | Minor optimization (useMemo/useCallback), minor hook cleanup |
| ⚠️ Manual | Cannot verify from code — developer must test in browser |

## Focus Areas

- **Hooks rules violations:** Hooks called conditionally (inside `if`/`switch`/loops), called after early returns — these cause "rendered more/fewer hooks than previous render" crashes
- **Stale closures:** `useEffect`/`useCallback`/`useMemo` capturing changing variables without listing them in the dependency array, causing the closure to use outdated values
- **Unstable references:** Object/array literals created inline in JSX render (new reference every render), functions created inline without `useCallback`, computed values without `useMemo` — these cause children to re-render unnecessarily
- **Hydration mismatches:** Date formatting, random values (`Math.random()`), or browser-only APIs (`window`, `document`) used in initial render without SSR guards — causes mismatch between server and client HTML
- **Server/client boundaries (Next.js):** Missing `'use client'` on components using hooks/browser APIs, non-serializable props passed across server/client boundary, sensitive data accidentally included in Client Components
- **Derived state:** Values computed from props/state stored in `useState` instead of computed during render or memoized — leads to stale state and sync bugs
- **Context overuse:** High-frequency value changes in a Context causing all consumers to re-render — consider splitting context or using a selector
- **Next.js file-based routing violations:** Non-route files (tests, utilities, helpers, constants, components) placed under `pages/` or `app/` directories — Next.js treats them as routes, causing build failures or unintentionally shipping non-page code

## Tracing

Prioritize: components with hooks, components near server/client boundaries. In tracing notes, record whether each usage site is a Server or Client Component and whether it sits under `pages/` or `app/`.

## Check-Specific Rules

- SSR guards (`typeof window !== 'undefined'`) and `// intentional — browser-only` comments are intent signals, not findings.
- For unstable references: only flag when the unstable reference is passed as a prop or dep-array entry — inline handlers with no deps are fine.

## Comment Guidance

- Explain the actual React behavior that will occur (e.g., "The effect will capture the initial value of `userId` and never update when it changes").
