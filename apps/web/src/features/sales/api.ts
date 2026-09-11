import type { UserReference } from "../customers/types";
import type {
  SalesTaskDetail,
  SalesTaskFilters,
  SalesTaskPage,
  SalesVisitWriteResult
} from "./types";

export async function fetchSalesTasks(filters: SalesTaskFilters): Promise<SalesTaskPage> {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize)
  });
  for (const key of ["assignedUserId", "status", "priority", "due"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const body = await request<{
    ok: true;
    data: SalesTaskPage["items"];
    pagination: SalesTaskPage["pagination"];
  }>(`/api/sales/tasks?${params}`);
  return { items: body.data, pagination: body.pagination };
}

export async function fetchSalesTaskDetail(taskId: string): Promise<SalesTaskDetail> {
  return (await request<{ ok: true; data: SalesTaskDetail }>(`/api/sales/tasks/${taskId}`)).data;
}

export async function fetchSalesUsers(): Promise<UserReference[]> {
  return (await request<{ ok: true; data: UserReference[] }>("/api/users?role=sales_rep")).data;
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
  return (
    await request<{ ok: true; data: SalesVisitWriteResult }>(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    })
  ).data;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = (await response.json()) as T | { ok: false; error: { message: string } };
  if (!response.ok || !(body as { ok: boolean }).ok)
    throw new Error((body as { error?: { message: string } }).error?.message ?? "Request failed.");
  return body as T;
}
