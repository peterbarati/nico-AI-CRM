export type PerformanceRole = "customer_service" | "sales_rep";
import type { KpiResult, WeightedKpiSummary } from "@nico-ai-crm/kpi-engine";

export type { KpiResult } from "@nico-ai-crm/kpi-engine";

export interface UserKpiSummary {
  userId: string;
  userName: string;
  role: PerformanceRole;
  attributedTurnover: number;
  callsCompleted: number;
  visitsCompleted: number;
  completedTasks: number;
  reactivations: number;
  b2bActivations: number;
  kpis: KpiResult[];
  overall: WeightedKpiSummary;
}

export interface RoleKpiSummary {
  role: PerformanceRole;
  kpis: KpiResult[];
  overall: WeightedKpiSummary;
}

export interface DashboardSummary {
  turnover: number;
  salesTarget: number;
  salesAchievementPercent: number;
  turnoverSource: "normalized_crm_orders";
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

export interface ManagementDashboard {
  period: {
    fromDate: string;
    toDate: string;
    fromUtc: string;
    toUtcExclusive: string;
    timezone: string;
    progressPercent: number;
  };
  dashboard: DashboardSummary;
  roles: RoleKpiSummary[];
  users: UserKpiSummary[];
  meta: {
    attributionWindowDays: number;
    reactivationDefinition: string;
  };
}

export interface DashboardFilters {
  period: string;
  from: string;
  to: string;
  role: string;
  userId: string;
}
