import type {
  OperationalTaskType,
  TaskDueState,
  TaskPriority,
  TaskSortField,
  TaskSourceOrigin,
  TaskStatus
} from "@nico-ai-crm/shared";
import type { PaginationInput, SortDirection, UserReference } from "../types";

export interface TaskSourceContext {
  campaign: { id: string; name: string; status: string } | null;
  interaction: {
    id: string;
    reason: string | null;
    result: string | null;
    notes: string | null;
    nextAction: string | null;
    createdAt: string;
  } | null;
  visit: {
    id: string;
    result: string | null;
    notes: string | null;
    orderValue: number | null;
    nextAction: string | null;
    completedAt: string | null;
  } | null;
}

export interface TaskItem {
  id: string;
  customerId: string | null;
  customerLocationId: string | null;
  customerName: string | null;
  customerCity: string | null;
  locationName: string | null;
  assignedUser: UserReference;
  createdByUser: UserReference | null;
  sourceInteractionId: string | null;
  sourceVisitId: string | null;
  sourceCampaignId: string | null;
  sourceOrigin: TaskSourceOrigin;
  sourceContext: TaskSourceContext;
  title: string;
  description: string | null;
  taskType: string;
  operationalType: OperationalTaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  overdue: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  actor: UserReference;
  eventType:
    "CREATED" | "STARTED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "REASSIGNED" | "UPDATED";
  previousStatus: TaskStatus | null;
  newStatus: TaskStatus | null;
  previousDueAt: string | null;
  newDueAt: string | null;
  previousAssignedUserId: string | null;
  newAssignedUserId: string | null;
  createdAt: string;
}

export interface TaskDetail {
  task: TaskItem;
  events: TaskEvent[];
}

export interface TaskListQuery extends PaginationInput {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedUserId?: string;
  assignedRole?: "admin" | "manager" | "customer_service" | "sales_rep";
  taskType?: OperationalTaskType;
  customerId?: string;
  due?: TaskDueState;
  sort?: TaskSortField;
  direction?: SortDirection;
  nowUtc: string;
  businessDayFromUtc: string;
  businessDayToUtc: string;
}

export interface CreateTaskCommand {
  id: string;
  actorUserId: string;
  assignedUserId: string;
  customerId: string | null;
  customerLocationId: string | null;
  title: string;
  description: string | null;
  operationalType: OperationalTaskType;
  priority: TaskPriority;
  dueAt: string | null;
  createdAt: string;
  eventId: string;
}

export interface UpdateTaskCommand {
  taskId: string;
  actorUserId: string;
  assignedUserId?: string;
  title?: string;
  description?: string | null;
  operationalType?: OperationalTaskType;
  priority?: TaskPriority;
  dueAt?: string | null;
  updatedAt: string;
  eventId: string;
}

export interface TransitionTaskCommand {
  taskId: string;
  actorUserId: string;
  status: Exclude<TaskStatus, "open">;
  updatedAt: string;
  eventId: string;
}

export type TaskWriteErrorCode =
  | "TASK_NOT_FOUND"
  | "TASK_STATE_INVALID"
  | "CUSTOMER_NOT_FOUND"
  | "LOCATION_INVALID"
  | "ASSIGNEE_INVALID";

export class TaskWriteError extends Error {
  constructor(
    public readonly code: TaskWriteErrorCode,
    message: string
  ) {
    super(message);
    this.name = "TaskWriteError";
  }
}

export interface TaskRow {
  id: string;
  customer_id: string | null;
  customer_location_id: string | null;
  customer_name: string | null;
  customer_city: string | null;
  location_name: string | null;
  assigned_user_id: string;
  assigned_user_name: string;
  assigned_user_email: string;
  assigned_user_role: string;
  created_by_user_id: string | null;
  created_by_user_name: string | null;
  created_by_user_email: string | null;
  created_by_user_role: string | null;
  source_interaction_id: string | null;
  source_visit_id: string | null;
  source_campaign_id: string | null;
  source_campaign_name: string | null;
  source_campaign_status: string | null;
  source_origin: TaskSourceOrigin;
  interaction_reason: string | null;
  interaction_result: string | null;
  interaction_notes: string | null;
  interaction_next_action: string | null;
  interaction_created_at: string | null;
  visit_result: string | null;
  visit_notes: string | null;
  visit_order_value: number | null;
  visit_next_action: string | null;
  visit_completed_at: string | null;
  title: string;
  description: string | null;
  task_type: string;
  operational_type: OperationalTaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskEventRow {
  id: string;
  task_id: string;
  actor_user_id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  event_type: TaskEvent["eventType"];
  previous_status: TaskStatus | null;
  new_status: TaskStatus | null;
  previous_due_at: string | null;
  new_due_at: string | null;
  previous_assigned_user_id: string | null;
  new_assigned_user_id: string | null;
  created_at: string;
}
