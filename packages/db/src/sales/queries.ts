import type { DatabaseContext } from "../types";
import type { SalesHandoffTask, SalesHandoffTaskRow } from "./types";

export async function listSalesHandoffTasks(
  context: DatabaseContext,
  assignedUserId?: string
): Promise<SalesHandoffTask[]> {
  const filters = [
    "au.role = 'sales_rep'",
    "t.task_type IN ('handoff', 'visit')",
    "t.status IN ('open', 'in_progress')",
    "t.customer_id IS NOT NULL",
    "t.source_interaction_id IS NOT NULL"
  ];
  const params: unknown[] = [];

  if (assignedUserId?.trim()) {
    filters.push("t.assigned_user_id = ?");
    params.push(assignedUserId.trim());
  }

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
        i.next_action AS source_next_action, t.created_at
      FROM tasks t
      JOIN users au ON au.id = t.assigned_user_id
      JOIN customers c ON c.id = t.customer_id
      JOIN customer_interactions i ON i.id = t.source_interaction_id
      LEFT JOIN users cu ON cu.id = t.created_by_user_id
      WHERE ${filters.join(" AND ")}
      ORDER BY
        CASE t.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          ELSE 4
        END,
        t.due_at ASC,
        t.created_at DESC
    `
    )
    .bind(...params)
    .all<SalesHandoffTaskRow>();

  return result.results.map((row) => ({
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
    createdAt: row.created_at
  }));
}
