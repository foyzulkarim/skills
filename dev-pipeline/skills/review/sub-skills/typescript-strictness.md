# TypeScript Strictness Check

_Read `_protocol.md` first — including the 2-Level Tracing Protocol._

**Scope:** TypeScript files (.ts, .tsx) from the changeset.
**Report section title:** `TypeScript Strictness`

## Severity Calibration

| Severity | Criteria |
|----------|----------|
| 🔴 Critical | Type assertion hiding a runtime crash (`as unknown as X`), `ts-ignore` masking a real type error |
| 🟠 High | Widespread `any` usage leaking across module boundaries, missing return type on critical exported function |
| 🟡 Medium | Unnecessary `any`, missing explicit return type on exported function, loose generic |
| 💭 Low | Minor typing improvement, stricter typing opportunity |
| ⚠️ Manual | Cannot verify from code — developer must check TypeScript compiler output |

## Focus Areas

- `any` usage — is it lazy or necessary? Check if proper types exist in the ecosystem
- Type assertions (`as X`) — especially `as unknown as X` chains that bypass the type system
- Non-null assertions (`!`) — trace to see if null is actually impossible at that point
- `@ts-ignore` / `@ts-expect-error` — what is being suppressed and why?
- Overly loose generics, missing generics, unnecessary generic complexity
- Missing explicit return types on exported functions
- Implicit `any` returns, `Promise<any>` return types
- Array methods that lose type info (`.reduce()` without type parameter)
- Index access without `undefined` handling (`obj[key]` where key is dynamic)
- Patterns that would fail under `strictNullChecks` or `noImplicitAny`

## Tracing

Trace significant functions with logic (not type definitions or re-exports). Prioritize: exported functions first, then functions with type assertions or `any`.

## Check-Specific Rules

- False-positive addition: `any` that is immediately narrowed (e.g., JSON.parse result validated with a type guard) is acceptable.
- Checklist protocol addition: per file, identify `any`, type assertions, `!`, `@ts-ignore`, and exported functions without return types.

## Comment Guidance

- Show the exact unsafe pattern and the safe alternative.
