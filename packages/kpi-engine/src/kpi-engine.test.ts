import { describe, expect, it } from "vitest";
import {
  calculateAchievementPercent,
  calculateKpiResult,
  calculatePeriodProgressPercent,
  calculateWeightedSummary,
  prorateTarget
} from "./index";

describe("deterministic KPI engine", () => {
  it("calculates achievement and a period-aware status", () => {
    const result = calculateKpiResult({
      actual: 80,
      kpiCode: "CS_CALLS",
      metricType: "count",
      name: "Calls completed",
      periodEnd: "2026-09-30",
      periodProgressPercent: 50,
      periodStart: "2026-09-01",
      source: "customer_interactions",
      target: 100,
      weight: 0.15
    });

    expect(calculateAchievementPercent(80, 100)).toBe(80);
    expect(result.status).toBe("ON_TRACK");
    expect(result.weightedAchievementPercent).toBe(12);
  });

  it("caps overachievement in the weighted summary", () => {
    const base = {
      metricType: "count" as const,
      periodEnd: "2026-09-30",
      periodProgressPercent: 50,
      periodStart: "2026-09-01",
      source: "demo"
    };
    const summary = calculateWeightedSummary(
      [
        calculateKpiResult({
          ...base,
          actual: 120,
          target: 100,
          weight: 0.6,
          kpiCode: "A",
          name: "A"
        }),
        calculateKpiResult({
          ...base,
          actual: 25,
          target: 100,
          weight: 0.4,
          kpiCode: "B",
          name: "B"
        })
      ],
      50
    );

    expect(summary).toMatchObject({ achievementPercent: 70, status: "ON_TRACK", totalWeight: 1 });
  });

  it("calculates inclusive period progress", () => {
    expect(calculatePeriodProgressPercent("2026-09-01", "2026-09-30", "2026-09-15")).toBe(50);
    expect(calculatePeriodProgressPercent("2026-09-01", "2026-09-30", "2026-08-31")).toBe(0);
    expect(calculatePeriodProgressPercent("2026-09-01", "2026-09-30", "2026-10-01")).toBe(100);
    expect(prorateTarget(300, "2026-09-01", "2026-09-30", "2026-09-01", "2026-09-07")).toBe(70);
  });
});
