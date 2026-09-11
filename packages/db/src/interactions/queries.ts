import type { CountRow, DatabaseContext, PaginatedResult, PaginationInput } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type { CustomerInteraction, InteractionRow } from "./types";
import type { CallWorkflowWriteResult, CreateCallWorkflowCommand } from "./types";
import { CallWorkflowError } from "./types";
import { getTaskBySourceInteractionId } from "../tasks/queries";
import { getActiveUser } from "../users/queries";

export async function listCustomerInteractions(
  context: DatabaseContext,
  customerId: string,
  pagination: PaginationInput = {}
): Promise<PaginatedResult<CustomerInteraction>> {
  const normalized = normalizePagination(pagination);
  const totalRow = await context.db
    .prepare("SELECT COUNT(*) AS total FROM customer_interactions WHERE customer_id = ?")
    .bind(customerId)
    .first<CountRow>();

  const result = await context.db
    .prepare(
      `
      SELECT i.id, i.customer_id, i.customer_location_id, i.user_id,
        u.name AS user_name, u.email AS user_email, u.role AS user_role,
        i.interaction_type, i.reason, i.result, i.notes, i.next_action,
        i.follow_up_at, i.created_at, i.updated_at
      FROM customer_interactions i
      JOIN users u ON u.id = i.user_id
      WHERE i.customer_id = ?
      ORDER BY i.created_at DESC, i.id ASC
      LIMIT ? OFFSET ?
    `
    )
    .bind(customerId, normalized.pageSize, normalized.offset)
    .all<InteractionRow>();

  return {
    items: result.results.map(mapInteraction),
    pagination: toPagination(normalized.page, normalized.pageSize, totalRow?.total ?? 0)
  };
}

export async function createCallWorkflow(
  context: DatabaseContext,
  command: CreateCallWorkflowCommand
): Promise<CallWorkflowWriteResult> {
  const duplicate = await getCallWorkflowByIdempotencyKey(context, command.request.idempotencyKey);
  if (duplicate) {
    assertIdempotencyCustomer(duplicate.interaction.customerId, command.customerId);
    return { ...duplicate, duplicate: true };
  }

  const [customer, actor, selectedSalesRep] = await Promise.all([
    context.db
      .prepare("SELECT id, company_name FROM customers WHERE id = ?")
      .bind(command.customerId)
      .first<{ id: string; company_name: string }>(),
    getActiveUser(context, command.actorUserId),
    command.request.salesRepUserId
      ? getActiveUser(context, command.request.salesRepUserId)
      : Promise.resolve(null)
  ]);

  if (!customer) {
    throw new CallWorkflowError("CUSTOMER_NOT_FOUND", "Customer not found.");
  }
  if (!actor) {
    throw new CallWorkflowError("ACTOR_NOT_FOUND", "Configured Customer Service user not found.");
  }
  if (actor.role !== "customer_service" && actor.role !== "admin") {
    throw new CallWorkflowError(
      "ACTOR_ROLE_INVALID",
      "Interaction actor must have Customer Service or administrator access."
    );
  }
  if (command.request.salesRepUserId && selectedSalesRep?.role !== "sales_rep") {
    throw new CallWorkflowError(
      "SALES_REP_NOT_FOUND",
      "Selected Sales Representative is missing, inactive, or has an invalid role."
    );
  }

  const task = buildTaskInsert(command, customer.company_name, selectedSalesRep?.id ?? null);
  const statements: D1PreparedStatement[] = [
    context.db
      .prepare(
        `
        INSERT INTO customer_interactions (
          id, customer_id, customer_location_id, user_id, interaction_type,
          reason, result, notes, next_action, follow_up_at, created_at, updated_at,
          idempotency_key
        ) VALUES (?, ?, NULL, ?, 'CALL', ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .bind(
        command.interactionId,
        command.customerId,
        command.actorUserId,
        command.request.reason,
        command.request.result,
        command.request.notes ?? null,
        command.request.nextAction,
        command.request.followUpAt ?? null,
        command.createdAt,
        command.createdAt,
        command.request.idempotencyKey
      )
  ];

  if (task) {
    statements.push(
      context.db
        .prepare(
          `
          INSERT INTO tasks (
            id, customer_id, customer_location_id, assigned_user_id, created_by_user_id,
            source_interaction_id, title, description, task_type, priority, status,
            due_at, completed_at, created_at, updated_at
          ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'open', ?, NULL, ?, ?)
        `
        )
        .bind(
          command.taskId,
          command.customerId,
          task.assignedUserId,
          command.actorUserId,
          command.interactionId,
          task.title,
          task.description,
          task.taskType,
          task.priority,
          command.request.followUpAt ?? null,
          command.createdAt,
          command.createdAt
        )
    );
  }

  try {
    await context.db.batch(statements);
  } catch (error) {
    const racedDuplicate = await getCallWorkflowByIdempotencyKey(
      context,
      command.request.idempotencyKey
    );
    if (racedDuplicate) {
      assertIdempotencyCustomer(racedDuplicate.interaction.customerId, command.customerId);
      return { ...racedDuplicate, duplicate: true };
    }
    throw error;
  }

  const created = await getCallWorkflowByInteractionId(context, command.interactionId);
  if (!created) {
    throw new Error("Created call workflow could not be loaded.");
  }

  return { ...created, duplicate: false };
}

function assertIdempotencyCustomer(existingCustomerId: string, requestedCustomerId: string) {
  if (existingCustomerId !== requestedCustomerId) {
    throw new CallWorkflowError(
      "IDEMPOTENCY_CONFLICT",
      "Idempotency key has already been used for another customer."
    );
  }
}

async function getCallWorkflowByIdempotencyKey(
  context: DatabaseContext,
  idempotencyKey: string
): Promise<Omit<CallWorkflowWriteResult, "duplicate"> | null> {
  const interaction = await getInteraction(context, "WHERE i.idempotency_key = ?", idempotencyKey);
  if (!interaction) {
    return null;
  }
  return {
    interaction,
    task: await getTaskBySourceInteractionId(context, interaction.id)
  };
}

async function getCallWorkflowByInteractionId(
  context: DatabaseContext,
  interactionId: string
): Promise<Omit<CallWorkflowWriteResult, "duplicate"> | null> {
  const interaction = await getInteraction(context, "WHERE i.id = ?", interactionId);
  if (!interaction) {
    return null;
  }
  return {
    interaction,
    task: await getTaskBySourceInteractionId(context, interaction.id)
  };
}

async function getInteraction(
  context: DatabaseContext,
  whereSql: string,
  value: string
): Promise<CustomerInteraction | null> {
  const row = await context.db
    .prepare(
      `
      SELECT i.id, i.customer_id, i.customer_location_id, i.user_id,
        u.name AS user_name, u.email AS user_email, u.role AS user_role,
        i.interaction_type, i.reason, i.result, i.notes, i.next_action,
        i.follow_up_at, i.created_at, i.updated_at
      FROM customer_interactions i
      JOIN users u ON u.id = i.user_id
      ${whereSql}
    `
    )
    .bind(value)
    .first<InteractionRow>();

  return row ? mapInteraction(row) : null;
}

function buildTaskInsert(
  command: CreateCallWorkflowCommand,
  customerName: string,
  selectedSalesRepId: string | null
) {
  const { request } = command;
  if (request.nextAction === "NONE") {
    return null;
  }

  const isSalesHandoff = request.nextAction === "SALES_VISIT";
  const taskTypeByAction = {
    B2B_REGISTRATION: "follow_up",
    FOLLOW_UP_CALL: "call",
    OTHER: "other",
    SALES_VISIT: "handoff",
    SEND_INFORMATION: "email"
  } as const;
  const titleByAction = {
    B2B_REGISTRATION: `Complete B2B registration for ${customerName}`,
    FOLLOW_UP_CALL: `Follow up with ${customerName}`,
    OTHER: `Follow up with ${customerName}`,
    SALES_VISIT: `Sales visit handoff for ${customerName}`,
    SEND_INFORMATION: `Send information to ${customerName}`
  } as const;
  const priorityByApiValue = {
    CRITICAL: "urgent",
    HIGH: "high",
    LOW: "low",
    MEDIUM: "normal"
  } as const;

  return {
    assignedUserId: isSalesHandoff ? selectedSalesRepId! : command.actorUserId,
    description: [
      `Requested by CRM user ${command.actorUserId}.`,
      `Call reason: ${request.reason}.`,
      `Call result: ${request.result}.`,
      `Expected next action: ${request.nextAction}.`,
      request.notes ? `Context: ${request.notes}` : null
    ]
      .filter(Boolean)
      .join(" "),
    priority: priorityByApiValue[request.priority ?? "MEDIUM"],
    taskType: taskTypeByAction[request.nextAction],
    title: titleByAction[request.nextAction]
  };
}

function mapInteraction(row: InteractionRow): CustomerInteraction {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerLocationId: row.customer_location_id,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      role: row.user_role
    },
    interactionType: row.interaction_type,
    reason: row.reason,
    result: row.result,
    notes: row.notes,
    nextAction: row.next_action,
    followUpAt: row.follow_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
