import type {
  CustomerFilterOptions,
  CustomerInteraction,
  CustomerListFilters,
  CustomerListItem,
  CustomerOverview,
  DataResponse,
  OrderSummary,
  PaginatedResponse,
  SalesVisit,
  SegmentOption,
  TaskItem
} from "./types";

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
  return fetchJson(`/api/customers?${buildCustomerSearchParams(filters).toString()}`);
}

export async function fetchCustomerFilterOptions(): Promise<CustomerFilterOptions> {
  const [filters, segments] = await Promise.all([
    fetchJson<DataResponse<Omit<CustomerFilterOptions, "segments">>>("/api/customers/filters"),
    fetchJson<DataResponse<SegmentOption[]>>("/api/segments")
  ]);

  return {
    ...filters.data,
    segments: segments.data
  };
}

export async function fetchCustomerOverview(customerId: string): Promise<CustomerOverview> {
  const response = await fetchJson<DataResponse<CustomerOverview>>(`/api/customers/${customerId}`);
  return response.data;
}

export async function fetchCustomerOrders(
  customerId: string
): Promise<PaginatedResponse<OrderSummary>> {
  return fetchJson(`/api/customers/${customerId}/orders?pageSize=10`);
}

export async function fetchCustomerInteractions(
  customerId: string
): Promise<PaginatedResponse<CustomerInteraction>> {
  return fetchJson(`/api/customers/${customerId}/interactions?pageSize=10`);
}

export async function fetchCustomerTasks(customerId: string): Promise<PaginatedResponse<TaskItem>> {
  return fetchJson(`/api/customers/${customerId}/tasks?pageSize=10`);
}

export async function fetchCustomerVisits(
  customerId: string
): Promise<PaginatedResponse<SalesVisit>> {
  return fetchJson(`/api/customers/${customerId}/visits?pageSize=10`);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
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
  if (!error || typeof error !== "object" || !("message" in error)) {
    return null;
  }

  return typeof error.message === "string" ? error.message : null;
}
