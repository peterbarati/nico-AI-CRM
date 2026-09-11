# Deterministic KPI engine

## Boundary

`packages/kpi-engine` is a pure TypeScript business module. It calculates achievement percentages, period-aware statuses, prorated targets, and weighted summaries from normalized facts. It has no D1, Worker, React, ERP, AI, or compensation dependency.

`packages/db/src/management` owns aggregate SQL and returns bounded facts. The Worker combines those facts with definitions and targets through the KPI engine. React only renders the resulting contract.

## Definitions and actual sources

| KPI                   | Role             | Actual source                                                                             |
| --------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `CS_TURNOVER`         | Customer Service | Completed normalized orders attributed to the latest qualifying Customer Service activity |
| `CS_CALLS`            | Customer Service | Structured `CALL` rows in `customer_interactions`                                         |
| `CS_REACTIVATIONS`    | Customer Service | Reactivation-qualified attributed orders                                                  |
| `CS_B2B`              | Customer Service | Structured `b2b_activations` rows                                                         |
| `SALES_TURNOVER`      | Sales            | Completed normalized orders attributed to the latest qualifying Sales activity            |
| `SALES_VISITS`        | Sales            | Completed `sales_visits` rows                                                             |
| `SALES_REACTIVATIONS` | Sales            | Reactivation-qualified attributed orders                                                  |
| `SALES_B2B`           | Sales            | Structured `b2b_activations` rows                                                         |

Definitions store role and source keys in `kpi_definitions`. Values, targets, and weights are never calculated from notes or React code.

## Targets and weighting

`kpi_targets` supports user-specific targets and role defaults. A user target takes precedence; otherwise the matching role target is used as that user's template. Role summaries sum the resolved user targets. `company_kpi_targets` stores company-level plans independently.

Targets overlapping a requested day, week, month, or custom range are prorated by inclusive calendar-day overlap. Demo weights total 1.0 for each role:

| Role             | Turnover | Calls/visits | Reactivations | B2B |
| ---------------- | -------: | -----------: | ------------: | --: |
| Customer Service |      60% |          15% |           20% |  5% |
| Sales            |      50% |          25% |           15% | 10% |

Overachievement is displayed but capped at 100% when calculating the overall weighted percentage. This is performance reporting configuration, not a payroll or bonus rule.

## Status and periods

All ranges use `system.business_timezone`. `COMPLETED` means target achievement is at least 100%. Otherwise `ON_TRACK` means achievement is at or above elapsed-period percentage, `AT_RISK` is at least 80% of expected progress, and `BEHIND` is below that threshold.

Supported views are day, current week, current month, previous month, and a validated custom range of up to 366 days.

## Turnover boundary

Phase 1 turnover comes from completed `orders` rows using normalized net amounts and demo/mock ERP data. The KPI engine does not know the order source. In Phase 2, Money S4 will populate the same normalized CRM order facts through `ERPProvider`; KPI calculation code does not change.

## Operational attribution

The configured `kpi.attribution_window_days` defaults to 30. For each order, the most recent structured interaction or completed visit for the same customer inside the window and on/before the order date receives operational attribution. This is a deterministic operating convention, not proof that the activity caused the order.

A reactivation requires a previous completed order, at least `kpi.reactivation_inactivity_days` between the previous and new order (90 demo days), and a qualifying attributed activity before the new order. Segment labels alone never create a reactivation result.

## B2B metric

`b2b_activations` records a customer, attributed user, structured source interaction or visit, activation timestamp, and source. Free-form notes and keyword inference are excluded.

## Phase 1 limitations

- Demo order dates have day precision, so same-day activity ordering is conservative.
- Attribution chooses the latest qualifying activity and does not split credit.
- Role defaults act as user target templates; formal teams are not modeled yet.
- Historical B2B state transitions exist only where `b2b_activations` is populated.
- Trend comparisons are not shown until enough normalized history is available.

AI may later explain deterministic results but must not calculate them. Compensation may later consume versioned KPI results, but payroll and bonus formulas remain outside this module.
