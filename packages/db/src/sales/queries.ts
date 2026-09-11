import type { CountRow, DatabaseContext, PaginatedResult } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type { SalesTaskQuery, SalesTaskQueueItem, SalesTaskQueueRow } from "./types";

export async function listSalesTasks(
  context: DatabaseContext,
  query: SalesTaskQuery = {}
): Promise<PaginatedResult<SalesTaskQueueItem>> {
  const normalized = normalizePagination(query);
  const filters = ["au.role = 'sales_rep'", "t.customer_id IS NOT NULL"];
  const params: unknown[] = [];

  if (query.taskId?.trim()) {
    filters.push("t.id = ?");
    params.push(query.taskId.trim());
  }

  if (query.assignedUserId?.trim()) {
    filters.push("t.assigned_user_id = ?");
    params.push(query.assignedUserId.trim());
  }
  if (query.status?.trim()) {
    filters.push("t.status = ?");
    params.push(query.status.trim());
  } else if (!query.taskId) {
    filters.push("t.status IN ('open', 'in_progress')");
  }
  if (query.priority?.trim()) {
    filters.push("t.priority = ?");
    params.push(query.priority.trim());
  }
  if (query.due === "overdue" && query.nowUtc) {
    filters.push("t.due_at IS NOT NULL AND t.due_at < ?");
    params.push(query.nowUtc);
  } else if (query.due === "today" && query.businessDayFromUtc && query.businessDayToUtc) {
    filters.push("t.due_at >= ? AND t.due_at < ?");
    params.push(query.businessDayFromUtc, query.businessDayToUtc);
  } else if (query.due === "upcoming" && query.businessDayToUtc) {
    filters.push("t.due_at >= ?");
    params.push(query.businessDayToUtc);
  }

  const whereSql = `WHERE ${filters.join(" AND ")}`;
  const totalRow = await context.db
    .prepare(
      `SELECT COUNT(*) AS total FROM tasks t JOIN users au ON au.id = t.assigned_user_id ${whereSql}`
    )
    .bind(...params)
    .first<CountRow>();
  const result = await context.db
    .prepare(
      `
      SELECT t.id, t.customer_id, c.company_name AS customer_name, c.city AS customer_city,
        t.assigned_user_id, au.name AS assigned_user_name, au.email AS assigned_user_email,
        au.role AS assigned_user_role, t.created_by_user_id,
        cu.name AS created_by_user_name, cu.email AS created_by_user_email,
        cu.role AS created_by_user_role, t.task_type, t.title, t.description,
        t.priority, t.status, t.due_at, t.source_interaction_id,
        i.reason AS source_reason, i.result AS source_result, i.notes AS source_notes,
        i.next_action AS source_next_action, v.id AS visit_id, v.status AS visit_status,
        v.planned_at AS visit_planned_at, t.created_at
      FROM tasks t
      JOIN users au ON au.id = t.assigned_user_id
      JOIN customers c ON c.id = t.customer_id
      LEFT JOIN customer_interactions i ON i.id = t.source_interaction_id
      LEFT JOIN users cu ON cu.id = t.created_by_user_id
      LEFT JOIN sales_visits v ON v.id = (
        SELECT candidate.id FROM sales_visits candidate
        WHERE candidate.source_task_id = t.id
        ORDER BY candidate.created_at DESC LIMIT 1
      )
      ${whereSql}
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END,
        t.due_at ASC,
        t.created_at DESC
      LIMIT ? OFFSET ?
    `
    )
    .bind(...params, normalized.pageSize, normalized.offset)
    .all<SalesTaskQueueRow>();

  return {
    items: result.results.map(mapSalesTask),
    pagination: toPagination(normalized.page, normalized.pageSize, totalRow?.total ?? 0)
  };
}

export async function getSalesTaskQueueItem(
  context: DatabaseContext,
  taskId: string
): Promise<SalesTaskQueueItem | null> {
  const result = await listSalesTasks(context, { pageSize: 1, taskId });
  return result.items[0] ?? null;
}

function mapSalesTask(row: SalesTaskQueueRow): SalesTaskQueueItem {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerCity: row.customer_city,
    assignedUser: {
      id: row.assigned_user_id,
      name: row.assigned_user_name,
      email: row.assigned_user_email,
      role: row.assigned_user_role
    },
    requestedBy:
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
    taskType: row.task_type,
    title: row.title,
    context: row.description,
    priority: row.priority,
    status: row.status,
    dueAt: row.due_at,
    sourceInteractionId: row.source_interaction_id,
    sourceReason: row.source_reason,
    sourceResult: row.source_result,
    sourceNotes: row.source_notes,
    sourceNextAction: row.source_next_action,
    visit:
      row.visit_id && row.visit_status
        ? { id: row.visit_id, status: row.visit_status, plannedAt: row.visit_planned_at }
        : null,
    createdAt: row.created_at
  };
}
