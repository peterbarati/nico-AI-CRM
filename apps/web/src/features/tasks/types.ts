import type {
  OperationalTaskType,
  TaskDueState,
  TaskPriority,
  TaskSortField,
  TaskSourceOrigin,
  TaskStatus
} from "@nico-ai-crm/shared";
import type { ApiPagination, UserReference } from "../customers/types";

export interface OperationalTask {
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
  sourceOrigin: TaskSourceOrigin;
  sourceContext: {
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
  };
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
  actor: UserReference;
  eventType: string;
  previousStatus: TaskStatus | null;
  newStatus: TaskStatus | null;
  previousDueAt: string | null;
  newDueAt: string | null;
  createdAt: string;
}

export interface TaskDetail {
  task: OperationalTask;
  events: TaskEvent[];
}

export interface TaskFilters {
  page: number;
  pageSize: number;
  scope: "mine" | "all";
  search: string;
  status: "" | TaskStatus;
  priority: "" | TaskPriority;
  assignedUserId: string;
  assignedRole: "" | "admin" | "manager" | "customer_service" | "sales_rep";
  taskType: "" | OperationalTaskType;
  customerId: string;
  due: TaskDueState;
  sort: TaskSortField;
  direction: "asc" | "desc";
}

export interface TaskListResult {
  items: OperationalTask[];
  pagination: ApiPagination;
}

export interface TaskWriteValues {
  assignedUserId: string;
  customerId: string | null;
  customerLocationId: string | null;
  title: string;
  description: string | null;
  operationalType: OperationalTaskType;
  priority: TaskPriority;
  dueAt: string | null;
}
