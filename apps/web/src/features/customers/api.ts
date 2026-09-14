import type {
  CustomerFilterOptions,
  CustomerCampaignHistory,
  CustomerInteraction,
  CustomerListFilters,
  CustomerListItem,
  CustomerOverview,
  OrderSummary,
  PaginatedResponse,
  SalesVisit,
  SegmentOption,
  TaskItem
} from "./types";
import { requestApiData, requestApiEnvelope } from "../../lib/api-client";

export const defaultCustomerFilters: CustomerListFilters = {
  active: "all",
  assignedSalesRepId: "",
  b2bStatus: "",
  direction: "asc",
  page: 1,
  pageSize: 10,
  search: "",
  segmentCode: "",
  sort: "company_name"
};

export function buildCustomerSearchParams(filters: CustomerListFilters): URLSearchParams {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    sort: filters.sort,
    direction: filters.direction
  });

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.active !== "all") {
    params.set("active", filters.active);
  }

  if (filters.assignedSalesRepId) {
    params.set("assignedSalesRepId", filters.assignedSalesRepId);
  }

  if (filters.b2bStatus) {
    params.set("b2bStatus", filters.b2bStatus);
  }

  if (filters.segmentCode) {
    params.set("segmentCode", filters.segmentCode);
  }

  return params;
}

export async function fetchCustomers(
  filters: CustomerListFilters
): Promise<PaginatedResponse<CustomerListItem>> {
  return fetchPage(`/api/customers?${buildCustomerSearchParams(filters).toString()}`);
}

export async function fetchCustomerFilterOptions(): Promise<CustomerFilterOptions> {
  const [filters, segments] = await Promise.all([
    requestApiData<Omit<CustomerFilterOptions, "segments">>("/api/customers/filters"),
    requestApiData<SegmentOption[]>("/api/segments")
  ]);

  return {
    ...filters,
    segments
  };
}

export async function fetchCustomerOverview(customerId: string): Promise<CustomerOverview> {
  return requestApiData(`/api/customers/${customerId}`);
}

export async function fetchCustomerOrders(
  customerId: string
): Promise<PaginatedResponse<OrderSummary>> {
  return fetchPage(`/api/customers/${customerId}/orders?pageSize=10`);
}

export async function fetchCustomerInteractions(
  customerId: string
): Promise<PaginatedResponse<CustomerInteraction>> {
  return fetchPage(`/api/customers/${customerId}/interactions?pageSize=10`);
}

export async function fetchCustomerTasks(customerId: string): Promise<PaginatedResponse<TaskItem>> {
  return fetchPage(`/api/customers/${customerId}/tasks?pageSize=10`);
}

export async function fetchCustomerVisits(
  customerId: string
): Promise<PaginatedResponse<SalesVisit>> {
  return fetchPage(`/api/customers/${customerId}/visits?pageSize=10`);
}

export function fetchCustomerCampaigns(customerId: string): Promise<CustomerCampaignHistory[]> {
  return requestApiData(`/api/customers/${customerId}/campaigns`);
}

async function fetchPage<T>(url: string): Promise<PaginatedResponse<T>> {
  const response = await requestApiEnvelope<T[]>(url);
  const pagination = response.pagination;
  if (!isPagination(pagination)) throw new Error("The CRM service returned an invalid response.");
  return { ok: true, data: response.data, pagination };
}

function isPagination(value: unknown): value is PaginatedResponse<unknown>["pagination"] {
  return (
    typeof value === "object" &&
    value !== null &&
    ["page", "pageSize", "total", "totalPages"].every(
      (key) => key in value && typeof value[key as keyof typeof value] === "number"
    )
  );
}
