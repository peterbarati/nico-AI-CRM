export type KpiStatus = "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED";
export type KpiMetricType = "count" | "currency" | "percent";
export type KpiRole = "customer_service" | "sales_rep";

export interface KpiDefinitionInput {
  kpiCode: string;
  name: string;
  metricType: KpiMetricType;
  target: number;
  actual: number;
  weight: number;
  source: string;
  periodStart: string;
  periodEnd: string;
  periodProgressPercent: number;
}

export interface KpiResult {
  kpiCode: string;
  name: string;
  metricType: KpiMetricType;
  target: number;
  actual: number;
  achievementPercent: number;
  weight: number;
  weightedAchievementPercent: number;
  status: KpiStatus;
  source: string;
  periodStart: string;
  periodEnd: string;
}

export interface WeightedKpiSummary {
  achievementPercent: number;
  status: KpiStatus;
  totalWeight: number;
}
