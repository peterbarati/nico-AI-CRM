# Sales Visit Workflow

The Sales queue contains all actionable tasks assigned to active Sales Representatives, not only Customer Service handoffs. Filtering and pagination happen in D1.

## Lifecycle

1. An open Sales task can schedule one visit with a future UTC timestamp and optional customer location.
2. Scheduling marks the source task `in_progress`.
3. A planned visit can be started, or a planned/in-progress visit can be completed.
4. Completion records a controlled result and next action and completes the source task in the same D1 batch.
5. A non-`NONE` next action creates one linked follow-up task. Sales actions remain assigned to Sales; Customer Service actions are assigned to the configured demo Customer Service actor.

Create and completion requests carry idempotency keys. Repeating the same request returns the existing workflow result. State transitions and actor assignment are validated in the Worker/database boundary.

Sales mutations use the centralized authenticated actor. Sales Representatives may operate only on assigned tasks and visits; administrators retain operational access. Customer Service follow-up handoffs resolve an active CRM Customer Service user server-side.
