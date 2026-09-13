import type { CountRow, DatabaseContext, PaginatedResult } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type {
  CreateUserCommand,
  SetUserActiveCommand,
  UpdateUserCommand,
  UserAdminListQuery,
  UserAdminRecord,
  UserAdminSortField,
  UserAdminValues,
  UserManagementAction
} from "./types";
import { UserManagementError } from "./types";

interface UserAdminRow {
  id: string;
  name: string;
  email: string;
  role: UserAdminRecord["role"];
  active: number;
  auth_provider: string | null;
  auth_subject: string | null;
  created_at: string;
  updated_at: string;
}

const selectUser = `
  SELECT id, name, email, role, active, auth_provider, auth_subject, created_at, updated_at
  FROM users
`;

const sortColumns: Record<UserAdminSortField, string> = {
  name: "name",
  email: "email",
  role: "role",
  active: "active",
  created_at: "created_at",
  updated_at: "updated_at"
};

export async function listAdminUsers(
  context: DatabaseContext,
  query: UserAdminListQuery = {}
): Promise<PaginatedResult<UserAdminRecord>> {
  const { page, pageSize, offset } = normalizePagination(query);
  const where: string[] = [];
  const params: unknown[] = [];
  if (query.search?.trim()) {
    const search = `%${query.search.trim()}%`;
    where.push("(name LIKE ? OR email LIKE ? OR auth_subject LIKE ?)");
    params.push(search, search, search);
  }
  if (query.role) {
    where.push("role = ?");
    params.push(query.role);
  }
  if (query.active !== undefined) {
    where.push("active = ?");
    params.push(query.active ? 1 : 0);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sort = sortColumns[query.sort ?? "name"];
  const direction = query.direction === "desc" ? "DESC" : "ASC";
  const [count, rows] = await Promise.all([
    context.db
      .prepare(`SELECT COUNT(*) AS total FROM users ${whereSql}`)
      .bind(...params)
      .first<CountRow>(),
    context.db
      .prepare(`${selectUser} ${whereSql} ORDER BY ${sort} ${direction}, id ASC LIMIT ? OFFSET ?`)
      .bind(...params, pageSize, offset)
      .all<UserAdminRow>()
  ]);
  return {
    items: rows.results.map(mapUser),
    pagination: toPagination(page, pageSize, count?.total ?? 0)
  };
}

export async function getAdminUser(
  context: DatabaseContext,
  userId: string
): Promise<UserAdminRecord | null> {
  const row = await context.db
    .prepare(`${selectUser} WHERE id = ?`)
    .bind(userId)
    .first<UserAdminRow>();
  return row ? mapUser(row) : null;
}

export async function createAdminUser(
  context: DatabaseContext,
  command: CreateUserCommand
): Promise<UserAdminRecord> {
  await assertUniqueFields(context, command.values);
  await context.db.batch([
    context.db
      .prepare(
        `INSERT INTO users (
          id, external_id, name, email, role, active, created_at, updated_at,
          auth_provider, auth_subject
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        command.id,
        command.values.name,
        command.values.email,
        command.values.role,
        command.values.active ? 1 : 0,
        command.createdAt,
        command.createdAt,
        command.values.authProvider,
        command.values.authSubject
      ),
    auditStatement(
      context,
      command.auditId,
      command.actorUserId,
      command.id,
      "created",
      command.createdAt
    )
  ]);
  return requireUser(context, command.id);
}

export async function updateAdminUser(
  context: DatabaseContext,
  command: UpdateUserCommand
): Promise<UserAdminRecord> {
  const current = await requireUser(context, command.userId);
  await assertUniqueFields(context, command.values, command.userId);
  await protectLastAdmin(context, current, command.values.role, command.values.active);
  await context.db.batch([
    context.db
      .prepare(
        `UPDATE users SET
          name = ?, email = ?, role = ?, active = ?, auth_provider = ?, auth_subject = ?, updated_at = ?
        WHERE id = ?`
      )
      .bind(
        command.values.name,
        command.values.email,
        command.values.role,
        command.values.active ? 1 : 0,
        command.values.authProvider,
        command.values.authSubject,
        command.updatedAt,
        command.userId
      ),
    auditStatement(
      context,
      command.auditId,
      command.actorUserId,
      command.userId,
      "updated",
      command.updatedAt
    )
  ]);
  return requireUser(context, command.userId);
}

export async function setAdminUserActive(
  context: DatabaseContext,
  command: SetUserActiveCommand
): Promise<UserAdminRecord> {
  const current = await requireUser(context, command.userId);
  if (!command.active) await protectLastAdmin(context, current, current.role, false);
  const action: UserManagementAction = command.active ? "activated" : "deactivated";
  await context.db.batch([
    context.db
      .prepare("UPDATE users SET active = ?, updated_at = ? WHERE id = ?")
      .bind(command.active ? 1 : 0, command.updatedAt, command.userId),
    auditStatement(
      context,
      command.auditId,
      command.actorUserId,
      command.userId,
      action,
      command.updatedAt
    )
  ]);
  return requireUser(context, command.userId);
}

async function assertUniqueFields(
  context: DatabaseContext,
  values: UserAdminValues,
  excludeUserId?: string
) {
  const email = await context.db
    .prepare("SELECT id FROM users WHERE lower(email) = lower(?) AND id <> ?")
    .bind(values.email, excludeUserId ?? "")
    .first<{ id: string }>();
  if (email) throw new UserManagementError("EMAIL_ALREADY_EXISTS", "Email is already in use.");
  if (values.authProvider && values.authSubject) {
    const identity = await context.db
      .prepare("SELECT id FROM users WHERE auth_provider = ? AND auth_subject = ? AND id <> ?")
      .bind(values.authProvider, values.authSubject, excludeUserId ?? "")
      .first<{ id: string }>();
    if (identity) {
      throw new UserManagementError(
        "IDENTITY_ALREADY_MAPPED",
        "This external identity is already mapped to another user."
      );
    }
  }
}

async function protectLastAdmin(
  context: DatabaseContext,
  current: UserAdminRecord,
  nextRole: UserAdminRecord["role"],
  nextActive: boolean
) {
  if (current.role !== "admin" || !current.active || (nextRole === "admin" && nextActive)) return;
  const row = await context.db
    .prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = 1 AND id <> ?")
    .bind(current.id)
    .first<CountRow>();
  if ((row?.total ?? 0) === 0) {
    throw new UserManagementError(
      "LAST_ADMIN_PROTECTED",
      "The last active Admin cannot be demoted or deactivated."
    );
  }
}

async function requireUser(context: DatabaseContext, userId: string): Promise<UserAdminRecord> {
  const user = await getAdminUser(context, userId);
  if (!user) throw new UserManagementError("USER_NOT_FOUND", "User not found.");
  return user;
}

function auditStatement(
  context: DatabaseContext,
  id: string,
  actorUserId: string,
  targetUserId: string,
  action: UserManagementAction,
  createdAt: string
) {
  return context.db
    .prepare(
      "INSERT INTO user_management_audit (id, actor_user_id, target_user_id, action, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(id, actorUserId, targetUserId, action, createdAt);
}

function mapUser(row: UserAdminRow): UserAdminRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
    authProvider: row.auth_provider,
    authSubject: row.auth_subject,
    identityMapped: Boolean(row.auth_provider && row.auth_subject),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
