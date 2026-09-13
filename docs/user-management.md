# User Management

The Users module manages CRM operational identities. It does not manage passwords, tokens, or provider secrets. All routes require the `USER_ADMIN` permission and use the existing mock/OIDC authentication boundary.

## Lifecycle

Users are activated and deactivated with the `active` flag. There is intentionally no hard-delete endpoint or UI action. Deactivation immediately blocks subsequent authenticated requests while preserving interactions, tasks, Sales visits, KPI records, handoffs, reporting attribution, and AI audit metadata.

The last active Admin cannot be demoted or deactivated. This rule is enforced by the database service and a D1 trigger, including when an Admin changes their own account. The frontend asks for confirmation before deactivation, Admin downgrade, or an identity mapping change, but confirmations are not security controls.

## Identity Mapping

`auth_provider` and `auth_subject` are optional, but they must either both be set or both be empty. Their pair is unique. The values identify an external account; access tokens, refresh tokens, passwords, JWTs, and client secrets must never be stored in these fields.

In `AUTH_MODE=mock`, a new user without an explicit mapping receives `auth_provider=mock` and an auth subject matching its generated CRM user ID. Active Admin-created users therefore appear in the existing mock login list. In production OIDC mode, an Admin maps the provider name and stable OIDC subject supplied by the approved identity provider. This module does not configure OIDC or weaken its token validation.

## API

- `GET /api/admin/users` supports `page`, `pageSize`, `search`, `role`, `active`, `sort`, and `direction`.
- `POST /api/admin/users` creates a user.
- `PATCH /api/admin/users/:id` edits only name, email, role, active status, auth provider, and auth subject.
- `POST /api/admin/users/:id/activate` activates a user.
- `POST /api/admin/users/:id/deactivate` deactivates a user.

Responses use the shared `{ ok: true, data }` or `{ ok: false, error }` envelope. Validation and conflict codes include `EMAIL_ALREADY_EXISTS`, `IDENTITY_ALREADY_MAPPED`, `LAST_ADMIN_PROTECTED`, `INVALID_ROLE`, and `USER_NOT_FOUND`.

## Audit

Migration `0007_user_management.sql` adds `user_management_audit`. Create, edit, activate, and deactivate operations record the actor, target user, action, and timestamp. The table is deliberately narrow; it does not store credentials or request payloads.
