import type { ActivityReport } from "./types";

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
  const response = await fetch(`/api/reports/activity?${params}`);
  const body = (await response.json()) as
    { ok: true; data: ActivityReport } | { ok: false; error: { message: string } };
  if (!response.ok || !body.ok)
    throw new Error(body.ok ? "Report request failed." : body.error.message);
  return body.data;
}
