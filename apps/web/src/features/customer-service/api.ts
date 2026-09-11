import type { CustomerServiceQueueResponse } from "./types";

export async function fetchCustomerServiceQueue(): Promise<CustomerServiceQueueResponse["data"]> {
  const response = await fetch("/api/customer-service/queue");
  const body = (await response.json()) as unknown;
  const apiError = getApiError(body);

  if (!response.ok || apiError) {
    throw new Error(apiError ?? `API returned ${response.status}`);
  }

  return (body as CustomerServiceQueueResponse).data;
}

function getApiError(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("ok" in body) || body.ok !== false) {
    return null;
  }

  const error = "error" in body ? body.error : null;
  if (!error || typeof error !== "object" || !("message" in error)) {
    return null;
  }

  return typeof error.message === "string" ? error.message : null;
}
