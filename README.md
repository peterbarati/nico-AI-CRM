# NICO AI CRM

Internal CRM and AI-assisted customer service platform.

The current development foundation is self-contained and uses mock/demo CRM data. It does not connect to Money S4. AI and authentication both use explicit mock providers locally, with production provider boundaries prepared but not deployed.

## Stack

- Cloudflare Workers API
- Cloudflare D1-ready database package
- Vite + React frontend
- TypeScript monorepo
- Vitest, ESLint, and Prettier

## Architecture

```text
apps/
  web/       React frontend
  worker/    Cloudflare Worker API
packages/
  auth/      authentication provider and authorization contracts
  campaign-provider/
            normalized campaign delivery boundary and deterministic mock provider
  db/        D1 schema/client boundary
  shared/    shared types and constants
  erp-contract/
            ERP provider interface and mock provider
migrations/  D1 migrations
docs/        architecture notes
tests/       cross-package test home
```

CRM business logic must depend on `packages/erp-contract`, not a concrete ERP implementation. The current implementation uses `MockERPProvider` only. `MoneyS4Provider` is a Phase 2 placeholder with no connection logic.

## Local Development

Install dependencies:

```bash
npm install
```

Prepare the local D1 database:

```bash
npm run db:migrate:local
npm run db:seed:local
```

Run the Worker API and frontend together:

```bash
npm run dev
```

The Worker runs on `http://localhost:8787`.
The frontend runs on `http://localhost:5173` and proxies `/api/*` to the Worker.
Choose one of the deterministic CRM users on the local sign-in screen.

Health endpoint:

```bash
curl http://localhost:8787/api/health
```

Demo API endpoints require an explicit mock actor when called outside the browser:

```bash
curl -H "X-Mock-User-Id: usr-admin-001" "http://localhost:8787/api/customers?page=1&pageSize=10"
curl -H "X-Mock-User-Id: usr-cs-001" http://localhost:8787/api/customer-service/queue
curl -H "X-Mock-User-Id: usr-sales-002" http://localhost:8787/api/sales/tasks
curl -H "X-Mock-User-Id: usr-manager-001" http://localhost:8787/api/dashboard?period=month
curl -H "X-Mock-User-Id: usr-admin-001" http://localhost:8787/api/settings
```

The call logging and Customer Service to Sales handoff workflow is documented in
[`docs/call-workflow.md`](docs/call-workflow.md).

The Sales visit lifecycle and activity aggregates are documented in
[`docs/sales-workflow.md`](docs/sales-workflow.md) and
[`docs/activity-reporting.md`](docs/activity-reporting.md).

The deterministic KPI engine and management dashboard are documented in
[`docs/kpi-engine.md`](docs/kpi-engine.md) and
[`docs/management-dashboard.md`](docs/management-dashboard.md).

The grounded commercial assistant and allowlisted business settings are documented in
[`docs/ai-commercial-assistant.md`](docs/ai-commercial-assistant.md) and
[`docs/settings.md`](docs/settings.md).

Authentication and role-based access rules are documented in
[`docs/authentication.md`](docs/authentication.md) and
[`docs/authorization.md`](docs/authorization.md).

Admin-only account lifecycle and identity mapping are documented in
[`docs/user-management.md`](docs/user-management.md).

The operational campaign lifecycle, audience snapshots, provider boundary, metrics, and follow-up
workflow are documented in [`docs/campaigns-workflow.md`](docs/campaigns-workflow.md).

## Quality Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

## Cloudflare Setup Later

Before deployment, create Cloudflare resources and update `wrangler.toml` as needed:

- Create a D1 database for development/production.
- Replace the placeholder D1 `database_id`.
- Configure Cloudflare Pages or Workers deployment from the GitHub repository.
- Add secrets with `wrangler secret put`, never by committing them.
- Protect the application with Cloudflare Access and configure OIDC issuer, audience, JWKS, and identity mappings.
- Coordinate the future Money S4 integration with the client's IT department.

## Explicit Phase 1 Non-Goals

- No Money S4 connection
- No OpenAI API calls
- No custom password database
- No production deployment
