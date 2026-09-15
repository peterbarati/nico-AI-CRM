import { describe, expect, it } from "vitest";
import {
  defaultOpportunityEngineConfig,
  evaluateOpportunity,
  generateOpportunities,
  type OpportunityFacts
} from "./index";

const base: OpportunityFacts = {
  customerId: "cus-1",
  locationId: "loc-1",
  salesRepId: "rep-1",
  active: true,
  b2bStatus: "registered",
  daysSinceLastOrder: 20,
  averageReorderDays: 45,
  turnover90d: 500,
  previousTurnover90d: 500,
  lifetimeTurnover: 500,
  averageOrderValue: 250,
  daysSinceLastVisit: 20,
  openTaskPriority: null,
  sourceTaskId: null,
  campaignFollowUp: false,
  sourceCampaignId: null,
  crossSellGap: false,
  strategicPriority: false,
  lastOrderDate: "2026-08-20",
  lastVisitDate: "2026-08-25"
};

describe("opportunity engine", () => {
  it.each([
    ["REORDER", { daysSinceLastOrder: 80, averageReorderDays: 30 }],
    ["REACTIVATION", { daysSinceLastOrder: 120 }],
    ["RETENTION", { turnover90d: 100, previousTurnover90d: 500 }],
    ["CROSS_SELL", { crossSellGap: true }],
    ["B2B_REGISTRATION", { b2bStatus: "missing" }],
    ["CAMPAIGN_FOLLOW_UP", { campaignFollowUp: true, sourceCampaignId: "cmp-1" }],
    ["TASK_FOLLOW_UP", { openTaskPriority: "urgent", sourceTaskId: "tsk-1" }],
    ["OVERDUE_VISIT", { daysSinceLastVisit: 90 }],
    ["STRATEGIC", { strategicPriority: true }]
  ] as const)("detects %s opportunities", (expected, patch) => {
    const config = {
      ...defaultOpportunityEngineConfig,
      weights: { ...defaultOpportunityEngineConfig.weights, strategicPriority: 10 }
    };
    expect(evaluateOpportunity({ ...base, ...patch }, config)?.opportunityType).toBe(expected);
  });

  it("keeps score bounded and exposes deterministic structured reasons", () => {
    const facts = {
      ...base,
      daysSinceLastOrder: 180,
      averageReorderDays: 30,
      previousTurnover90d: 1000,
      turnover90d: 0,
      crossSellGap: true,
      campaignFollowUp: true
    };
    const first = evaluateOpportunity(facts)!;
    const second = evaluateOpportunity(facts)!;
    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(first.reasons.every((reason) => reason.code && reason.contribution > 0)).toBe(true);
    expect(first.facts.daysSinceLastOrder).toBe(180);
  });

  it("applies configurable weights and skips ineligible facts", () => {
    const low = evaluateOpportunity(base)!;
    const high = evaluateOpportunity(base, {
      ...defaultOpportunityEngineConfig,
      weights: { ...defaultOpportunityEngineConfig.weights, commercialPotential: 50 }
    })!;
    expect(high.score).toBeGreaterThan(low.score);
    expect(evaluateOpportunity({ ...base, active: false })).toBeNull();
  });

  it("sorts generated opportunities deterministically", () => {
    const result = generateOpportunities([
      { ...base, customerId: "cus-b", locationId: "loc-b" },
      { ...base, customerId: "cus-a", locationId: "loc-a" }
    ]);
    expect(result.map((item) => item.customerId)).toEqual(["cus-a", "cus-b"]);
  });
});
