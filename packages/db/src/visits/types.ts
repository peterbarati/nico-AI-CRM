import type { UserReference } from "../types";

export interface SalesVisit {
  id: string;
  customerId: string;
  customerLocationId: string | null;
  salesRep: UserReference;
  plannedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  result: string | null;
  notes: string | null;
  orderValue: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VisitRow {
  id: string;
  customer_id: string;
  customer_location_id: string | null;
  sales_rep_id: string;
  sales_rep_name: string;
  sales_rep_email: string;
  sales_rep_role: string;
  planned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  result: string | null;
  notes: string | null;
  order_value: number | null;
  created_at: string;
  updated_at: string;
}
