import { requestApiData, requestApiEnvelope } from "../../lib/api-client";
import type {
  OpportunityFilters,
  OpportunityItem,
  Page,
  SalesRoute,
  SalesRouteDetail
} from "./types";

export async function fetchOpportunities(
  filters: OpportunityFilters
): Promise<Page<OpportunityItem>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize)
  });
  for (const key of ["salesRepId", "type", "status", "minimumScore", "hasCoordinates"] as const) {
    if (filters[key]) query.set(key, filters[key]);
  }
  const envelope = await requestApiEnvelope<OpportunityItem[]>(`/api/sales/opportunities?${query}`);
  return {
    items: envelope.data,
    pagination: envelope.pagination as Page<OpportunityItem>["pagination"]
  };
}

export function generateOpportunities(salesRepId: string) {
  return post<{ items: OpportunityItem[]; created: number; refreshed: number }>(
    "/api/sales/opportunities/generate",
    { salesRepId }
  );
}
export function transitionOpportunity(id: string, action: "accept" | "dismiss") {
  return post(`/api/sales/opportunities/${id}/${action}`, {});
}
export async function fetchRoutes(salesRepId = ""): Promise<Page<SalesRoute>> {
  const query = new URLSearchParams({ page: "1", pageSize: "50" });
  if (salesRepId) query.set("salesRepId", salesRepId);
  const envelope = await requestApiEnvelope<SalesRoute[]>(`/api/sales/routes?${query}`);
  return {
    items: envelope.data,
    pagination: envelope.pagination as Page<SalesRoute>["pagination"]
  };
}
export function generateRoute(salesRepId: string, routeDate: string) {
  return post<{ route: SalesRouteDetail; replaced: boolean }>("/api/sales/routes/generate", {
    salesRepId,
    routeDate
  });
}
export function fetchRoute(id: string) {
  return requestApiData<SalesRouteDetail>(`/api/sales/routes/${id}`);
}
export function updateRoute(id: string, opportunityIds: string[]) {
  return requestApiData<SalesRouteDetail>(
    `/api/sales/routes/${id}`,
    json("PATCH", { opportunityIds })
  );
}
export function transitionRoute(
  id: string,
  action: "accept" | "start" | "complete" | "cancel" | "recalculate"
) {
  return post(`/api/sales/routes/${id}/${action}`, {});
}
export function planRouteVisit(routeId: string, stopId: string) {
  return post(`/api/sales/routes/${routeId}/stops/${stopId}/visits`, {});
}

async function post<T = unknown>(path: string, body: unknown): Promise<T> {
  return requestApiData<T>(path, json("POST", body));
}
function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
