import type { DatabaseContext } from "../types";
import type { UserRole } from "../users/types";
import type { AuthUserRecord } from "./types";

interface AuthUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: number;
  auth_provider: string | null;
  auth_subject: string | null;
}

const selectAuthUser =
  "SELECT id, name, email, role, active, auth_provider, auth_subject FROM users";

export async function getAuthUserById(
  context: DatabaseContext,
  userId: string
): Promise<AuthUserRecord | null> {
  const row = await context.db
    .prepare(
      "SELECT id, name, email, role, active, NULL AS auth_provider, NULL AS auth_subject FROM users WHERE id = ?"
    )
    .bind(userId)
    .first<AuthUserRow>();
  return row ? mapAuthUser(row) : null;
}

export async function getAuthUserByIdentity(
  context: DatabaseContext,
  provider: string,
  subject: string
): Promise<AuthUserRecord | null> {
  const row = await context.db
    .prepare(`${selectAuthUser} WHERE auth_provider = ? AND auth_subject = ?`)
    .bind(provider, subject)
    .first<AuthUserRow>();
  return row ? mapAuthUser(row) : null;
}

export async function listAuthUsers(context: DatabaseContext): Promise<AuthUserRecord[]> {
  const result = await context.db.prepare(`${selectAuthUser} ORDER BY name`).all<AuthUserRow>();
  return result.results.map(mapAuthUser);
}

export async function isCustomerAssignedToUser(
  context: DatabaseContext,
  customerId: string,
  userId: string
): Promise<boolean> {
  const row = await context.db
    .prepare("SELECT id FROM customers WHERE id = ? AND assigned_sales_rep_id = ?")
    .bind(customerId, userId)
    .first<{ id: string }>();
  return Boolean(row);
}

function mapAuthUser(row: AuthUserRow): AuthUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
    authProvider: row.auth_provider,
    authSubject: row.auth_subject
  };
}
