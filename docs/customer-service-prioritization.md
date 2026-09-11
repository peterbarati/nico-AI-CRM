# Customer Service Prioritization

This document describes the deterministic Customer Service queue for:

```text
Koho mám dnes volať?
```

The queue decides which customers should be contacted, why they should be contacted, how urgent the contact is, and which deterministic action category should be used.

## Purpose

Customer Service needs a daily operational work queue that is explainable and repeatable. The system ranks customers using normalized CRM data from D1:

- customers
- customer metrics
- active CRM segments
- open tasks and overdue follow-ups
- customer interactions
- campaign/newsletter engagement
- B2B registration status

The queue does not use OpenAI. It does not connect to Money S4. It does not create calls, tasks, emails, or visits.

## Architecture

The scoring engine lives in:

```text
packages/crm-rules
```

The D1 read model lives in:

```text
packages/db/src/customer-service
```

The Worker composes the read model, configuration, and rules engine in:

```text
GET /api/customer-service/queue
```

Frontend components render the API response in:

```text
apps/web/src/features/customer-service
```

React components must not calculate priority scores or business-critical customer status.

## Default Configuration

Configuration is read from `system_config` using namespaced keys.

| Key                                                     | Default | Meaning                                                  |
| ------------------------------------------------------- | ------: | -------------------------------------------------------- |
| `customer_service.daily_call_target`                    |     `8` | Required Customer Service calls per day                  |
| `customer_service.reorder_grace_days`                   |     `7` | Grace period after average reorder interval              |
| `customer_service.at_risk_days`                         |    `30` | First inactivity threshold                               |
| `customer_service.critical_days`                        |    `60` | Critical inactivity threshold                            |
| `customer_service.reactivation_days`                    |    `90` | Reactivation inactivity threshold                        |
| `customer_service.recent_interaction_suppression_days`  |     `3` | Recent contact window for priority reduction             |
| `customer_service.weight_reorder_slightly_overdue`      |    `15` | Slight reorder overdue score                             |
| `customer_service.weight_reorder_significantly_overdue` |    `25` | Significant reorder overdue score                        |
| `customer_service.weight_reorder_severely_overdue`      |    `35` | Severe reorder overdue score                             |
| `customer_service.weight_decline_20`                    |    `15` | Score for at least 20 percent turnover decline           |
| `customer_service.weight_decline_30`                    |    `25` | Score for at least 30 percent turnover decline           |
| `customer_service.weight_decline_50`                    |    `35` | Score for at least 50 percent turnover decline           |
| `customer_service.weight_inactivity_at_risk`            |    `15` | Score for at-risk inactivity                             |
| `customer_service.weight_inactivity_critical`           |    `30` | Score for critical inactivity                            |
| `customer_service.weight_inactivity_reactivation`       |    `45` | Score for reactivation inactivity                        |
| `customer_service.weight_b2b_missing`                   |    `10` | Score for active customer missing B2B registration       |
| `customer_service.weight_campaign_interest`             |    `20` | Score for clicked campaign/newsletter without conversion |
| `customer_service.weight_open_follow_up_task`           |    `15` | Score for open follow-up task                            |
| `customer_service.weight_overdue_follow_up_task`        |    `25` | Score for overdue follow-up task                         |
| `customer_service.weight_cross_sell`                    |    `10` | Score for cross-sell candidate                           |
| `customer_service.weight_recent_interaction_reduction`  |   `-20` | Score reduction after recent completed interaction       |

## Scoring Rules

### Reorder Overdue

If:

```text
days_since_last_order > average_reorder_days + customer_service.reorder_grace_days
```

then the engine adds a reorder overdue reason and recommends `REORDER`.

### Declining Sales

The engine compares:

```text
turnover_90d vs previous_turnover_90d
```

Declines of at least 20, 30, and 50 percent receive increasing scores. The action is `RETENTION`.

### Inactivity

The engine checks `days_since_last_order` against configured thresholds:

- at risk
- critical
- reactivation

Critical and reactivation customers are pushed higher. Reactivation threshold customers receive `REACTIVATION`.

### B2B Missing

An active customer with missing B2B registration receives a low score and `B2B_REGISTRATION`.

### Newsletter / Campaign Interest

A clicked campaign/newsletter without conversion receives `CAMPAIGN_FOLLOW_UP`.

### Open Follow-Up Task

Open tasks receive `TASK_FOLLOW_UP`. Overdue tasks receive a larger score than ordinary open tasks.

### Cross-Sell

Customers in the `CROSS_SELL` segment receive `CROSS_SELL`.

### Recent Interaction Reduction

If a customer had a very recent interaction, priority is reduced to avoid repeated unnecessary contact. This reduction is not applied when an overdue task, campaign action, or critical inactivity signal requires contact.

## Priority Levels

| Level      |   Score |
| ---------- | ------: |
| `CRITICAL` |   `70+` |
| `HIGH`     | `45-69` |
| `MEDIUM`   | `20-44` |
| `LOW`      |  `0-19` |

## Reason Codes

- `REORDER_OVERDUE`
- `SALES_DECLINE`
- `INACTIVITY`
- `B2B_MISSING`
- `CAMPAIGN_INTEREST`
- `OPEN_FOLLOW_UP_TASK`
- `CROSS_SELL`
- `RECENT_INTERACTION`

Each reason includes:

- code
- severity
- value
- score impact
- deterministic message

## Action Codes

- `REORDER`
- `RETENTION`
- `REACTIVATION`
- `B2B_REGISTRATION`
- `CROSS_SELL`
- `CAMPAIGN_FOLLOW_UP`
- `TASK_FOLLOW_UP`

The primary recommended action is selected by deterministic action precedence, not by generated text.

## Future AI Boundary

Deterministic rules decide what is happening.

AI may later help explain how to approach the customer, summarize context, draft talking points, or prepare a call plan. AI must not become responsible for calculating whether a customer is overdue, declining, inactive, critical, or worth contacting.
