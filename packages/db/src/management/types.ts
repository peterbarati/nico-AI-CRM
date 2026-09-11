import type { BusinessDateRange } from "@nico-ai-crm/shared";
import type { UserRole } from "../users/types";

export type PerformanceRole = Extract<UserRole, "customer_service" | "sales_rep">;

export interface ManagementQuery {
  range: BusinessDateRange;
  businessDate: string;
  nowUtc: string;
  role?: PerformanceRole;
  userId?: string;
  attributionWindowDays: number;
  reactivationInactivityDays: number;
}

export interface KpiDefinitionRecord {
  id: string;
  code: string;
  name: string;
  metricType: "count" | "currency" | "percent";
  role: PerformanceRole;
  sourceKey:
    | "attributed_turnover"
    | "calls_completed"
    | "visits_completed"
    | "reactivations"
    | "b2b_activations";
}

export interface KpiTargetRecord {
  kpiDefinitionId: string;
  userId: string | null;
  role: PerformanceRole | null;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
  weight: number;
}

export interface CompanyTargetRecord {
  kpiDefinitionId: string;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
}

export interface UserKpiFacts {
  userId: string;
  userName: string;
  role: PerformanceRole;
  attributedTurnover: number;
  callsCompleted: number;
  visitsCompleted: number;
  completedTasks: number;
  reactivations: number;
  b2bActivations: number;
}

export interface DashboardFacts {
  turnover: number;
  activeCustomers: number;
  atRiskCustomers: number;
  criticalCustomers: number;
  reactivationCandidates: number;
  reactivatedCustomers: number;
  callsCompleted: number;
  visitsCompleted: number;
  b2bRegisteredCustomers: number;
  b2bPenetrationPercent: number;
  overdueTasks: number;
  csToSalesHandoffs: number;
  salesToCsHandoffs: number;
}

export interface ManagementKpiData {
  definitions: KpiDefinitionRecord[];
  targets: KpiTargetRecord[];
  companyTargets: CompanyTargetRecord[];
  users: UserKpiFacts[];
  dashboard: DashboardFacts;
}

export interface KpiDefinitionRow {
  id: string;
  code: string;
  name: string;
  metric_type: "count" | "currency" | "percent";
  role: PerformanceRole;
  source_key: KpiDefinitionRecord["sourceKey"];
}

export interface KpiTargetRow {
  kpi_definition_id: string;
  user_id: string | null;
  role: PerformanceRole | null;
  period_start: string;
  period_end: string;
  target_value: number;
  weight: number | null;
}

export interface CompanyTargetRow {
  kpi_definition_id: string;
  period_start: string;
  period_end: string;
  target_value: number;
}

export interface UserKpiFactsRow {
  user_id: string;
  user_name: string;
  role: PerformanceRole;
  attributed_turnover: number;
  calls_completed: number;
  visits_completed: number;
  completed_tasks: number;
  reactivations: number;
  b2b_activations: number;
}

export interface DashboardFactsRow {
  turnover: number;
  active_customers: number;
  at_risk_customers: number;
  critical_customers: number;
  reactivation_candidates: number;
  reactivated_customers: number;
  calls_completed: number;
  visits_completed: number;
  b2b_registered_customers: number;
  b2b_penetration_percent: number;
  overdue_tasks: number;
  cs_to_sales_handoffs: number;
  sales_to_cs_handoffs: number;
}
