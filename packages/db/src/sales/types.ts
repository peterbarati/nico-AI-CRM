import type { CustomerOverview } from "../customers/types";
import type { PaginationInput, UserReference } from "../types";
import type { SalesVisit } from "../visits/types";

export type SalesTaskDueFilter = "all" | "overdue" | "today" | "upcoming";

export interface SalesTaskQuery extends PaginationInput {
  taskId?: string;
  assignedUserId?: string;
  status?: string;
  priority?: string;
  due?: SalesTaskDueFilter;
  nowUtc?: string;
  businessDayFromUtc?: string;
  businessDayToUtc?: string;
}

export interface SalesTaskQueueItem {
  id: string;
  customerId: string;
  customerName: string;
  customerCity: string | null;
  assignedUser: UserReference;
  requestedBy: UserReference | null;
  taskType: string;
  title: string;
  context: string | null;
  priority: string;
  status: string;
  dueAt: string | null;
  sourceInteractionId: string | null;
  sourceReason: string | null;
  sourceResult: string | null;
  sourceNotes: string | null;
  sourceNextAction: string | null;
  visit: { id: string; status: string; plannedAt: string | null } | null;
  createdAt: string;
}

export interface SalesTaskQueueRow {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_city: string | null;
  assigned_user_id: string;
  assigned_user_name: string;
  assigned_user_email: string;
  assigned_user_role: string;
  created_by_user_id: string | null;
  created_by_user_name: string | null;
  created_by_user_email: string | null;
  created_by_user_role: string | null;
  task_type: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  source_interaction_id: string | null;
  source_reason: string | null;
  source_result: string | null;
  source_notes: string | null;
  source_next_action: string | null;
  visit_id: string | null;
  visit_status: string | null;
  visit_planned_at: string | null;
  created_at: string;
}

export interface SalesTaskDetail {
  task: SalesTaskQueueItem;
  customer: CustomerOverview;
  visit: SalesVisit | null;
}
