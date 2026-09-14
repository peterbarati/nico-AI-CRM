# Tasks workflow

The Tasks module is the operational work queue for Phase 1.1. It reuses the existing `tasks` table used by calls, handoffs, and Sales visits; there is no parallel task model.

## Lifecycle

Statuses remain stored using the existing codes:

- `open` may move to `in_progress`, `completed`, or `cancelled`.
- `in_progress` may move to `completed` or `cancelled`.
- `completed` and `cancelled` are terminal.
- Repeating the same completion or cancellation is idempotent and does not create another event.
- Completion sets `completed_at`. Cancellation keeps `completed_at` empty. Tasks are never deleted.

The Worker validates every transition. UI visibility is only a convenience and is not the authorization boundary.

## Operational types

New writes use the controlled `operational_type` values:

- `FOLLOW_UP_CALL`
- `SALES_VISIT`
- `CUSTOMER_SERVICE`
- `B2B_REGISTRATION`
- `REACTIVATION`
- `REORDER`
- `CAMPAIGN_FOLLOW_UP`
- `ADMIN`
- `OTHER`

The original `task_type` column remains for backward compatibility with Phase 1 workflows. New writes map the controlled type to a compatible legacy value.

## Sources

`source_origin` records one of `MANUAL`, `CALL`, `SALES_VISIT`, `CS_TO_SALES_HANDOFF`, `SALES_TO_CS_HANDOFF`, `CAMPAIGN`, or `OTHER`. It complements rather than replaces the normalized `source_interaction_id` and `source_visit_id` relationships.

Task detail loads call reason, result, notes, and next action directly from `customer_interactions`. Visit result, notes, order value, and next action come directly from `sales_visits`. Descriptions are never parsed to reconstruct source context.

## Due rules

The Worker reads `system.business_timezone` and derives the UTC boundaries of the current business day. A task is overdue when it is actionable (`open` or `in_progress`), has `due_at`, and that timestamp is before the current instant. “Today” uses the configured business-day boundaries. The shared task contract centralizes the basic overdue predicate.

The default operational order is overdue, due today, priority, future due, no due date, then terminal tasks. Explicit sorting remains server-side.

## Assignment and RBAC

- Admin and Manager can view all tasks, switch to their own tasks, create tasks, and assign active users broadly.
- Customer Service sees assigned tasks and may assign only active Customer Service users.
- Sales Representatives see and mutate only their own tasks. Tasks tied to customers must also remain within their existing customer scope; arbitrary reassignment is forbidden.
- Inactive users remain visible through historical joins but cannot receive new or reassigned tasks.
- The authenticated actor supplies `created_by_user_id`; client-provided creator values are ignored because they are not part of the write contract.

## Manual tasks and history

Manual tasks may omit a customer and due date. A selected location must belong to the selected customer. The database validates the customer, location, and active assignee before writing.

`task_events` is a deliberately small audit trail for creation, start, completion, cancellation, rescheduling, reassignment, and other edits. It preserves previous and new status, due date, and assignee identifiers without introducing a general audit framework.

## Workflow relationships

- Customer Service calls continue to create call follow-ups and Customer Service-to-Sales handoffs.
- Completing a Sales visit continues to create Sales follow-ups or Sales-to-Customer-Service handoffs.
- Source tasks completed by the Sales visit workflow retain their existing reporting semantics.
- Completed, open, and overdue task counts continue to come from the existing `tasks` status and timestamp fields used by activity reporting and KPI support.
- Campaigns may create `CAMPAIGN_FOLLOW_UP` tasks later. Campaign sending is outside this module.

## API

- `GET /api/tasks` lists and filters tasks with server-side pagination.
- `GET /api/tasks/:id` returns detail, structured source context, and task events.
- `POST /api/tasks` creates a manual task.
- `PATCH /api/tasks/:id` edits actionable fields, reschedules, or reassigns.
- `POST /api/tasks/:id/start`
- `POST /api/tasks/:id/complete`
- `POST /api/tasks/:id/cancel`

All responses use the shared `{ ok, data }` or `{ ok, error }` envelope.
