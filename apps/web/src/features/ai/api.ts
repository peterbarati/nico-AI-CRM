import type { CustomerAssistantData } from "./types";

export async function prepareCustomerAssistant(customerId: string): Promise<CustomerAssistantData> {
  const response = await fetch("/api/ai/customer-assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerId, purpose: "CALL_PREPARATION" })
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json"))
    throw new Error("Commercial assistant returned a non-JSON response.");
  const body = (await response.json()) as {
    ok?: boolean;
    data?: CustomerAssistantData;
    error?: { message?: string };
  };
  if (!response.ok || body.ok !== true || !body.data)
    throw new Error(body.error?.message ?? "Commercial assistant is temporarily unavailable.");
  return body.data;
}
