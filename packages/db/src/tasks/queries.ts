import type { CountRow, DatabaseContext, PaginatedResult, PaginationInput } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type { TaskItem, TaskRow } from "./types";

export async function listCustomerTasks(
  context: DatabaseContext,
  customerId: string,
  options: PaginationInput & { status?: string } = {}
): Promise<PaginatedResult<TaskItem>> {
  return listTasks(context, {
    ...options,
    customerId
  });
}

export async function listTasks(
  context: DatabaseContext,
  options: PaginationInput & { status?: string; customerId?: string } = {}
): Promise<PaginatedResult<TaskItem>> {
  const normalized = normalizePagination(options);
  const where: string[] = [];
  const params: unknown[] = [];

  if (options.customerId) {
    where.push("t.customer_id = ?");
    params.push(options.customerId);
  }

  if (options.status) {
    where.push("t.status = ?");
    params.push(options.status);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await context.db
    .prepare(`SELECT COUNT(*) AS total FROM tasks t ${whereSql}`)
    .bind(...params)
    .first<CountRow>();

  const result = await context.db
    .prepare(
      `
      SELECT t.id, t.customer_id, t.customer_location_id, t.assigned_user_id,
        au.name AS assigned_user_name, au.email AS assigned_user_email, au.role AS assigned_user_role,
        t.created_by_user_id, cu.name AS created_by_user_name, cu.email AS created_by_user_email,
        cu.role AS created_by_user_role, t.source_interaction_id, c.company_name AS customer_name,
        t.title, t.description, t.task_type, t.priority, t.status, t.due_at, t.completed_at,
        t.created_at, t.updated_at
      FROM tasks t
      JOIN users au ON au.id = t.assigned_user_id
      LEFT JOIN users cu ON cu.id = t.created_by_user_id
      LEFT JOIN customers c ON c.id = t.customer_id
      ${whereSql}
      ORDER BY
        CASE t.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          ELSE 4
        END ASC,
        t.due_at ASC,
        t.created_at DESC
      LIMIT ? OFFSET ?
    `
    )
    .bind(...params, normalized.pageSize, normalized.offset)
    .all<TaskRow>();

  return {
    items: result.results.map(mapTask),
    pagination: toPagination(normalized.page, normalized.pageSize, totalRow?.total ?? 0)
  };
}

function mapTask(row: TaskRow): TaskItem {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerLocationId: row.customer_location_id,
    assignedUser: {
      id: row.assigned_user_id,
      name: row.assigned_user_name,
      email: row.assigned_user_email,
      role: row.assigned_user_role
    },
    createdByUser:
      row.created_by_user_id &&
      row.created_by_user_name &&
      row.created_by_user_email &&
      row.created_by_user_role
        ? {
            id: row.created_by_user_id,
            name: row.created_by_user_name,
            email: row.created_by_user_email,
            role: row.created_by_user_role
          }
        : null,
    sourceInteractionId: row.source_interaction_id,
    customerName: row.customer_name,
    title: row.title,
    description: row.description,
    taskType: row.task_type,
    priority: row.priority,
    status: row.status,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getTaskBySourceInteractionId(
  context: DatabaseContext,
  interactionId: string
): Promise<TaskItem | null> {
  const row = await context.db
    .prepare(
      `
      SELECT t.id, t.customer_id, t.customer_location_id, t.assigned_user_id,
        au.name AS assigned_user_name, au.email AS assigned_user_email, au.role AS assigned_user_role,
        t.created_by_user_id, cu.name AS created_by_user_name, cu.email AS created_by_user_email,
        cu.role AS created_by_user_role, t.source_interaction_id, c.company_name AS customer_name,
        t.title, t.description, t.task_type, t.priority, t.status, t.due_at, t.completed_at,
        t.created_at, t.updated_at
      FROM tasks t
      JOIN users au ON au.id = t.assigned_user_id
      LEFT JOIN users cu ON cu.id = t.created_by_user_id
      LEFT JOIN customers c ON c.id = t.customer_id
      WHERE t.source_interaction_id = ?
      ORDER BY t.created_at DESC
      LIMIT 1
    `
    )
    .bind(interactionId)
    .first<TaskRow>();

  return row ? mapTask(row) : null;
}
