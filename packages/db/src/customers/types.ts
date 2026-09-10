import type { CustomerInteraction } from "../interactions/types";
import type { CustomerMetrics } from "../metrics/types";
import type { OrderSummary } from "../orders/types";
import type { CustomerSegmentMembership } from "../segments/types";
import type { TaskItem } from "../tasks/types";
import type { UserReference } from "../types";

export type CustomerSortField =
  | "company_name"
  | "city"
  | "updated_at"
  | "last_order_date"
  | "turnover_90d"
  | "days_since_last_order";

export interface CustomerListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: boolean;
  assignedSalesRepId?: string;
  b2bStatus?: string;
  segmentCode?: string;
  sort?: CustomerSortField;
  direction?: "asc" | "desc";
}

export interface CustomerListSegment {
  id: string;
  code: string;
  name: string;
  reason: string | null;
  score: number | null;
}

export interface CustomerListInteractionSummary {
  id: string;
  interactionType: string;
  reason: string | null;
  result: string | null;
  createdAt: string;
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
  turnover90d: number;
  turnover365d: number;
  previousTurnover90d: number;
  salesTrend: "up" | "flat" | "down" | "new";
  daysSinceLastOrder: number | null;
  openTaskCount: number;
  segments: CustomerListSegment[];
  lastInteraction: CustomerListInteractionSummary | null;
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

export interface CustomerFilterOptions {
  salesReps: UserReference[];
  b2bStatuses: string[];
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
  turnover_90d: number | null;
  turnover_365d: number | null;
  previous_turnover_90d: number | null;
  days_since_last_order: number | null;
  open_task_count: number;
  last_interaction_id: string | null;
  last_interaction_type: string | null;
  last_interaction_reason: string | null;
  last_interaction_result: string | null;
  last_interaction_created_at: string | null;
  updated_at: string;
}

export interface CustomerListSegmentRow {
  customer_id: string;
  segment_id: string;
  code: string;
  name: string;
  reason: string | null;
  score: number | null;
}

export interface CustomerFilterSalesRepRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CustomerFilterB2BStatusRow {
  b2b_status: string;
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
