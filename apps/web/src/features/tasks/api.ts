import { ApiClientError, requestApiData, requestApiEnvelope } from "../../lib/api-client";
import type {
  OperationalTask,
  TaskDetail,
  TaskFilters,
  TaskListResult,
  TaskWriteValues
} from "./types";
import type { CustomerListItem, UserReference } from "../customers/types";

export async function fetchTasks(filters: TaskFilters): Promise<TaskListResult> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    scope: filters.scope,
    due: filters.due,
    sort: filters.sort,
    direction: filters.direction
  });
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.status) query.set("status", filters.status);
  if (filters.priority) query.set("priority", filters.priority);
  if (filters.assignedUserId) query.set("assignedUserId", filters.assignedUserId);
  if (filters.assignedRole) query.set("assignedRole", filters.assignedRole);
  if (filters.taskType) query.set("taskType", filters.taskType);
  if (filters.customerId) query.set("customerId", filters.customerId);
  const response = await requestApiEnvelope<OperationalTask[]>(`/api/tasks?${query}`);
  if (!isPagination(response.pagination))
    throw new ApiClientError("INVALID_API_RESPONSE", "Invalid task pagination.", 500);
  return { items: response.data, pagination: response.pagination };
}

export function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
  return requestApiData(`/api/tasks/${encodeURIComponent(taskId)}`);
}

export function createTask(values: TaskWriteValues): Promise<OperationalTask> {
  return requestApiData("/api/tasks", json("POST", values));
}

export function updateTask(
  taskId: string,
  values: Partial<Omit<TaskWriteValues, "customerId" | "customerLocationId">>
): Promise<OperationalTask> {
  return requestApiData(`/api/tasks/${encodeURIComponent(taskId)}`, json("PATCH", values));
}

export function transitionTask(
  taskId: string,
  action: "start" | "complete" | "cancel"
): Promise<{ task: OperationalTask; duplicate: boolean }> {
  return requestApiData(`/api/tasks/${encodeURIComponent(taskId)}/${action}`, { method: "POST" });
}

export async function fetchAssignableUsers(): Promise<UserReference[]> {
  return requestApiData<UserReference[]>("/api/users");
}

export async function fetchTaskCustomers(): Promise<CustomerListItem[]> {
  const response = await requestApiEnvelope<CustomerListItem[]>(
    "/api/customers?page=1&pageSize=100&sort=company_name&direction=asc"
  );
  return response.data;
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

function isPagination(value: unknown): value is TaskListResult["pagination"] {
  return (
    typeof value === "object" &&
    value !== null &&
    ["page", "pageSize", "total", "totalPages"].every(
      (key) => typeof value[key as keyof typeof value] === "number"
    )
  );
}
