# NICO AI CRM

Internal CRM and AI-assisted customer service platform.

Phase 1 is intentionally self-contained and uses mock/demo data. It does not connect to Money S4, OpenAI, or any authentication provider.

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

Health endpoint:

```bash
curl http://localhost:8787/api/health
```

Demo API endpoints:

```bash
curl "http://localhost:8787/api/customers?page=1&pageSize=10"
curl "http://localhost:8787/api/customers?search=Blue%20Pine"
curl http://localhost:8787/api/customers/cus-002
curl http://localhost:8787/api/customers/cus-002/orders
curl http://localhost:8787/api/segments
curl http://localhost:8787/api/tasks
curl http://localhost:8787/api/customer-service/queue
curl http://localhost:8787/api/users?role=sales_rep
curl http://localhost:8787/api/sales/tasks
curl http://localhost:8787/api/reports/activity?period=week
```

The call logging and Customer Service to Sales handoff workflow is documented in
[`docs/call-workflow.md`](docs/call-workflow.md).

The Sales visit lifecycle and activity aggregates are documented in
[`docs/sales-workflow.md`](docs/sales-workflow.md) and
[`docs/activity-reporting.md`](docs/activity-reporting.md).

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
- Coordinate the future Money S4 integration with the client's IT department.

## Explicit Phase 1 Non-Goals

- No Money S4 connection
- No OpenAI API calls
- No authentication
- No production deployment
