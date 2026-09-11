# Management dashboard

## Purpose

`/` and `/dashboard` provide a compact management view backed by aggregate D1 queries. The frontend does not load raw customer, interaction, order, task, or visit tables.

## Metrics

The dashboard shows company net turnover and plan achievement, active customers, at-risk customers, critical customers, 90+ day inactive candidates, attributed reactivations, Customer Service calls, completed Sales visits, B2B penetration, overdue tasks, and both handoff directions.

Customer inactivity is evaluated as of the selected period end. B2B penetration is registered active customers divided by all active customers. Open overdue tasks are an operational current-state metric; the other activity metrics use the selected business-time range.

## Filters

- Current month (default)
- Previous month
- Current week
- Today
- Custom date range
- Customer Service or Sales role
- User

Role and user filtering applies to KPI performance rows. Company summary cards remain company-wide so management plan context does not change when comparing an individual.

## API

- `GET /api/dashboard` returns the company summary, role summaries, user KPI rows, period metadata, and attribution metadata.
- `GET /api/kpi` returns role and user KPI results without dashboard cards.
- `GET /api/kpi/users/:id` returns one user's KPI breakdown.

All endpoints accept `period=day|week|month|previous_month|custom`. Custom requests require `from` and `to` in `YYYY-MM-DD`. `role` accepts `customer_service` or `sales_rep`; `userId` is optional. Invalid input returns the shared structured API error format.

## Future boundaries

Money S4 integration remains behind `ERPProvider` and will only synchronize normalized order facts. Future AI can summarize or explain dashboard data but cannot replace deterministic SQL or KPI calculations. Future business settings can edit definitions, targets, weights, and attribution thresholds. Authentication will later constrain visibility. Bonus and payroll calculations are explicitly out of scope.
