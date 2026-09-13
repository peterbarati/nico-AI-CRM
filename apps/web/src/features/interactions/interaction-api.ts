import type {
  CallWorkflowResponse,
  CreateCallRequest,
  SalesRepresentative
} from "./interaction-types";
import { requestApiData } from "../../lib/api-client";

export async function createCustomerCall(
  customerId: string,
  request: CreateCallRequest
): Promise<CallWorkflowResponse["data"]> {
  return requestApiData<CallWorkflowResponse["data"]>(
    `/api/customers/${encodeURIComponent(customerId)}/interactions`,
    {
      body: JSON.stringify(request),
      headers: { "content-type": "application/json" },
      method: "POST"
    }
  );
}

export async function fetchSalesRepresentatives(): Promise<SalesRepresentative[]> {
  return requestApiData("/api/users?role=sales_rep");
}
