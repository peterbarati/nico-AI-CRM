import type { CountRow, DatabaseContext, PaginatedResult, PaginationInput } from "../types";
import { normalizePagination, toPagination } from "../utils";
import { getTaskById, getTaskBySourceVisitId } from "../tasks/queries";
import { getActiveUser } from "../users/queries";
import type {
  CompleteSalesVisitCommand,
  SalesVisit,
  SalesVisitWriteResult,
  ScheduleSalesVisitCommand,
  VisitRow
} from "./types";
import { SalesWorkflowError } from "./types";

export async function listCustomerVisits(
  context: DatabaseContext,
  customerId: string,
  pagination: PaginationInput = {}
): Promise<PaginatedResult<SalesVisit>> {
  const normalized = normalizePagination(pagination);
  const totalRow = await context.db
    .prepare("SELECT COUNT(*) AS total FROM sales_visits WHERE customer_id = ?")
    .bind(customerId)
    .first<CountRow>();

  const result = await context.db
    .prepare(
      `
      SELECT v.id, v.customer_id, v.customer_location_id, v.sales_rep_id,
        u.name AS sales_rep_name, u.email AS sales_rep_email, u.role AS sales_rep_role,
        v.planned_at, v.started_at, v.completed_at, v.status, v.result, v.notes,
        v.order_value, v.source_task_id, v.next_action, v.follow_up_at,
        v.created_at, v.updated_at
      FROM sales_visits v
      JOIN users u ON u.id = v.sales_rep_id
      WHERE v.customer_id = ?
      ORDER BY COALESCE(v.planned_at, v.created_at) DESC, v.id ASC
      LIMIT ? OFFSET ?
    `
    )
    .bind(customerId, normalized.pageSize, normalized.offset)
    .all<VisitRow>();

  return {
    items: result.results.map(mapVisit),
    pagination: toPagination(normalized.page, normalized.pageSize, totalRow?.total ?? 0)
  };
}

export async function scheduleSalesVisit(
  context: DatabaseContext,
  command: ScheduleSalesVisitCommand
): Promise<SalesVisitWriteResult> {
  const duplicate = await getVisitByCreateIdempotencyKey(context, command.request.idempotencyKey);
  if (duplicate) {
    if (duplicate.sourceTaskId !== command.sourceTaskId) {
      throw new SalesWorkflowError(
        "IDEMPOTENCY_CONFLICT",
        "Idempotency key has already been used for another Sales task."
      );
    }
    return buildWriteResult(context, duplicate, true);
  }

  const existingVisit = await getSalesVisitBySourceTaskId(context, command.sourceTaskId);
  if (existingVisit) {
    throw new SalesWorkflowError(
      "TASK_NOT_ACTIONABLE",
      "A visit has already been scheduled for this Sales task."
    );
  }

  const [task, actor] = await Promise.all([
    getTaskById(context, command.sourceTaskId),
    getActiveUser(context, command.actorUserId)
  ]);
  if (!task || !task.customerId) {
    throw new SalesWorkflowError("TASK_NOT_FOUND", "Sales task not found.");
  }
  assertSalesActor(actor, task.assignedUser.id);
  if (!["open", "in_progress"].includes(task.status)) {
    throw new SalesWorkflowError("TASK_NOT_ACTIONABLE", "Sales task is no longer actionable.");
  }
  if (task.assignedUser.role !== "sales_rep") {
    throw new SalesWorkflowError("TASK_NOT_ACTIONABLE", "Task is not assigned to Sales.");
  }

  if (command.request.customerLocationId) {
    const location = await context.db
      .prepare("SELECT id FROM customer_locations WHERE id = ? AND customer_id = ? AND active = 1")
      .bind(command.request.customerLocationId, task.customerId)
      .first<{ id: string }>();
    if (!location) {
      throw new SalesWorkflowError("LOCATION_INVALID", "Selected customer location is invalid.");
    }
  }

  const statements = [
    context.db
      .prepare(
        `
        INSERT INTO sales_visits (
          id, customer_id, customer_location_id, sales_rep_id, planned_at,
          started_at, completed_at, status, result, notes, order_value,
          created_at, updated_at, source_task_id, create_idempotency_key,
          completion_idempotency_key, next_action, follow_up_at
        ) VALUES (?, ?, ?, ?, ?, NULL, NULL, 'planned', NULL, ?, NULL, ?, ?, ?, ?, NULL, NULL, NULL)
      `
      )
      .bind(
        command.visitId,
        task.customerId,
        command.request.customerLocationId ?? task.customerLocationId,
        command.actorUserId,
        command.request.plannedAt,
        command.request.notes ?? null,
        command.createdAt,
        command.createdAt,
        command.sourceTaskId,
        command.request.idempotencyKey
      ),
    context.db
      .prepare(
        "UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'open'"
      )
      .bind(command.createdAt, command.sourceTaskId)
  ];

  try {
    await context.db.batch(statements);
  } catch (error) {
    const racedDuplicate = await getVisitByCreateIdempotencyKey(
      context,
      command.request.idempotencyKey
    );
    if (racedDuplicate) {
      if (racedDuplicate.sourceTaskId !== command.sourceTaskId) {
        throw new SalesWorkflowError(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key has already been used for another Sales task."
        );
      }
      return buildWriteResult(context, racedDuplicate, true);
    }
    throw error;
  }

  const visit = await getSalesVisitById(context, command.visitId);
  if (!visit) {
    throw new Error("Scheduled visit could not be loaded.");
  }
  return buildWriteResult(context, visit, false);
}

export async function startSalesVisit(
  context: DatabaseContext,
  visitId: string,
  actorUserId: string,
  startedAt: string
): Promise<SalesVisitWriteResult> {
  const visit = await getSalesVisitById(context, visitId);
  if (!visit) {
    throw new SalesWorkflowError("VISIT_NOT_FOUND", "Sales visit not found.");
  }
  const actor = await getActiveUser(context, actorUserId);
  assertSalesActor(actor, visit.salesRep.id);
  if (visit.status === "in_progress") {
    return buildWriteResult(context, visit, true);
  }
  if (visit.status !== "planned") {
    throw new SalesWorkflowError(
      "VISIT_STATE_INVALID",
      `Cannot start a visit with status ${visit.status}.`
    );
  }

  const statements: D1PreparedStatement[] = [
    context.db
      .prepare(
        "UPDATE sales_visits SET status = 'in_progress', started_at = ?, updated_at = ? WHERE id = ? AND status = 'planned'"
      )
      .bind(startedAt, startedAt, visitId)
  ];
  if (visit.sourceTaskId) {
    statements.push(
      context.db
        .prepare(
          "UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'open'"
        )
        .bind(startedAt, visit.sourceTaskId)
    );
  }
  await context.db.batch(statements);

  const updated = await getSalesVisitById(context, visitId);
  if (!updated) {
    throw new Error("Started visit could not be loaded.");
  }
  return buildWriteResult(context, updated, false);
}

export async function completeSalesVisit(
  context: DatabaseContext,
  command: CompleteSalesVisitCommand
): Promise<SalesVisitWriteResult> {
  const duplicate = await getVisitByCompletionIdempotencyKey(
    context,
    command.request.idempotencyKey
  );
  if (duplicate) {
    if (duplicate.id !== command.visitId) {
      throw new SalesWorkflowError(
        "IDEMPOTENCY_CONFLICT",
        "Idempotency key has already been used for another visit."
      );
    }
    return buildWriteResult(context, duplicate, true);
  }

  const visit = await getSalesVisitById(context, command.visitId);
  if (!visit) {
    throw new SalesWorkflowError("VISIT_NOT_FOUND", "Sales visit not found.");
  }
  const actor = await getActiveUser(context, command.actorUserId);
  assertSalesActor(actor, visit.salesRep.id);
  if (!["planned", "in_progress"].includes(visit.status)) {
    throw new SalesWorkflowError(
      "VISIT_STATE_INVALID",
      `Cannot complete a visit with status ${visit.status}.`
    );
  }

  const sourceTask = visit.sourceTaskId ? await getTaskById(context, visit.sourceTaskId) : null;
  const followUp = await buildFollowUpTask(context, command, visit, sourceTask);
  const statements: D1PreparedStatement[] = [
    context.db
      .prepare(
        `
        UPDATE sales_visits
        SET status = 'completed', completed_at = ?, result = ?, notes = ?, order_value = ?,
          next_action = ?, follow_up_at = ?, completion_idempotency_key = ?, updated_at = ?
        WHERE id = ? AND status IN ('planned', 'in_progress')
      `
      )
      .bind(
        command.completedAt,
        command.request.result,
        command.request.notes ?? visit.notes,
        command.request.orderValue ?? null,
        command.request.nextAction,
        command.request.followUpAt ?? null,
        command.request.idempotencyKey,
        command.completedAt,
        command.visitId
      )
  ];

  if (sourceTask) {
    statements.push(
      context.db
        .prepare(
          "UPDATE tasks SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ? AND status IN ('open', 'in_progress')"
        )
        .bind(command.completedAt, command.completedAt, sourceTask.id)
    );
  }
  if (followUp) {
    statements.push(
      context.db
        .prepare(
          `
          INSERT INTO tasks (
            id, customer_id, customer_location_id, assigned_user_id, created_by_user_id,
            source_interaction_id, title, description, task_type, priority, status,
            due_at, completed_at, created_at, updated_at, source_visit_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, NULL, ?, ?, ?)
        `
        )
        .bind(
          command.followUpTaskId,
          visit.customerId,
          visit.customerLocationId,
          followUp.assignedUserId,
          command.actorUserId,
          sourceTask?.sourceInteractionId ?? null,
          followUp.title,
          followUp.description,
          followUp.taskType,
          followUp.priority,
          command.request.followUpAt,
          command.completedAt,
          command.completedAt,
          command.visitId
        )
    );
  }

  try {
    await context.db.batch(statements);
  } catch (error) {
    const racedDuplicate = await getVisitByCompletionIdempotencyKey(
      context,
      command.request.idempotencyKey
    );
    if (racedDuplicate) {
      if (racedDuplicate.id !== command.visitId) {
        throw new SalesWorkflowError(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key has already been used for another visit."
        );
      }
      return buildWriteResult(context, racedDuplicate, true);
    }
    throw error;
  }

  const completed = await getSalesVisitById(context, command.visitId);
  if (!completed) {
    throw new Error("Completed visit could not be loaded.");
  }
  return buildWriteResult(context, completed, false);
}

export async function getSalesVisitBySourceTaskId(
  context: DatabaseContext,
  sourceTaskId: string
): Promise<SalesVisit | null> {
  return getVisit(context, "v.source_task_id", sourceTaskId);
}

export async function getSalesVisitById(
  context: DatabaseContext,
  visitId: string
): Promise<SalesVisit | null> {
  return getVisit(context, "v.id", visitId);
}

async function getVisitByCreateIdempotencyKey(context: DatabaseContext, key: string) {
  return getVisit(context, "v.create_idempotency_key", key);
}

async function getVisitByCompletionIdempotencyKey(context: DatabaseContext, key: string) {
  return getVisit(context, "v.completion_idempotency_key", key);
}

async function getVisit(
  context: DatabaseContext,
  column: "v.id" | "v.source_task_id" | "v.create_idempotency_key" | "v.completion_idempotency_key",
  value: string
): Promise<SalesVisit | null> {
  const row = await context.db
    .prepare(
      `
      SELECT v.id, v.customer_id, v.customer_location_id, v.sales_rep_id,
        u.name AS sales_rep_name, u.email AS sales_rep_email, u.role AS sales_rep_role,
        v.planned_at, v.started_at, v.completed_at, v.status, v.result, v.notes,
        v.order_value, v.source_task_id, v.next_action, v.follow_up_at,
        v.created_at, v.updated_at
      FROM sales_visits v
      JOIN users u ON u.id = v.sales_rep_id
      WHERE ${column} = ?
      ORDER BY v.created_at DESC
      LIMIT 1
    `
    )
    .bind(value)
    .first<VisitRow>();
  return row ? mapVisit(row) : null;
}

async function buildWriteResult(
  context: DatabaseContext,
  visit: SalesVisit,
  duplicate: boolean
): Promise<SalesVisitWriteResult> {
  return {
    duplicate,
    visit,
    sourceTask: visit.sourceTaskId ? await getTaskById(context, visit.sourceTaskId) : null,
    followUpTask: await getTaskBySourceVisitId(context, visit.id)
  };
}

function assertSalesActor(
  actor: Awaited<ReturnType<typeof getActiveUser>>,
  assignedUserId: string
) {
  if (!actor) {
    throw new SalesWorkflowError("ACTOR_NOT_FOUND", "Configured Sales user not found.");
  }
  if (actor.role !== "sales_rep") {
    throw new SalesWorkflowError(
      "ACTOR_ROLE_INVALID",
      "Configured actor must have the sales_rep role."
    );
  }
  if (actor.id !== assignedUserId) {
    throw new SalesWorkflowError(
      "ACTOR_NOT_ASSIGNED",
      "Sales task or visit is assigned to another user."
    );
  }
}

async function buildFollowUpTask(
  context: DatabaseContext,
  command: CompleteSalesVisitCommand,
  visit: SalesVisit,
  sourceTask: Awaited<ReturnType<typeof getTaskById>>
) {
  const action = command.request.nextAction;
  if (action === "NONE") {
    return null;
  }
  const customerServiceAction = [
    "CUSTOMER_SERVICE_CALL",
    "SEND_INFORMATION",
    "B2B_REGISTRATION",
    "REORDER_FOLLOW_UP"
  ].includes(action);
  let assignedUserId = command.actorUserId;
  if (customerServiceAction) {
    const user = await getActiveUser(context, command.customerServiceUserId);
    if (user?.role !== "customer_service") {
      throw new SalesWorkflowError(
        "CUSTOMER_SERVICE_USER_INVALID",
        "Configured Customer Service handoff user is invalid."
      );
    }
    assignedUserId = user.id;
  }
  const taskTypeByAction = {
    ANOTHER_SALES_VISIT: "visit",
    B2B_REGISTRATION: "follow_up",
    CUSTOMER_SERVICE_CALL: "call",
    REORDER_FOLLOW_UP: "call",
    SALES_FOLLOW_UP: "follow_up",
    SEND_INFORMATION: "email"
  } as const;
  const priorityByApiValue = {
    CRITICAL: "urgent",
    HIGH: "high",
    LOW: "low",
    MEDIUM: "normal"
  } as const;
  return {
    assignedUserId,
    title: `${action.replaceAll("_", " ")} after Sales visit`,
    description: [
      `Created by Sales Representative ${command.actorUserId}.`,
      `Visit result: ${command.request.result}.`,
      `Expected next action: ${action}.`,
      command.request.notes ? `Context: ${command.request.notes}` : null,
      sourceTask ? `Source task: ${sourceTask.title}.` : null
    ]
      .filter(Boolean)
      .join(" "),
    taskType: taskTypeByAction[action],
    priority: priorityByApiValue[command.request.priority ?? "MEDIUM"]
  };
}

function mapVisit(row: VisitRow): SalesVisit {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerLocationId: row.customer_location_id,
    salesRep: {
      id: row.sales_rep_id,
      name: row.sales_rep_name,
      email: row.sales_rep_email,
      role: row.sales_rep_role
    },
    plannedAt: row.planned_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    result: row.result,
    notes: row.notes,
    orderValue: row.order_value,
    sourceTaskId: row.source_task_id,
    nextAction: row.next_action,
    followUpAt: row.follow_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
