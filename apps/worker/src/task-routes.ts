import type { AuthenticatedActor } from "@nico-ai-crm/auth";
import {
  createOperationalTask,
  getActiveUser,
  getSystemConfigValue,
  getTaskById,
  getTaskDetail,
  isCustomerAssignedToUser,
  listOperationalTasks,
  TaskWriteError,
  transitionOperationalTask,
  updateOperationalTask,
  type DatabaseContext,
  type TaskItem,
  type TaskListQuery
} from "@nico-ai-crm/db";
import {
  getBusinessDateRange,
  isOperationalTaskType,
  isTaskDueState,
  isTaskPriority,
  isTaskSortField,
  isTaskStatus,
  type ApiErrorResponse,
  type ApiSuccess,
  type OperationalTaskType,
  type TaskPriority
} from "@nico-ai-crm/shared";

const headers = { "content-type": "application/json; charset=utf-8" };

export async function handleTaskRoute(
  request: Request,
  context: DatabaseContext,
  actor: AuthenticatedActor,
  url: URL
): Promise<Response | null> {
  if (url.pathname === "/api/tasks" && request.method === "GET") {
    const now = new Date();
    const timezone =
      (await getSystemConfigValue(context, "system.business_timezone")) ?? "Europe/Bratislava";
    const range = getBusinessDateRange("today", now, timezone);
    const assignedUserId =
      actor.role === "customer_service" || actor.role === "sales_rep"
        ? actor.id
        : url.searchParams.get("scope") === "mine"
          ? actor.id
          : (url.searchParams.get("assignedUserId") ?? undefined);
    const query = parseListQuery(url, now.toISOString(), range.fromUtc, range.toUtcExclusive);
    if (query instanceof Response) return query;
    const result = await listOperationalTasks(context, { ...query, assignedUserId });
    return json({ ok: true, data: result.items, pagination: result.pagination });
  }

  if (url.pathname === "/api/tasks" && request.method === "POST") {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const parsed = parseCreateBody(body);
    if (parsed instanceof Response) return parsed;
    const scopeError = await validateAssignmentScope(
      context,
      actor,
      parsed.assignedUserId,
      parsed.customerId
    );
    if (scopeError) return scopeError;
    try {
      const now = new Date().toISOString();
      const task = await createOperationalTask(context, {
        ...parsed,
        id: crypto.randomUUID(),
        actorUserId: actor.id,
        createdAt: now,
        eventId: crypto.randomUUID()
      });
      return json<ApiSuccess<TaskItem>>({ ok: true, data: task }, { status: 201 });
    } catch (error) {
      return taskError(error);
    }
  }

  const detailMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (detailMatch && request.method === "GET") {
    const taskId = decodeURIComponent(detailMatch[1]);
    const detail = await getTaskDetail(context, taskId, new Date().toISOString());
    if (!detail) return error(404, "TASK_NOT_FOUND", "Task not found.");
    const scopeError = await validateTaskAccess(context, actor, detail.task);
    return scopeError ?? json({ ok: true, data: detail });
  }

  if (detailMatch && request.method === "PATCH") {
    const taskId = decodeURIComponent(detailMatch[1]);
    const existing = await getTaskById(context, taskId);
    if (!existing) return error(404, "TASK_NOT_FOUND", "Task not found.");
    const accessError = await validateTaskMutationAccess(context, actor, existing);
    if (accessError) return accessError;
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const parsed = parseUpdateBody(body);
    if (parsed instanceof Response) return parsed;
    const targetAssignee = parsed.assignedUserId ?? existing.assignedUser.id;
    const scopeError = await validateAssignmentScope(
      context,
      actor,
      targetAssignee,
      existing.customerId
    );
    if (scopeError) return scopeError;
    try {
      return json({
        ok: true,
        data: await updateOperationalTask(context, {
          ...parsed,
          taskId,
          actorUserId: actor.id,
          updatedAt: new Date().toISOString(),
          eventId: crypto.randomUUID()
        })
      });
    } catch (error) {
      return taskError(error);
    }
  }

  const actionMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/(start|complete|cancel)$/);
  if (actionMatch && request.method === "POST") {
    const taskId = decodeURIComponent(actionMatch[1]);
    const existing = await getTaskById(context, taskId);
    if (!existing) return error(404, "TASK_NOT_FOUND", "Task not found.");
    const accessError = await validateTaskMutationAccess(context, actor, existing);
    if (accessError) return accessError;
    const status =
      actionMatch[2] === "start"
        ? "in_progress"
        : actionMatch[2] === "complete"
          ? "completed"
          : "cancelled";
    try {
      return json({
        ok: true,
        data: await transitionOperationalTask(context, {
          taskId,
          actorUserId: actor.id,
          status,
          updatedAt: new Date().toISOString(),
          eventId: crypto.randomUUID()
        })
      });
    } catch (error) {
      return taskError(error);
    }
  }

  if (url.pathname === "/api/tasks" || url.pathname.startsWith("/api/tasks/")) {
    return error(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }
  return null;
}

function parseListQuery(
  url: URL,
  nowUtc: string,
  fromUtc: string,
  toUtc: string
): TaskListQuery | Response {
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const taskType = url.searchParams.get("taskType");
  const assignedRole = url.searchParams.get("assignedRole");
  const due = url.searchParams.get("due") ?? "all";
  const sort = url.searchParams.get("sort") ?? "operational";
  const direction = url.searchParams.get("direction") ?? "asc";
  if (status && !isTaskStatus(status)) return invalid("status", "Invalid task status.");
  if (priority && !isTaskPriority(priority)) return invalid("priority", "Invalid task priority.");
  if (taskType && !isOperationalTaskType(taskType))
    return invalid("taskType", "Invalid task type.");
  if (assignedRole && !isTaskAssigneeRole(assignedRole))
    return invalid("assignedRole", "Invalid assigned team.");
  if (!isTaskDueState(due)) return invalid("due", "Invalid due filter.");
  if (!isTaskSortField(sort)) return invalid("sort", "Invalid sort field.");
  if (direction !== "asc" && direction !== "desc")
    return invalid("direction", "Invalid sort direction.");
  return {
    page: positiveInt(url.searchParams.get("page")),
    pageSize: positiveInt(url.searchParams.get("pageSize")),
    search: url.searchParams.get("search") ?? undefined,
    status: status && isTaskStatus(status) ? status : undefined,
    priority: priority && isTaskPriority(priority) ? priority : undefined,
    taskType: taskType && isOperationalTaskType(taskType) ? taskType : undefined,
    assignedRole: assignedRole && isTaskAssigneeRole(assignedRole) ? assignedRole : undefined,
    customerId: url.searchParams.get("customerId") ?? undefined,
    due,
    sort,
    direction,
    nowUtc,
    businessDayFromUtc: fromUtc,
    businessDayToUtc: toUtc
  };
}

function isTaskAssigneeRole(
  value: string
): value is "admin" | "manager" | "customer_service" | "sales_rep" {
  return ["admin", "manager", "customer_service", "sales_rep"].includes(value);
}

function parseCreateBody(body: Record<string, unknown>) {
  const common = parseCommonBody(body, true);
  if (common instanceof Response) return common;
  if (typeof body.assignedUserId !== "string" || !body.assignedUserId.trim()) {
    return invalid("assignedUserId", "Assigned user is required.");
  }
  return {
    ...common,
    assignedUserId: body.assignedUserId.trim(),
    customerId: optionalId(body.customerId),
    customerLocationId: optionalId(body.customerLocationId)
  };
}

function parseUpdateBody(body: Record<string, unknown>) {
  const result: {
    assignedUserId?: string;
    title?: string;
    description?: string | null;
    operationalType?: OperationalTaskType;
    priority?: TaskPriority;
    dueAt?: string | null;
  } = {};
  if ("assignedUserId" in body) {
    if (typeof body.assignedUserId !== "string" || !body.assignedUserId.trim())
      return invalid("assignedUserId", "Assigned user is required.");
    result.assignedUserId = body.assignedUserId.trim();
  }
  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 160)
      return invalid("title", "Title must contain 1 to 160 characters.");
    result.title = body.title.trim();
  }
  if ("description" in body) {
    if (body.description !== null && typeof body.description !== "string")
      return invalid("description", "Description must be text.");
    const description = typeof body.description === "string" ? body.description.trim() : null;
    if (description && description.length > 2000)
      return invalid("description", "Description cannot exceed 2000 characters.");
    result.description = description || null;
  }
  if ("operationalType" in body) {
    if (!isOperationalTaskType(body.operationalType))
      return invalid("operationalType", "Invalid task type.");
    result.operationalType = body.operationalType;
  }
  if ("priority" in body) {
    if (!isTaskPriority(body.priority)) return invalid("priority", "Invalid task priority.");
    result.priority = body.priority;
  }
  if ("dueAt" in body) {
    const due = parseDueAt(body.dueAt);
    if (due instanceof Response) return due;
    result.dueAt = due;
  }
  if (!Object.keys(result).length)
    return invalid("body", "At least one editable field is required.");
  return result;
}

function parseCommonBody(body: Record<string, unknown>, requireAll: boolean) {
  if (
    requireAll &&
    (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 160)
  )
    return invalid("title", "Title must contain 1 to 160 characters.");
  if (!isOperationalTaskType(body.operationalType))
    return invalid("operationalType", "Invalid task type.");
  if (!isTaskPriority(body.priority)) return invalid("priority", "Invalid task priority.");
  if (
    body.description !== undefined &&
    body.description !== null &&
    typeof body.description !== "string"
  )
    return invalid("description", "Description must be text.");
  const description = typeof body.description === "string" ? body.description.trim() : null;
  if (description && description.length > 2000)
    return invalid("description", "Description cannot exceed 2000 characters.");
  const dueAt = parseDueAt(body.dueAt);
  if (dueAt instanceof Response) return dueAt;
  return {
    title: String(body.title).trim(),
    description: description || null,
    operationalType: body.operationalType,
    priority: body.priority,
    dueAt
  };
}

function parseDueAt(value: unknown): string | null | Response {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(new Date(value).getTime()))
    return invalid("dueAt", "Due date is invalid.");
  return new Date(value).toISOString();
}

async function validateAssignmentScope(
  context: DatabaseContext,
  actor: AuthenticatedActor,
  assignedUserId: string,
  customerId: string | null
): Promise<Response | null> {
  const assignee = await getActiveUser(context, assignedUserId);
  if (!assignee) return error(400, "ASSIGNEE_INVALID", "Assigned user is missing or inactive.");
  if (actor.role === "sales_rep") {
    if (assignedUserId !== actor.id)
      return error(403, "FORBIDDEN", "Sales representatives can only assign tasks to themselves.");
    if (customerId && !(await isCustomerAssignedToUser(context, customerId, actor.id)))
      return error(403, "FORBIDDEN", "You do not have access to this customer.");
  }
  if (actor.role === "customer_service" && assignee.role !== "customer_service") {
    return error(403, "FORBIDDEN", "Customer Service can only assign tasks within its team.");
  }
  return null;
}

async function validateTaskAccess(
  context: DatabaseContext,
  actor: AuthenticatedActor,
  task: TaskItem
) {
  if (actor.role === "admin" || actor.role === "manager") return null;
  if (task.assignedUser.id !== actor.id)
    return error(403, "FORBIDDEN", "You do not have access to this task.");
  if (
    actor.role === "sales_rep" &&
    task.customerId &&
    !(await isCustomerAssignedToUser(context, task.customerId, actor.id))
  ) {
    return error(403, "FORBIDDEN", "You do not have access to this task customer.");
  }
  return null;
}

async function validateTaskMutationAccess(
  context: DatabaseContext,
  actor: AuthenticatedActor,
  task: TaskItem
) {
  return validateTaskAccess(context, actor, task);
}

function optionalId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body))
      return invalid("body", "Request body must be an object.");
    return body as Record<string, unknown>;
  } catch {
    return error(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }
}

function positiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function taskError(reason: unknown): Response {
  if (!(reason instanceof TaskWriteError)) throw reason;
  const status =
    reason.code === "TASK_NOT_FOUND" ? 404 : reason.code === "TASK_STATE_INVALID" ? 409 : 400;
  return error(status, reason.code, reason.message);
}

function invalid(field: string, message: string): Response {
  return json<ApiErrorResponse>(
    {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        fields: [{ field, message }]
      }
    },
    { status: 400 }
  );
}

function error(status: number, code: string, message: string): Response {
  return json<ApiErrorResponse>({ ok: false, error: { code, message } }, { status });
}

function json<T>(body: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), { ...init, headers: { ...headers, ...init?.headers } });
}
