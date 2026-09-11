# NICO AI CRM Architecture

This document is the permanent architectural and functional source of truth for `nico-ai-crm`.

Do not simplify, replace, or redesign this concept unless explicitly instructed. Future implementation work must preserve these principles while staying pragmatic for a small development team.

## Project Purpose

NICO AI CRM is an internal CRM, Customer Service, Sales, and AI-assisted commercial management platform.

The system sits above the ERP. Money S4 remains the ERP and future source of transactional truth. The CRM provides the operational and analytical layer for:

- customer service
- sales representatives
- managers
- customer history
- calls and visits
- tasks and follow-ups
- customer prioritization
- automatic customer segmentation
- reorder detection
- retention and reactivation
- cross-sell
- B2B penetration
- campaigns and newsletter follow-up
- KPI evaluation
- management dashboards
- AI-generated recommendations and call reasons

## Phase Rules

### Phase 1

Phase 1 is application development only.

- Do not connect to Money S4.
- Do not investigate Money S4 APIs, SQL tables, database structures, or internal behavior.
- Do not hard-code Money S4 logic anywhere in CRM business logic.
- Use mock/demo providers and normalized CRM data.
- The whole CRM must be usable and testable without Money S4.

### Phase 2

Money S4 integration and real-world testing will be performed later with the client's IT department.

Future integration must plug into the existing provider/interface layer without rewriting CRM business logic.

## Core Architectural Principle

The application must be:

- modular
- scalable
- maintainable
- testable
- provider-independent
- integration-independent
- AI-model-independent where practical

Avoid tightly coupled code and disposable prototypes that would require a rewrite. Also avoid unnecessary enterprise complexity.

Build a clean architecture suitable for gradual production expansion.

## Target Platform

Primary platform:

- Cloudflare Workers
- Cloudflare D1
- Cloudflare-compatible frontend
- TypeScript
- GitHub as source of truth

Additional Cloudflare services such as KV, R2, Queues, Durable Objects, or Workflows may be introduced later only when there is a justified functional or scalability requirement.

## Repository Boundaries

Current monorepo layout:

```text
apps/
  web/       Frontend application
  worker/    Cloudflare Worker API
packages/
  db/        D1 schema and database access boundary
  shared/    Shared domain types, DTOs, and constants
  erp-contract/
            ERP provider contract and mock provider
migrations/  D1 migrations
docs/        Architecture and project decisions
tests/       Cross-package and future end-to-end tests
```

Expected dependency direction:

- `packages/shared` must not depend on application packages.
- Provider contracts may depend on `packages/shared`.
- `packages/db` owns persistence boundaries and D1-specific helpers.
- `apps/worker` composes API routes, database access, providers, and services.
- `apps/web` calls API endpoints and must not import backend-only database or provider implementation code.

Avoid circular dependencies between packages.

## Required Domain Boundaries

Keep these concerns logically separated:

1. Customers
2. Customer locations / POS
3. Orders and transactional history
4. Customer interactions / calls
5. Sales representative visits
6. Tasks and follow-ups
7. Customer segmentation
8. Customer metrics and analytics
9. Campaigns
10. Newsletter interactions
11. B2B status
12. KPI engine
13. AI recommendations
14. ERP synchronization
15. Authentication and authorization
16. Management reporting

Modules may interact through defined services and contracts, but they must not contain hidden dependencies on each other.

## ERP Integration

CRM business logic must never know how Money S4 works internally.

Use a provider abstraction similar to:

- `ERPProvider`
- `MockERPProvider`
- `MoneyS4Provider`

For Phase 1, only the mock provider is functional.

`MoneyS4Provider` remains an unimplemented integration boundary until Phase 2. It must not contain guessed Money S4 API paths, SQL table names, credentials, or behavior.

Imported ERP data must be transformed into normalized CRM objects before CRM analytics, segmentation, AI context building, or UI presentation.

If the future ERP source changes, the CRM should continue working with minimal changes behind the provider layer.

## AI Architecture

AI is an analytical and assistance layer. It must not query Money S4 directly.

Approved flow:

```text
ERP
-> synchronization
-> normalized CRM database
-> analytics/business rules
-> AI context
-> AI recommendation
```

AI should receive structured data. Typical AI output should also be structured:

- priority
- reason
- call_reason
- objective
- recommended_action
- cross_sell_opportunity
- risk_summary
- customer_summary

Business-critical calculations must not depend exclusively on generative AI. Metrics, dates, turnover calculations, thresholds, and KPI calculations must use deterministic application logic. AI should interpret, summarize, and recommend based on calculated facts.

## Approved Customer Segments

The architecture must support at minimum:

- `ACTIVE`
- `REORDER_DUE`
- `DECLINING`
- `AT_RISK`
- `CRITICAL`
- `REACTIVATION`
- `B2B_MISSING`
- `CROSS_SELL`
- `NEWSLETTER_FOLLOW_UP`

A customer may belong to multiple segments.

Segment rules must be configurable and extensible. Do not scatter hard-coded segment conditions throughout the application.

## Customer Service Workflow

The system must eventually generate a daily prioritized work list answering:

```text
Who should I call today?
```

Priority should be derived from data such as:

- expected reorder interval
- days since last order
- sales decline
- inactivity
- campaign activity
- newsletter open/click
- missing B2B
- cross-sell opportunity
- previous interaction
- assigned tasks
- customer value

Customer Service must eventually be able to record:

- call reason
- result
- notes
- next action
- follow-up
- task for another user
- handoff to Sales Representative

## Sales Representative Workflow

Sales Representatives must use the same customer database.

They must eventually see:

- customer history
- recent orders
- turnover development
- customer risk
- previous Customer Service interactions
- tasks
- campaign information
- branding status
- visit history
- recommended actions

Customer Service and Sales must operate as one connected commercial workflow.

## KPI Engine

KPI logic must be its own configurable module.

It must eventually support Customer Service and Sales KPIs including:

- turnover
- calls
- visits
- reactivations
- new or activated customers where required
- B2B registrations
- other measurable activities

Do not hard-code compensation calculations directly inside dashboard components.

KPI definitions, weights, and thresholds must be separable from presentation.

## Campaigns And Newsletter

The data model must prepare for:

```text
campaign
-> customer segment
-> send
-> open
-> click
-> no purchase
-> follow-up task/call
-> order/conversion
```

Actual newsletter provider integration is not part of the initial implementation.

The newsletter provider must later be replaceable.

## Management Dashboard

The architecture must eventually support management metrics such as:

- company sales plan vs actual
- active customers
- risky customers
- customers inactive 90+ days
- reactivated customers
- calls completed
- visits completed
- B2B penetration
- sales generated after Customer Service activity
- reactivation revenue
- campaign -> call -> order attribution
- team and individual KPI performance

Do not implement all dashboard functions immediately, but ensure the data architecture does not block them.

## Scalability Rules

Design so that:

- thousands or tens of thousands of customers are possible
- order history can grow substantially
- calculations do not require loading the entire database into memory
- lists use pagination
- filtering and sorting happen server-side where appropriate
- useful database indexes are created
- expensive derived metrics can later be cached or precomputed
- long-running operations can later move to Cloudflare Queues or Workflows
- synchronization can be incremental
- imports are idempotent
- duplicate ERP data is prevented

## Flexibility Rules

Avoid assumptions specific only to today's setup when they can reasonably become configurable.

Prefer:

```text
configuration
-> rules/services
-> UI
```

Instead of:

```text
hard-coded values
-> UI logic
```

Examples that should eventually be configurable:

- reorder thresholds
- inactivity thresholds
- segment rules
- KPI targets
- KPI weights
- user roles and permissions
- campaign types
- task types
- interaction types
- priorities

## Source Of Truth And Secrets

GitHub is the source of truth for application code.

Never commit:

- passwords
- API keys
- database credentials
- Cloudflare tokens
- OpenAI keys
- future Money credentials

Use environment variables and Cloudflare secrets.

## Development Approach

Work incrementally.

For every new feature:

1. Inspect existing architecture.
2. Preserve these architectural principles.
3. Implement the smallest complete vertical slice.
4. Add or update tests.
5. Run type checking.
6. Run build.
7. Fix errors.
8. Document important architectural decisions.

Do not rewrite working architecture without a clear reason.

Do not silently introduce a new framework, database abstraction, or infrastructure service.

If a requested implementation would conflict with these principles, explain the conflict before changing the architecture.

## Current Bootstrap Notes

The current bootstrap is aligned with Phase 1:

- The provider package is named `packages/erp-contract`.
- CRM business logic must depend on `ERPProvider`, normalized import contracts, and normalized CRM data.
- `MockERPProvider` is the only functional Phase 1 provider.
- `MoneyS4Provider` is a Phase 2 placeholder with no connection logic, URLs, SQL, credentials, or assumed Money S4 schema.

Money S4 integration and production deployment remain deferred. OpenAI and authentication are isolated behind provider boundaries and must not leak vendor-specific logic into CRM domains.
