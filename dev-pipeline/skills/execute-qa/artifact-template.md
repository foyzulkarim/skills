# QA Results: <Title>

> **Plan:** [QA-<N>-<slug>.md](./QA-<N>-<slug>.md)
> **Issue:** #<N>                                  ← mirror only the plan header rows that apply

### Run <n> — YYYY-MM-DD, commit `<sha>`, environment <URL>

| Case | Verdict | Evidence / Notes |
|---|---|---|
| QA-1–4 | PASS | — |
| QA-5 | PASS (judged) | Toast reads "Email notifications are now on" — names the setting, meets the criterion |
| QA-6 | **FAIL** | Expected HTTP 403, got 404 — gate ordering regression |
| QA-7 | PARTIAL | Criterion says "names the field"; message reads "Invalid input" — flagged for developer |

**Findings**

| ID | Severity | Description | file:line |
|---|---|---|---|
| F-1 | 🟠 High | <what broke and why> | `path/to/file.ext:123` |

**Run notes**
Structural plan errors fixed mid-run, skipped-case reasons, environment quirks.
