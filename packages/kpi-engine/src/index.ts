export * from "./types";

import type { KpiDefinitionInput, KpiResult, KpiStatus, WeightedKpiSummary } from "./types";

export function calculateAchievementPercent(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return round((actual / target) * 100);
}

export function resolveKpiStatus(
  achievementPercent: number,
  periodProgressPercent: number
): KpiStatus {
  if (achievementPercent >= 100) return "COMPLETED";
  const expected = Math.max(0, Math.min(100, periodProgressPercent));
  if (achievementPercent >= expected) return "ON_TRACK";
  if (achievementPercent >= expected * 0.8) return "AT_RISK";
  return "BEHIND";
}

export function calculateKpiResult(input: KpiDefinitionInput): KpiResult {
  const achievementPercent = calculateAchievementPercent(input.actual, input.target);
  return {
    kpiCode: input.kpiCode,
    name: input.name,
    metricType: input.metricType,
    target: input.target,
    actual: input.actual,
    achievementPercent,
    weight: input.weight,
    weightedAchievementPercent: round(Math.min(achievementPercent, 100) * input.weight),
    status: resolveKpiStatus(achievementPercent, input.periodProgressPercent),
    source: input.source,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd
  };
}

export function calculateWeightedSummary(
  results: KpiResult[],
  periodProgressPercent: number
): WeightedKpiSummary {
  const totalWeight = results.reduce((sum, result) => sum + result.weight, 0);
  const achievementPercent =
    totalWeight === 0
      ? 0
      : round(
          results.reduce(
            (sum, result) => sum + Math.min(result.achievementPercent, 100) * result.weight,
            0
          ) / totalWeight
        );
  return {
    achievementPercent,
    status: resolveKpiStatus(achievementPercent, periodProgressPercent),
    totalWeight
  };
}

export function calculatePeriodProgressPercent(
  periodStart: string,
  periodEnd: string,
  businessDate: string
): number {
  const start = toUtcDay(periodStart);
  const end = toUtcDay(periodEnd);
  const current = toUtcDay(businessDate);
  if (current < start) return 0;
  if (current > end) return 100;
  const totalDays = Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
  const elapsedDays = Math.floor((current - start) / 86_400_000) + 1;
  return round((elapsedDays / totalDays) * 100);
}

export function prorateTarget(
  target: number,
  configuredStart: string,
  configuredEnd: string,
  requestedStart: string,
  requestedEnd: string
): number {
  const configStart = toUtcDay(configuredStart);
  const configEnd = toUtcDay(configuredEnd);
  const overlapStart = Math.max(configStart, toUtcDay(requestedStart));
  const overlapEnd = Math.min(configEnd, toUtcDay(requestedEnd));
  if (overlapStart > overlapEnd) return 0;
  const configuredDays = Math.max(1, Math.floor((configEnd - configStart) / 86_400_000) + 1);
  const overlapDays = Math.floor((overlapEnd - overlapStart) / 86_400_000) + 1;
  return round((target * overlapDays) / configuredDays);
}

function toUtcDay(value: string): number {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid KPI business date: ${value}`);
  return timestamp;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
