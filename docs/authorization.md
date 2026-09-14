# Authorization

Authorization is enforced by the Worker. Frontend route guards and navigation filtering are UX
only and never replace API permission checks.

## Permission matrix

| Capability                | Admin | Manager | Customer Service | Sales Rep               |
| ------------------------- | ----- | ------- | ---------------- | ----------------------- |
| Customers read            | Yes   | Yes     | Yes              | Assigned only           |
| Customer Service queue    | Yes   | Yes     | Yes              | No                      |
| Log calls / interactions  | Yes   | No      | Yes              | No                      |
| Sales queue               | Yes   | Yes     | No               | Assigned only           |
| Sales visit writes        | Yes   | No      | No               | Assigned only           |
| Tasks read/write          | Yes   | Yes     | Own tasks        | Own assigned tasks      |
| Dashboard / reports / KPI | Yes   | Yes     | No               | No                      |
| Settings read             | Yes   | Yes     | No               | No                      |
| Settings write            | Yes   | No      | No               | No                      |
| AI assistant              | Yes   | Yes     | Yes              | Assigned customers only |
| User administration       | Yes   | No      | No               | No                      |

Capabilities are defined once in `packages/auth/src/authorization.ts`. Route handlers request a
capability rather than comparing roles directly.

## Data scopes

Admin and Manager have organization-wide read visibility. Customer Service keeps broad customer
visibility to preserve the approved shared queue and handoff workflow. Sales Representatives see
only customers, Sales tasks, and visits assigned to them. Direct detail and AI requests for an
unassigned customer return `403 FORBIDDEN`; list queries are constrained server-side.

The customer directory intentionally remains broadly visible to Customer Service. In the general
Tasks module, Customer Service and Sales Representatives are constrained to their own assigned
tasks; Admin and Manager retain organization-wide visibility and operations.

## Protected APIs

The Worker protects customer, task, queue, Sales, reporting, dashboard, KPI, settings, user, and AI
routes. Mutation actor IDs come from `AuthenticatedActor`, not request payloads or frontend state.
Interaction creators, task creators, visit operations, and AI audit metadata therefore use the
authenticated CRM user ID.

Authentication failures use `401 UNAUTHENTICATED`. Authenticated users without a required
capability use `403 FORBIDDEN`. Inactive and unmapped identities use explicit 403 error codes under
the shared API error shape.

## Frontend enforcement

`AuthProvider` loads `/api/auth/me` and stores the actor, role, and backend-resolved permissions.
Routes render a forbidden state when permission is absent, and the sidebar shows only available
modules. Managers receive read-only Settings UI; only administrators receive settings controls.
The Users page is an administrator-only, read-only view of role, status, and identity mapping.

## Future extensions

New roles can be added by extending the centralized role-to-capability map. More granular customer,
territory, team, and task scopes should remain database query constraints rather than frontend
filters. Any future role or active-state mutation must require `USER_ADMIN` and audit the actor.
