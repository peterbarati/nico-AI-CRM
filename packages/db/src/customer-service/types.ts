import type { CustomerListSegment, CustomerListInteractionSummary } from "../customers/types";
import type { UserReference } from "../types";

export interface CustomerServiceQueueQuery {
  limit?: number;
  priority?: string;
  assignedSalesRepId?: string;
  segmentCode?: string;
  now?: Date;
  businessDayToUtc?: string;
}

export interface CustomerServiceCandidate {
  customerId: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  active: boolean;
  b2bStatus: string;
  assignedSalesRep: UserReference | null;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  averageReorderDays: number | null;
  turnover90d: number;
  previousTurnover90d: number;
  salesTrend: "up" | "flat" | "down" | "new";
  openTaskCount: number;
  overdueTaskCount: number;
  campaignClickedWithoutConversion: boolean;
  lastInteraction: CustomerListInteractionSummary | null;
  segments: CustomerListSegment[];
}

export interface CustomerServiceCandidateRow {
  customer_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  active: number;
  b2b_status: string;
  assigned_sales_rep_id: string | null;
  sales_rep_name: string | null;
  sales_rep_email: string | null;
  sales_rep_role: string | null;
  last_order_date: string | null;
  days_since_last_order: number | null;
  average_reorder_days: number | null;
  turnover_90d: number | null;
  previous_turnover_90d: number | null;
  open_task_count: number;
  overdue_task_count: number;
  campaign_clicked_without_conversion: number;
  last_interaction_id: string | null;
  last_interaction_type: string | null;
  last_interaction_reason: string | null;
  last_interaction_result: string | null;
  last_interaction_created_at: string | null;
}

export interface CustomerServiceCandidateSegmentRow {
  customer_id: string;
  segment_id: string;
  code: string;
  name: string;
  reason: string | null;
  score: number | null;
}

export interface DailyCompletedCallsRow {
  total: number;
}

export interface UtcDateRange {
  fromUtc: string;
  toUtcExclusive: string;
}
