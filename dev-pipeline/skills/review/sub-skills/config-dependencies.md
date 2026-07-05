# Configuration & Dependencies Check

_Read `_protocol.md` first._

**Scope:** package.json, lock files, .env files, config files, CI/CD configs, Dockerfiles.
**Report section title:** `Configuration & Dependencies`

## Severity Calibration

| Severity | Criteria |
|----------|----------|
| 🔴 Critical | Known CVE in added/updated dependency, secret committed to source |
| 🟠 High | Unmaintained dependency added, lock file out of sync with package.json |
| 🟡 Medium | Missing env var documentation, new dep added without size/license check |
| 💭 Low | Minor config improvement, optional hardening |
| ⚠️ Manual | Cannot verify from code — developer must check (e.g., CVE database, runtime behavior of config) |

## Focus Areas

### Environment Variables

- New env vars are documented (README, .env.example, or config docs)
- Removed env vars are noted with migration path if used in production
- Default values are appropriate and safe (not dev-only defaults leaked to prod)
- Secrets are never hardcoded — env vars used for all credentials

### Configuration Files

- Changes cover all environments (dev, staging, prod) consistently
- No dev-only settings leaked to production config
- Default values are explicitly stated and documented

### New Dependency Additions

For each new dependency added:
- **Size impact:** What is the bundle/install size? Is it proportionate to the value?
- **Maintenance status:** Is it actively maintained? Last release date? Open issues?
- **License compatibility:** Is the license compatible with the project (MIT, Apache 2.0 vs GPL)?
- **Known CVEs:** Check if the version has any known vulnerabilities
- **Necessity:** Could this functionality be achieved with an existing dependency or standard library?

### Dependency Version Updates

- Are the changelog/release notes for the updated version checked for breaking changes?
- Is the update a patch, minor, or major bump? Major bumps require closer scrutiny
- Are there any breaking changes that affect the current usage?

### Lock File Consistency

- Lock file (package-lock.json, yarn.lock, pnpm-lock.yaml) is committed and up to date
- Lock file changes are consistent with package.json changes (no phantom additions)

### Build Configuration & CI/CD

- New build steps or config changes don't introduce obvious inefficiencies
- CI/CD pipeline impacts are considered (new environment variables needed in CI?)
- Docker/container config changes are consistent and correct

## Check-Specific Rules

- False-positive addition: an "unmaintained" dependency may be a stable, complete library (e.g., `mime-types`) that legitimately doesn't need frequent updates.
- For each new or updated dependency: assess size impact, maintenance status, and risk level.
- Checklist protocol addition: per new dependency — size, maintenance, license, CVE; per updated dependency — breaking change scan; plus env var docs and lock file consistency.

## Comment Guidance

- For dependency risks: include specific details (license name, last publish date, CVE ID).
