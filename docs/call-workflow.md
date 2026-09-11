# Call Logging and Sales Handoff

## Scope

This workflow lets a Customer Service user log a structured call, create an optional follow-up task, and hand a visit request to a Sales Representative. It uses CRM data only. It does not connect to Money S4, OpenAI, telephony, or email delivery.

The Worker attributes calls and created tasks to the centralized authenticated actor. Customer Service and administrator actors with `CUSTOMER_INTERACTIONS_WRITE` may use the workflow; arbitrary creator IDs are not accepted from the frontend.

## API Response Contract

Both newly created (`201`) and idempotent (`200`) writes return:

```json
{ "ok": true, "data": { "interaction": {}, "task": null, "duplicate": false } }
```

`task` contains the linked follow-up or Sales handoff when one was requested. Errors use `{ "ok": false, "error": { "code": "...", "message": "...", "fields": [] } }`; `fields` is included for request validation failures. Invalid JSON and invalid field values return `400`, missing customers return `404`, and idempotency conflicts return `409`.

## Flow

1. A user opens **Log call** from `/customer-service` or `/customers/:id`.
2. The shared form submits a controlled reason, result, next action, optional notes, follow-up time, task priority, and optional Sales Representative.
3. The Worker validates the payload and referenced users.
4. The database package writes the call and optional task using one D1 batch.
5. The frontend reloads backend data. Queue scoring, today's completed call count, customer history, and tasks are recalculated from D1.

## Controlled Values

Call reasons:

- `REORDER`
- `RETENTION`
- `REACTIVATION`
- `B2B_REGISTRATION`
- `CROSS_SELL`
- `CAMPAIGN_FOLLOW_UP`
- `TASK_FOLLOW_UP`
- `GENERAL`

Call results:

- `ORDER_PROMISED`
- `ORDER_CREATED_EXTERNALLY`
- `INTERESTED`
- `NOT_INTERESTED`
- `CALLBACK_REQUESTED`
- `NO_ANSWER`
- `WRONG_CONTACT`
- `NEEDS_SALES_VISIT`
- `RESOLVED`
- `OTHER`

Next actions:

- `NONE`
- `FOLLOW_UP_CALL`
- `SALES_VISIT`
- `SEND_INFORMATION`
- `B2B_REGISTRATION`
- `OTHER`

API task priorities are `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`. They map to the existing schema values `low`, `normal`, `high`, and `urgent`. Existing task statuses remain `open`, `in_progress`, `completed`, and `cancelled`.

## Task Rules

`NONE` creates only the interaction. Every other next action requires a future follow-up date and creates a linked task:

| Next action        | Stored task type | Assignee                      |
| ------------------ | ---------------- | ----------------------------- |
| `FOLLOW_UP_CALL`   | `call`           | Current Customer Service user |
| `SALES_VISIT`      | `handoff`        | Selected Sales Representative |
| `SEND_INFORMATION` | `email`          | Current Customer Service user |
| `B2B_REGISTRATION` | `follow_up`      | Current Customer Service user |
| `OTHER`            | `other`          | Current Customer Service user |

A `NEEDS_SALES_VISIT` result requires `SALES_VISIT`, a future due date, and an active user with the `sales_rep` role. The task retains the customer, creator, assignee, source interaction, reason/result, notes, expected action, priority, due date, and timestamps. `/sales` presents these open handoffs as a small read-only work queue.

## Data Relationships

`customer_interactions.customer_id` links the call to the customer. `customer_interactions.user_id` records the acting Customer Service user. A generated task links through `tasks.customer_id`, records `created_by_user_id` and `assigned_user_id`, and points back through `tasks.source_interaction_id`.

Migration `0002_interaction_idempotency.sql` adds an optional, uniquely indexed `customer_interactions.idempotency_key` and an index for task source lookups. The key lets a repeated browser submission return the original interaction/task without creating duplicates. No changes were made to immutable baseline migration `0001_initial.sql`.

D1 `batch()` is used for interaction plus task creation. D1 executes the batch as one transaction, so a task failure does not silently leave a standalone interaction. After the batch, the records are read back through normal repository mappings.

## API

- `POST /api/customers/:id/interactions` creates a call and optional task. New writes return `201`; an idempotent replay returns `200` with `duplicate: true`.
- `GET /api/users?role=sales_rep` lists active Sales Representatives for assignment.
- `GET /api/sales/tasks` lists open linked handoff/visit tasks assigned to Sales Representatives.
- Existing customer interaction/task/detail and Customer Service queue endpoints remain the read source of truth after writes.

Validation errors return `422` with structured field details. Missing customers return `404`. Unexpected write failures return the standard `500` response and are not silently retried.

## Future Boundaries

Telephony can later trigger or enrich the same call command without changing the persistence contract. AI can later summarize notes or suggest wording, but it must not replace deterministic validation, task routing, or handoff rules. Authentication will replace the configured demo actor with the verified current user.
