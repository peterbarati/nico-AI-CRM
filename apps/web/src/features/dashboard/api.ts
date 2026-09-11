import type { DashboardFilters, ManagementDashboard } from "./types";

interface DashboardResponse {
  ok: boolean;
  data?: ManagementDashboard;
  error?: { message?: string };
}

export async function fetchManagementDashboard(
  filters: DashboardFilters
): Promise<ManagementDashboard> {
  const params = new URLSearchParams({ period: filters.period });
  if (filters.period === "custom") {
    params.set("from", filters.from);
    params.set("to", filters.to);
  }
  if (filters.role) params.set("role", filters.role);
  if (filters.userId) params.set("userId", filters.userId);
  const response = await fetch(`/api/dashboard?${params}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Dashboard API returned a non-JSON response (${response.status}).`);
  }
  const body = (await response.json()) as DashboardResponse;
  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? `Dashboard API request failed (${response.status}).`);
  }
  if (!body.data?.dashboard || !Array.isArray(body.data.users)) {
    throw new Error("Dashboard API returned an unexpected success response.");
  }
  return body.data;
}
