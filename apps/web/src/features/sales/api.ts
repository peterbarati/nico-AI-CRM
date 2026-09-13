import type { UserReference } from "../customers/types";
import type {
  SalesTaskDetail,
  SalesTaskFilters,
  SalesTaskPage,
  SalesVisitWriteResult
} from "./types";
import { requestApiData, requestApiEnvelope } from "../../lib/api-client";

export async function fetchSalesTasks(filters: SalesTaskFilters): Promise<SalesTaskPage> {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize)
  });
  for (const key of ["assignedUserId", "status", "priority", "due"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const body = await requestApiEnvelope<SalesTaskPage["items"]>(`/api/sales/tasks?${params}`);
  return { items: body.data, pagination: body.pagination as SalesTaskPage["pagination"] };
}

export async function fetchSalesTaskDetail(taskId: string): Promise<SalesTaskDetail> {
  return requestApiData(`/api/sales/tasks/${taskId}`);
}

export async function fetchSalesUsers(): Promise<UserReference[]> {
  return requestApiData("/api/users?role=sales_rep");
}

export async function scheduleVisit(taskId: string, input: unknown) {
  return post(`/api/sales/tasks/${taskId}/visits`, input);
}
export async function startVisit(visitId: string) {
  return post(`/api/sales/visits/${visitId}/start`, {});
}
export async function completeVisit(visitId: string, input: unknown) {
  return post(`/api/sales/visits/${visitId}/complete`, input);
}

async function post(path: string, input: unknown): Promise<SalesVisitWriteResult> {
  return requestApiData(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
}
