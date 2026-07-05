# Migration & Breaking Changes Check

_Read `_protocol.md` first._

**Scope:** API route files, migration files, shared library files, event schema files, env config files.
**Report section title:** `Migration & Breaking Changes`

## Severity Calibration

- 🔴 Critical: Destructive DB migration (DROP column/table) without a data migration plan, removed required API field breaking existing clients
- 🟠 High: API response shape changed without versioning, breaking change to a shared library with multiple consumers
- 🟡 Medium: Env var removed without migration path, URL/route changed that may break bookmarks/clients
- 💭 Low: Deprecation notice missing for removed functionality, minor backward compat opportunity
- ⚠️ Manual: Cannot verify from code — developer must check all consumers manually (e.g., other services, mobile clients)

For each finding, assess: **who is affected, how many consumers, and is there a migration path?**

## Focus Areas

### API Contract Changes

- Removed or renamed response fields — existing clients relying on these will break
- Changed response shapes (e.g., `{ user }` → `{ data: { user } }`)
- Modified HTTP status codes for existing endpoints
- Removed endpoints without deprecation notice
- Changed request schema (new required fields, removed optional fields)
- API versioning: is there a versioning strategy (URL prefix `/v2`, header, etc.)?

### Database Migration Safety

- Destructive operations: `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN` changing type — existing data loss risk
- Column removal: is there a data migration for existing rows?
- Missing rollback strategy: how do you un-apply this migration if it causes issues in production?
- Adding a `NOT NULL` column to an existing table without a default or a backfill migration
- Index removal that other queries may depend on

### Breaking Changes to Shared Libraries / Packages

- Changes to exported function signatures, interfaces, or types that other services/packages consume
- Removed exports without deprecation
- Changed behavior of existing functions that callers depend on
- Internal packages with multiple consumers: who is affected?

### Feature Flag Usage

- Is a feature flag used for incremental rollout of risky changes?
- Are large behavioral changes guarded behind a flag to allow easy rollback?

### Environment Variable Changes

- New required env vars: are all environments (staging, prod, CI) updated?
- Removed env vars: do any services still reference the old var?
- Renamed env vars: is there a migration path for existing deployments?

### URL / Route Changes

- Changed URL structure that could break existing clients, bookmarks, or webhooks
- Redirects in place for changed URLs?

### Event / Message Schema Changes

- Changed event payload shape affecting downstream consumers
- Schema versioning strategy for events?
- Consumer contracts: are downstream consumers informed?

### Deprecation Notices

- Removed functionality documented with a deprecation notice in a previous release?
- Migration guide available for users of the removed feature?

## Check-Specific Rules

- Purely additive changes (new optional fields, new endpoints) are NOT breaking changes.
- Version bumps, CHANGELOG entries, and existing deprecation notices are intent signals.
- Checklist protocol addition: for each finding, identify affected consumers and the migration path.

## Comment Guidance

- Specify who is affected ("Existing clients calling `GET /users` will receive a response missing the `email` field") and propose a migration path.
- For breaking DB migrations: "If this migration is applied and rolled back, the data in the column is lost."
