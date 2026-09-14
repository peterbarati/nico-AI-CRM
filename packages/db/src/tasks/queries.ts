import { canTransitionTask, isTaskOverdue, type OperationalTaskType } from "@nico-ai-crm/shared";
import type { CountRow, DatabaseContext, PaginatedResult, PaginationInput } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type {
  CreateTaskCommand,
  TaskDetail,
  TaskEvent,
  TaskEventRow,
  TaskItem,
  TaskListQuery,
  TaskRow,
  TransitionTaskCommand,
  UpdateTaskCommand
} from "./types";
import { TaskWriteError } from "./types";

const taskSelect = `
  SELECT t.id, t.customer_id, t.customer_location_id,
    c.company_name AS customer_name, c.city AS customer_city, l.name AS location_name,
    t.assigned_user_id, au.name AS assigned_user_name, au.email AS assigned_user_email,
    au.role AS assigned_user_role, t.created_by_user_id,
    cu.name AS created_by_user_name, cu.email AS created_by_user_email,
    cu.role AS created_by_user_role, t.source_interaction_id, t.source_visit_id,
    t.source_campaign_id, cp.name AS source_campaign_name,
    cp.operational_status AS source_campaign_status,
    t.source_origin, i.reason AS interaction_reason, i.result AS interaction_result,
    i.notes AS interaction_notes, i.next_action AS interaction_next_action,
    i.created_at AS interaction_created_at, v.result AS visit_result,
    v.notes AS visit_notes, v.order_value AS visit_order_value,
    v.next_action AS visit_next_action, v.completed_at AS visit_completed_at,
    t.title, t.description, t.task_type, t.operational_type, t.priority, t.status,
    t.due_at, t.completed_at, t.created_at, t.updated_at
  FROM tasks t
  JOIN users au ON au.id = t.assigned_user_id
  LEFT JOIN users cu ON cu.id = t.created_by_user_id
  LEFT JOIN customers c ON c.id = t.customer_id
  LEFT JOIN customer_locations l ON l.id = t.customer_location_id
  LEFT JOIN customer_interactions i ON i.id = t.source_interaction_id
  LEFT JOIN sales_visits v ON v.id = t.source_visit_id
  LEFT JOIN campaigns cp ON cp.id = t.source_campaign_id
`;

export async function listCustomerTasks(
  context: DatabaseContext,
  customerId: string,
  options: PaginationInput & { status?: string } = {}
): Promise<PaginatedResult<TaskItem>> {
  return listTasks(context, { ...options, customerId });
}

export async function listTasks(
  context: DatabaseContext,
  options: PaginationInput & { status?: string; customerId?: string } = {}
): Promise<PaginatedResult<TaskItem>> {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  return listOperationalTasks(context, {
    ...options,
    status: options.status as TaskListQuery["status"],
    nowUtc: now.toISOString(),
    businessDayFromUtc: `${day}T00:00:00.000Z`,
    businessDayToUtc: `${day}T23:59:59.999Z`
  });
}

export async function listOperationalTasks(
  context: DatabaseContext,
  query: TaskListQuery
): Promise<PaginatedResult<TaskItem>> {
  const normalized = normalizePagination(query);
  const where: string[] = [];
  const params: unknown[] = [];

  if (query.search?.trim()) {
    const search = `%${query.search.trim()}%`;
    where.push(
      "(t.title LIKE ? OR t.description LIKE ? OR c.company_name LIKE ? OR l.name LIKE ?)"
    );
    params.push(search, search, search, search);
  }
  if (query.status) {
    where.push("t.status = ?");
    params.push(query.status);
  }
  if (query.priority) {
    where.push("t.priority = ?");
    params.push(query.priority);
  }
  if (query.assignedUserId) {
    where.push("t.assigned_user_id = ?");
    params.push(query.assignedUserId);
  }
  if (query.assignedRole) {
    where.push("au.role = ?");
    params.push(query.assignedRole);
  }
  if (query.taskType) {
    where.push("t.operational_type = ?");
    params.push(query.taskType);
  }
  if (query.customerId) {
    where.push("t.customer_id = ?");
    params.push(query.customerId);
  }
  if (query.due === "overdue") {
    where.push("t.status IN ('open', 'in_progress') AND t.due_at IS NOT NULL AND t.due_at < ?");
    params.push(query.nowUtc);
  } else if (query.due === "today") {
    where.push("t.status IN ('open', 'in_progress') AND t.due_at >= ? AND t.due_at < ?");
    params.push(query.businessDayFromUtc, query.businessDayToUtc);
  } else if (query.due === "upcoming") {
    where.push("t.status IN ('open', 'in_progress') AND t.due_at >= ?");
    params.push(query.businessDayToUtc);
  } else if (query.due === "none") {
    where.push("t.due_at IS NULL");
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = await context.db
    .prepare(
      `SELECT COUNT(*) AS total FROM tasks t JOIN users au ON au.id = t.assigned_user_id LEFT JOIN customers c ON c.id = t.customer_id LEFT JOIN customer_locations l ON l.id = t.customer_location_id ${whereSql}`
    )
    .bind(...params)
    .first<CountRow>();
  const orderSql = getOrderSql(query);
  const result = await context.db
    .prepare(`${taskSelect} ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`)
    .bind(...params, normalized.pageSize, normalized.offset)
    .all<TaskRow>();

  return {
    items: result.results.map((row) => mapTask(row, query.nowUtc)),
    pagination: toPagination(normalized.page, normalized.pageSize, total?.total ?? 0)
  };
}

function getOrderSql(query: TaskListQuery): string {
  const direction = query.direction === "desc" ? "DESC" : "ASC";
  const columns = {
    due_at: `CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END, t.due_at ${direction}`,
    priority: `CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END ${direction}`,
    created_at: `t.created_at ${direction}`,
    customer: `c.company_name ${direction}`,
    status: `t.status ${direction}`
  } as const;
  if (query.sort && query.sort !== "operational") return `${columns[query.sort]}, t.id ASC`;
  return `
    CASE
      WHEN t.status IN ('completed', 'cancelled') THEN 5
      WHEN t.due_at IS NOT NULL AND t.due_at < '${query.nowUtc}' THEN 0
      WHEN t.due_at >= '${query.businessDayFromUtc}' AND t.due_at < '${query.businessDayToUtc}' THEN 1
      WHEN t.due_at IS NOT NULL THEN 2
      ELSE 3
    END ASC,
    CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END ASC,
    CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END, t.due_at ASC, t.created_at DESC, t.id ASC
  `;
}

export async function getTaskById(
  context: DatabaseContext,
  taskId: string,
  nowUtc = new Date().toISOString()
): Promise<TaskItem | null> {
  return getTaskByColumn(context, "t.id", taskId, nowUtc);
}

export async function getTaskDetail(
  context: DatabaseContext,
  taskId: string,
  nowUtc: string
): Promise<TaskDetail | null> {
  const task = await getTaskById(context, taskId, nowUtc);
  if (!task) return null;
  return { task, events: await listTaskEvents(context, taskId) };
}

export async function getTaskBySourceInteractionId(
  context: DatabaseContext,
  interactionId: string
): Promise<TaskItem | null> {
  return getTaskByColumn(
    context,
    "t.source_interaction_id",
    interactionId,
    new Date().toISOString()
  );
}

export async function getTaskBySourceVisitId(
  context: DatabaseContext,
  visitId: string
): Promise<TaskItem | null> {
  return getTaskByColumn(context, "t.source_visit_id", visitId, new Date().toISOString());
}

async function getTaskByColumn(
  context: DatabaseContext,
  column: "t.id" | "t.source_interaction_id" | "t.source_visit_id",
  value: string,
  nowUtc: string
): Promise<TaskItem | null> {
  const row = await context.db
    .prepare(`${taskSelect} WHERE ${column} = ? ORDER BY t.created_at DESC LIMIT 1`)
    .bind(value)
    .first<TaskRow>();
  return row ? mapTask(row, nowUtc) : null;
}

export async function createOperationalTask(
  context: DatabaseContext,
  command: CreateTaskCommand
): Promise<TaskItem> {
  await validateReferences(
    context,
    command.assignedUserId,
    command.customerId,
    command.customerLocationId
  );
  const legacyType = legacyTaskType(command.operationalType);
  await context.db.batch([
    context.db
      .prepare(
        `INSERT INTO tasks (
          id, customer_id, customer_location_id, assigned_user_id, created_by_user_id,
          source_interaction_id, title, description, task_type, priority, status, due_at,
          completed_at, created_at, updated_at, source_visit_id, operational_type, source_origin
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'open', ?, NULL, ?, ?, NULL, ?, 'MANUAL')`
      )
      .bind(
        command.id,
        command.customerId,
        command.customerLocationId,
        command.assignedUserId,
        command.actorUserId,
        command.title,
        command.description,
        legacyType,
        command.priority,
        command.dueAt,
        command.createdAt,
        command.createdAt,
        command.operationalType
      ),
    eventStatement(context, {
      id: command.eventId,
      taskId: command.id,
      actorUserId: command.actorUserId,
      eventType: "CREATED",
      previousStatus: null,
      newStatus: "open",
      previousDueAt: null,
      newDueAt: command.dueAt,
      previousAssignedUserId: null,
      newAssignedUserId: command.assignedUserId,
      createdAt: command.createdAt
    })
  ]);
  return requireTask(context, command.id, command.createdAt);
}

export async function updateOperationalTask(
  context: DatabaseContext,
  command: UpdateTaskCommand
): Promise<TaskItem> {
  const existing = await requireTask(context, command.taskId, command.updatedAt);
  if (["completed", "cancelled"].includes(existing.status)) {
    throw new TaskWriteError(
      "TASK_STATE_INVALID",
      "Completed or cancelled tasks cannot be edited."
    );
  }
  const assignedUserId = command.assignedUserId ?? existing.assignedUser.id;
  await validateReferences(
    context,
    assignedUserId,
    existing.customerId,
    existing.customerLocationId
  );
  const changes: string[] = [];
  const params: unknown[] = [];
  const add = (column: string, value: unknown) => {
    changes.push(`${column} = ?`);
    params.push(value);
  };
  if (command.assignedUserId !== undefined) add("assigned_user_id", command.assignedUserId);
  if (command.title !== undefined) add("title", command.title);
  if (command.description !== undefined) add("description", command.description);
  if (command.priority !== undefined) add("priority", command.priority);
  if (command.dueAt !== undefined) add("due_at", command.dueAt);
  if (command.operationalType !== undefined) {
    add("operational_type", command.operationalType);
    add("task_type", legacyTaskType(command.operationalType));
  }
  if (!changes.length) return existing;
  add("updated_at", command.updatedAt);
  const eventType =
    command.dueAt !== undefined && command.dueAt !== existing.dueAt
      ? "RESCHEDULED"
      : command.assignedUserId !== undefined && command.assignedUserId !== existing.assignedUser.id
        ? "REASSIGNED"
        : "UPDATED";
  await context.db.batch([
    context.db
      .prepare(`UPDATE tasks SET ${changes.join(", ")} WHERE id = ?`)
      .bind(...params, command.taskId),
    eventStatement(context, {
      id: command.eventId,
      taskId: command.taskId,
      actorUserId: command.actorUserId,
      eventType,
      previousStatus: existing.status,
      newStatus: existing.status,
      previousDueAt: existing.dueAt,
      newDueAt: command.dueAt === undefined ? existing.dueAt : command.dueAt,
      previousAssignedUserId: existing.assignedUser.id,
      newAssignedUserId: assignedUserId,
      createdAt: command.updatedAt
    })
  ]);
  return requireTask(context, command.taskId, command.updatedAt);
}

export async function transitionOperationalTask(
  context: DatabaseContext,
  command: TransitionTaskCommand
): Promise<{ task: TaskItem; duplicate: boolean }> {
  const existing = await requireTask(context, command.taskId, command.updatedAt);
  if (existing.status === command.status) return { task: existing, duplicate: true };
  if (!canTransitionTask(existing.status, command.status)) {
    throw new TaskWriteError(
      "TASK_STATE_INVALID",
      `Task cannot transition from ${existing.status} to ${command.status}.`
    );
  }
  const completedAt = command.status === "completed" ? command.updatedAt : null;
  const eventType =
    command.status === "in_progress"
      ? "STARTED"
      : command.status === "completed"
        ? "COMPLETED"
        : "CANCELLED";
  await context.db.batch([
    context.db
      .prepare("UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?")
      .bind(command.status, completedAt, command.updatedAt, command.taskId),
    eventStatement(context, {
      id: command.eventId,
      taskId: command.taskId,
      actorUserId: command.actorUserId,
      eventType,
      previousStatus: existing.status,
      newStatus: command.status,
      previousDueAt: existing.dueAt,
      newDueAt: existing.dueAt,
      previousAssignedUserId: existing.assignedUser.id,
      newAssignedUserId: existing.assignedUser.id,
      createdAt: command.updatedAt
    })
  ]);
  return { task: await requireTask(context, command.taskId, command.updatedAt), duplicate: false };
}

async function validateReferences(
  context: DatabaseContext,
  assignedUserId: string,
  customerId: string | null,
  locationId: string | null
) {
  const assignee = await context.db
    .prepare("SELECT id FROM users WHERE id = ? AND active = 1")
    .bind(assignedUserId)
    .first<{ id: string }>();
  if (!assignee)
    throw new TaskWriteError("ASSIGNEE_INVALID", "Assigned user is missing or inactive.");
  if (customerId) {
    const customer = await context.db
      .prepare("SELECT id FROM customers WHERE id = ?")
      .bind(customerId)
      .first<{ id: string }>();
    if (!customer) throw new TaskWriteError("CUSTOMER_NOT_FOUND", "Customer not found.");
  }
  if (locationId) {
    const location = await context.db
      .prepare("SELECT id FROM customer_locations WHERE id = ? AND customer_id = ?")
      .bind(locationId, customerId)
      .first<{ id: string }>();
    if (!location)
      throw new TaskWriteError(
        "LOCATION_INVALID",
        "Location does not belong to the selected customer."
      );
  }
}

async function requireTask(context: DatabaseContext, taskId: string, nowUtc: string) {
  const task = await getTaskById(context, taskId, nowUtc);
  if (!task) throw new TaskWriteError("TASK_NOT_FOUND", "Task not found.");
  return task;
}

async function listTaskEvents(context: DatabaseContext, taskId: string): Promise<TaskEvent[]> {
  const result = await context.db
    .prepare(
      `SELECT e.id, e.task_id, e.actor_user_id, u.name AS actor_name, u.email AS actor_email,
        u.role AS actor_role, e.event_type, e.previous_status, e.new_status,
        e.previous_due_at, e.new_due_at, e.previous_assigned_user_id,
        e.new_assigned_user_id, e.created_at
      FROM task_events e JOIN users u ON u.id = e.actor_user_id
      WHERE e.task_id = ? ORDER BY e.created_at DESC, e.id ASC`
    )
    .bind(taskId)
    .all<TaskEventRow>();
  return result.results.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    actor: {
      id: row.actor_user_id,
      name: row.actor_name,
      email: row.actor_email,
      role: row.actor_role
    },
    eventType: row.event_type,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    previousDueAt: row.previous_due_at,
    newDueAt: row.new_due_at,
    previousAssignedUserId: row.previous_assigned_user_id,
    newAssignedUserId: row.new_assigned_user_id,
    createdAt: row.created_at
  }));
}

interface EventInsert {
  id: string;
  taskId: string;
  actorUserId: string;
  eventType: TaskEvent["eventType"];
  previousStatus: string | null;
  newStatus: string | null;
  previousDueAt: string | null;
  newDueAt: string | null;
  previousAssignedUserId: string | null;
  newAssignedUserId: string | null;
  createdAt: string;
}

function eventStatement(context: DatabaseContext, event: EventInsert): D1PreparedStatement {
  return context.db
    .prepare(
      `INSERT INTO task_events (
        id, task_id, actor_user_id, event_type, previous_status, new_status,
        previous_due_at, new_due_at, previous_assigned_user_id, new_assigned_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      event.id,
      event.taskId,
      event.actorUserId,
      event.eventType,
      event.previousStatus,
      event.newStatus,
      event.previousDueAt,
      event.newDueAt,
      event.previousAssignedUserId,
      event.newAssignedUserId,
      event.createdAt
    );
}

function legacyTaskType(type: OperationalTaskType): string {
  if (type === "FOLLOW_UP_CALL" || type === "REACTIVATION" || type === "REORDER") return "call";
  if (type === "SALES_VISIT") return "visit";
  if (type === "CAMPAIGN_FOLLOW_UP") return "follow_up";
  if (type === "CUSTOMER_SERVICE" || type === "B2B_REGISTRATION") return "follow_up";
  return "other";
}

function mapTask(row: TaskRow, nowUtc: string): TaskItem {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerLocationId: row.customer_location_id,
    customerName: row.customer_name,
    customerCity: row.customer_city,
    locationName: row.location_name,
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
    sourceVisitId: row.source_visit_id,
    sourceCampaignId: row.source_campaign_id,
    sourceOrigin: row.source_origin,
    sourceContext: {
      campaign:
        row.source_campaign_id && row.source_campaign_name && row.source_campaign_status
          ? {
              id: row.source_campaign_id,
              name: row.source_campaign_name,
              status: row.source_campaign_status
            }
          : null,
      interaction:
        row.source_interaction_id && row.interaction_created_at
          ? {
              id: row.source_interaction_id,
              reason: row.interaction_reason,
              result: row.interaction_result,
              notes: row.interaction_notes,
              nextAction: row.interaction_next_action,
              createdAt: row.interaction_created_at
            }
          : null,
      visit: row.source_visit_id
        ? {
            id: row.source_visit_id,
            result: row.visit_result,
            notes: row.visit_notes,
            orderValue: row.visit_order_value,
            nextAction: row.visit_next_action,
            completedAt: row.visit_completed_at
          }
        : null
    },
    title: row.title,
    description: row.description,
    taskType: row.task_type,
    operationalType: row.operational_type,
    priority: row.priority,
    status: row.status,
    dueAt: row.due_at,
    overdue: isTaskOverdue(row.status, row.due_at, nowUtc),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
