import type { CustomerInteraction } from "../interactions/types";
import type { CustomerMetrics } from "../metrics/types";
import type { OrderSummary } from "../orders/types";
import type { CustomerSegmentMembership } from "../segments/types";
import type { TaskItem } from "../tasks/types";
import type { UserReference } from "../types";

export type CustomerSortField = "company_name" | "city" | "updated_at" | "last_order_date";

export interface CustomerListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: boolean;
  sort?: CustomerSortField;
  direction?: "asc" | "desc";
}

export interface CustomerListItem {
  id: string;
  externalId: string | null;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  b2bStatus: string;
  active: boolean;
  assignedSalesRep: UserReference | null;
  lastOrderDate: string | null;
  turnover365d: number;
  openTaskCount: number;
  updatedAt: string;
}

export interface CustomerLocation {
  id: string;
  externalId: string | null;
  customerId: string;
  name: string;
  locationType: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  active: boolean;
}

export interface CustomerOverview {
  customer: CustomerListItem;
  locations: CustomerLocation[];
  metrics: CustomerMetrics | null;
  segments: CustomerSegmentMembership[];
  latestInteractions: CustomerInteraction[];
  latestOrders: OrderSummary[];
  openTasks: TaskItem[];
}

export interface CustomerListRow {
  id: string;
  external_id: string | null;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  b2b_status: string;
  active: number;
  assigned_sales_rep_id: string | null;
  sales_rep_name: string | null;
  sales_rep_email: string | null;
  sales_rep_role: string | null;
  last_order_date: string | null;
  turnover_365d: number | null;
  open_task_count: number;
  updated_at: string;
}

export interface CustomerLocationRow {
  id: string;
  external_id: string | null;
  customer_id: string;
  name: string;
  location_type: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  active: number;
}
