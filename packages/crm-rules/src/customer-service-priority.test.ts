import { describe, expect, it } from "vitest";
import {
  defaultCustomerServiceRulesConfig,
  evaluateCustomerServicePriority,
  mapPriorityLevel,
  type CustomerServiceRuleInput
} from "./index";

const baseInput: CustomerServiceRuleInput = {
  active: true,
  averageReorderDays: 30,
  b2bStatus: "registered",
  campaignClickedWithoutConversion: false,
  customerId: "cus-test",
  daysSinceLastOrder: 20,
  lastInteractionAt: null,
  openTaskCount: 0,
  overdueTaskCount: 0,
  previousTurnover90d: 1000,
  segmentCodes: [],
  turnover90d: 1000
};

describe("customer service priority rules", () => {
  it("maps priority levels from score bands", () => {
    expect(mapPriorityLevel(80)).toBe("CRITICAL");
    expect(mapPriorityLevel(50)).toBe("HIGH");
    expect(mapPriorityLevel(25)).toBe("MEDIUM");
    expect(mapPriorityLevel(5)).toBe("LOW");
  });

  it("scores reorder overdue customers", () => {
    const result = evaluateCustomerServicePriority({
      ...baseInput,
      daysSinceLastOrder: 75
    });

    expect(result.reasons.map((reason) => reason.code)).toContain("REORDER_OVERDUE");
    expect(result.recommendedActions).toContain("REORDER");
  });

  it("scores turnover decline", () => {
    const result = evaluateCustomerServicePriority({
      ...baseInput,
      turnover90d: 450
    });

    expect(result.reasons.find((reason) => reason.code === "SALES_DECLINE")?.value).toBe(-55);
    expect(result.recommendedActions).toContain("RETENTION");
  });

  it("scores inactivity and reactivation", () => {
    const result = evaluateCustomerServicePriority({
      ...baseInput,
      daysSinceLastOrder: 100
    });

    expect(result.reasons.map((reason) => reason.code)).toContain("INACTIVITY");
    expect(result.primaryRecommendedAction).toBe("REACTIVATION");
  });

  it("reduces priority after recent interaction when no urgent signal overrides it", () => {
    const result = evaluateCustomerServicePriority(
      {
        ...baseInput,
        b2bStatus: "missing",
        daysSinceLastOrder: 10,
        lastInteractionAt: "2026-09-10T10:00:00.000Z"
      },
      defaultCustomerServiceRulesConfig,
      new Date("2026-09-11T12:00:00.000Z")
    );

    expect(result.reasons.map((reason) => reason.code)).toContain("RECENT_INTERACTION");
    expect(result.priorityScore).toBe(0);
    expect(result.shouldContact).toBe(false);
  });

  it("returns multiple explainable reasons and action categories", () => {
    const result = evaluateCustomerServicePriority({
      ...baseInput,
      b2bStatus: "missing",
      daysSinceLastOrder: 100,
      openTaskCount: 1,
      overdueTaskCount: 1,
      previousTurnover90d: 1200,
      segmentCodes: ["CROSS_SELL", "NEWSLETTER_FOLLOW_UP"],
      turnover90d: 500
    });

    expect(result.priorityLevel).toBe("CRITICAL");
    expect(result.reasons.length).toBeGreaterThanOrEqual(6);
    expect(result.recommendedActions).toEqual([
      "REACTIVATION",
      "RETENTION",
      "REORDER",
      "CAMPAIGN_FOLLOW_UP",
      "TASK_FOLLOW_UP",
      "B2B_REGISTRATION",
      "CROSS_SELL"
    ]);
  });
});
