import type { BusinessDateRange } from "@nico-ai-crm/shared";

export interface ActivityReportQuery {
  range: BusinessDateRange;
  nowUtc: string;
  role?: string;
  userId?: string;
}

export interface ActivityMetrics {
  callsCompleted: number;
  customerInteractions: number;
  salesVisitsCompleted: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  followUpsCreated: number;
  csToSalesHandoffs: number;
  salesToCsHandoffs: number;
  reactivationActivities: number;
  b2bActivities: number;
}

export interface UserActivityBreakdown extends ActivityMetrics {
  userId: string;
  userName: string;
  role: string;
}

export interface ActivityReport {
  period: BusinessDateRange;
  metrics: ActivityMetrics;
  users: UserActivityBreakdown[];
}

export interface ActivityUserRow {
  user_id: string;
  user_name: string;
  role: string;
  customer_interactions: number;
  calls_completed: number;
  sales_visits_completed: number;
  open_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  follow_ups_created: number;
  cs_to_sales_handoffs: number;
  sales_to_cs_handoffs: number;
  reactivation_interactions: number;
  reactivation_visits: number;
  b2b_interactions: number;
  b2b_visits: number;
}
