export const operationalTaskTypes = [
  "FOLLOW_UP_CALL",
  "SALES_VISIT",
  "CUSTOMER_SERVICE",
  "B2B_REGISTRATION",
  "REACTIVATION",
  "REORDER",
  "CAMPAIGN_FOLLOW_UP",
  "ADMIN",
  "OTHER"
] as const;

export const taskPriorities = ["low", "normal", "high", "urgent"] as const;
export const taskStatuses = ["open", "in_progress", "completed", "cancelled"] as const;
export const taskSourceOrigins = [
  "MANUAL",
  "CALL",
  "SALES_VISIT",
  "CS_TO_SALES_HANDOFF",
  "SALES_TO_CS_HANDOFF",
  "CAMPAIGN",
  "OTHER"
] as const;
export const taskDueStates = ["all", "today", "overdue", "upcoming", "none"] as const;
export const taskSortFields = [
  "operational",
  "due_at",
  "priority",
  "created_at",
  "customer",
  "status"
] as const;

export type OperationalTaskType = (typeof operationalTaskTypes)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskSourceOrigin = (typeof taskSourceOrigins)[number];
export type TaskDueState = (typeof taskDueStates)[number];
export type TaskSortField = (typeof taskSortFields)[number];

export function isOperationalTaskType(value: unknown): value is OperationalTaskType {
  return operationalTaskTypes.includes(value as OperationalTaskType);
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return taskPriorities.includes(value as TaskPriority);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return taskStatuses.includes(value as TaskStatus);
}

export function isTaskDueState(value: unknown): value is TaskDueState {
  return taskDueStates.includes(value as TaskDueState);
}

export function isTaskSortField(value: unknown): value is TaskSortField {
  return taskSortFields.includes(value as TaskSortField);
}

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return (
    (from === "open" && ["in_progress", "completed", "cancelled"].includes(to)) ||
    (from === "in_progress" && ["completed", "cancelled"].includes(to))
  );
}

export function isTaskOverdue(status: TaskStatus, dueAt: string | null, nowUtc: string): boolean {
  return (
    status !== "completed" &&
    status !== "cancelled" &&
    dueAt !== null &&
    new Date(dueAt).getTime() < new Date(nowUtc).getTime()
  );
}
