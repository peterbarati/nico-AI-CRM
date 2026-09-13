import type { DashboardFilters, ManagementDashboard } from "./types";
import { requestApiData } from "../../lib/api-client";

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
  return requestApiData(`/api/dashboard?${params}`, undefined, isManagementDashboard);
}

function isManagementDashboard(value: unknown): value is ManagementDashboard {
  return (
    typeof value === "object" &&
    value !== null &&
    "dashboard" in value &&
    typeof value.dashboard === "object" &&
    value.dashboard !== null &&
    "users" in value &&
    Array.isArray(value.users) &&
    "roles" in value &&
    Array.isArray(value.roles)
  );
}
