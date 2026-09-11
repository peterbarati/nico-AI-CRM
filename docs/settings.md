# Business settings

## Scope

`/settings` manages allowlisted internal business configuration only. Account, permission, security, secret, and deployment settings are excluded.

## Sections

- Customer Service: daily target, reorder/risk/reactivation thresholds, suppression period, and deterministic scoring weights.
- Sales: shows the approved workflow boundary; no extra tunable rule is introduced yet.
- KPI: role/user targets, weights, company target, attribution window, and reactivation inactivity threshold.
- Business: timezone, company name, reporting currency, and default reporting period.
- AI: enabled state, provider, model, timeout, token limit, and cache TTL.

`OPENAI_API_KEY` is an environment secret and is never displayed or accepted by the settings API.

## API and validation

`GET /api/settings` returns grouped editable settings, KPI targets, company targets, and provider availability without secret values. `PATCH /api/settings` accepts only known keys and known target IDs.

Validation enforces positive call targets and day values, `critical >= at-risk`, `reactivation >= critical`, valid IANA timezone, a three-letter currency, supported providers, bounded AI timeout/token/cache values, non-negative targets, weights from 0 to 1, and role default weights totaling 1.

Updates write existing allowlisted rows only. They do not create arbitrary `system_config` keys. Customer Service reads configuration per queue request and KPI/dashboard reads targets per request, so saved changes take effect without code changes or cache invalidation.

## Production boundary

Settings writes are intentionally unauthenticated only because production authentication is a stated non-goal. The PATCH endpoint must be protected by manager/admin authorization before any production deployment. Deployment hardening must also configure Worker secrets and environment-specific settings.
