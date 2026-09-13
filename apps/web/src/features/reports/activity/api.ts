import type { ActivityReport } from "./types";
import { requestApiData } from "../../../lib/api-client";

export async function fetchActivityReport(filters: {
  period: string;
  from: string;
  to: string;
  role: string;
  userId: string;
}): Promise<ActivityReport> {
  const params = new URLSearchParams({ period: filters.period });
  for (const key of ["from", "to", "role", "userId"] as const)
    if (filters[key]) params.set(key, filters[key]);
  return requestApiData(`/api/reports/activity?${params}`);
}
