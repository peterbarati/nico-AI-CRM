import type { SalesHandoffTask } from "./types";

export async function fetchSalesHandoffTasks(): Promise<SalesHandoffTask[]> {
  const response = await fetch("/api/sales/tasks");
  const body = (await response.json()) as
    { ok: true; data: SalesHandoffTask[] } | { ok: false; error: { message: string } };

  if (!response.ok || !body.ok) {
    throw new Error(body.ok ? `API returned ${response.status}` : body.error.message);
  }
  return body.data;
}
