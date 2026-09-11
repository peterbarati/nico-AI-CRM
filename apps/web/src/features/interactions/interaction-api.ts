import type {
  CallWorkflowResponse,
  CreateCallRequest,
  SalesRepresentative
} from "./interaction-types";

export async function createCustomerCall(
  customerId: string,
  request: CreateCallRequest
): Promise<CallWorkflowResponse["data"]> {
  return fetchJson<CallWorkflowResponse>(
    `/api/customers/${encodeURIComponent(customerId)}/interactions`,
    {
      body: JSON.stringify(request),
      headers: { "content-type": "application/json" },
      method: "POST"
    }
  ).then((response) => response.data);
}

export async function fetchSalesRepresentatives(): Promise<SalesRepresentative[]> {
  const response = await fetchJson<{ ok: true; data: SalesRepresentative[] }>(
    "/api/users?role=sales_rep"
  );
  return response.data;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as unknown;
  const apiError = getApiError(body);

  if (!response.ok || apiError) {
    throw new Error(apiError ?? `API returned ${response.status}`);
  }

  return body as T;
}

function getApiError(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("ok" in body) || body.ok !== false) {
    return null;
  }
  const error = "error" in body ? body.error : null;
  if (!error || typeof error !== "object") {
    return null;
  }
  if ("details" in error && Array.isArray(error.details)) {
    const detail = error.details.find(
      (item): item is { message: string } =>
        Boolean(item) && typeof item === "object" && "message" in item
    );
    if (detail?.message) {
      return detail.message;
    }
  }
  return "message" in error && typeof error.message === "string" ? error.message : null;
}
