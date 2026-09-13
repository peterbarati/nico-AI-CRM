import type { CustomerServiceQueueResponse } from "./types";
import { requestApiData } from "../../lib/api-client";

export async function fetchCustomerServiceQueue(): Promise<CustomerServiceQueueResponse["data"]> {
  return requestApiData("/api/customer-service/queue", undefined, isQueueData);
}

function isQueueData(value: unknown): value is CustomerServiceQueueResponse["data"] {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray(value.items) &&
    "summary" in value &&
    typeof value.summary === "object" &&
    value.summary !== null &&
    "meta" in value &&
    typeof value.meta === "object" &&
    value.meta !== null
  );
}
