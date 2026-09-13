import type { CustomerAssistantData } from "./types";
import { requestApiData } from "../../lib/api-client";

export async function prepareCustomerAssistant(customerId: string): Promise<CustomerAssistantData> {
  return requestApiData("/api/ai/customer-assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerId, purpose: "CALL_PREPARATION" })
  });
}
