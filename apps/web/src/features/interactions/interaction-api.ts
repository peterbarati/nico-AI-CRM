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
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`API returned a non-JSON response (${response.status}).`);
  }
  const apiError = getApiError(body);

  if (!response.ok || apiError) {
    throw new Error(apiError ?? `API returned ${response.status}`);
  }

  if (!isSuccessResponse(body)) {
    throw new Error("API returned an unexpected success response.");
  }

  return body as T;
}

function isSuccessResponse(body: unknown): body is { ok: true; data: unknown } {
  return (
    body !== null && typeof body === "object" && "ok" in body && body.ok === true && "data" in body
  );
}

function getApiError(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("ok" in body) || body.ok !== false) {
    return null;
  }
  const error = "error" in body ? body.error : null;
  if (!error || typeof error !== "object") {
    return null;
  }
  const fields =
    "fields" in error && Array.isArray(error.fields)
      ? error.fields
      : "details" in error && Array.isArray(error.details)
        ? error.details
        : [];
  if (fields.length > 0) {
    const detail = fields.find(
      (item): item is { message: string } =>
        Boolean(item) && typeof item === "object" && "message" in item
    );
    if (detail?.message) {
      return detail.message;
    }
  }
  return "message" in error && typeof error.message === "string" ? error.message : null;
}
