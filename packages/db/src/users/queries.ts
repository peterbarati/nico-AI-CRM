import type { DatabaseContext } from "../types";
import type { ActiveUser, UserRole, UserRow } from "./types";

export async function getActiveUser(
  context: DatabaseContext,
  userId: string
): Promise<ActiveUser | null> {
  const row = await context.db
    .prepare("SELECT id, name, email, role, active FROM users WHERE id = ? AND active = 1")
    .bind(userId)
    .first<UserRow>();

  return row ? mapUser(row) : null;
}

export async function listActiveUsersByRole(
  context: DatabaseContext,
  role: UserRole
): Promise<ActiveUser[]> {
  const result = await context.db
    .prepare(
      "SELECT id, name, email, role, active FROM users WHERE role = ? AND active = 1 ORDER BY name ASC"
    )
    .bind(role)
    .all<UserRow>();

  return result.results.map(mapUser);
}

export async function listActiveUsers(context: DatabaseContext): Promise<ActiveUser[]> {
  const result = await context.db
    .prepare("SELECT id, name, email, role, active FROM users WHERE active = 1 ORDER BY name ASC")
    .all<UserRow>();
  return result.results.map(mapUser);
}

function mapUser(row: UserRow): ActiveUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role
  };
}
