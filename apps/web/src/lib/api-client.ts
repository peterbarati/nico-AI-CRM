import type { ApiErrorBody } from "@nico-ai-crm/shared";

export interface ApiSuccessEnvelope<T> {
  ok: true;
  data: T;
  [key: string]: unknown;
}

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly fields?: ApiErrorBody["fields"]
  ) {
    super(fields?.[0]?.message ?? message);
    this.name = "ApiClientError";
  }
}

export async function requestApiData<T>(
  path: string,
  init?: RequestInit,
  validate?: (value: unknown) => value is T
): Promise<T> {
  return (await requestApiEnvelope(path, init, validate)).data;
}

export async function requestApiEnvelope<T>(
  path: string,
  init?: RequestInit,
  validate?: (value: unknown) => value is T
): Promise<ApiSuccessEnvelope<T>> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiClientError(
      "API_UNAVAILABLE",
      "The CRM service is unavailable. Please try again.",
      0
    );
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiClientError(
      response.status >= 500 ? "API_UNAVAILABLE" : "INVALID_API_RESPONSE",
      response.status >= 500
        ? "The CRM service is temporarily unavailable."
        : "The CRM service returned an invalid response.",
      response.status
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiClientError(
      "INVALID_API_RESPONSE",
      "The CRM service returned an invalid response.",
      response.status
    );
  }

  if (isErrorEnvelope(body)) {
    throw new ApiClientError(
      body.error.code,
      body.error.message,
      response.status,
      body.error.fields
    );
  }
  if (!response.ok || !isSuccessEnvelope(body) || (validate && !validate(body.data))) {
    throw new ApiClientError(
      "INVALID_API_RESPONSE",
      "The CRM service returned an invalid response.",
      response.status
    );
  }
  return body as ApiSuccessEnvelope<T>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSuccessEnvelope(value: unknown): value is ApiSuccessEnvelope<unknown> {
  return isObject(value) && value.ok === true && "data" in value;
}

function isErrorEnvelope(value: unknown): value is { ok: false; error: ApiErrorBody } {
  return (
    isObject(value) &&
    value.ok === false &&
    isObject(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string" &&
    (value.error.fields === undefined || Array.isArray(value.error.fields))
  );
}
