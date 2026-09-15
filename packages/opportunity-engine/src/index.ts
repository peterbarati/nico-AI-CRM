export * from "./types";

import type { OpportunityType } from "@nico-ai-crm/shared";
import type {
  OpportunityCandidate,
  OpportunityEngineConfig,
  OpportunityFacts,
  OpportunityReason
} from "./types";

export const defaultOpportunityEngineConfig: OpportunityEngineConfig = {
  weights: {
    commercialPotential: 25,
    reorderLikelihood: 20,
    reactivation: 15,
    turnoverDecline: 10,
    crossSell: 10,
    visitOverdue: 10,
    taskCampaignUrgency: 10,
    strategicPriority: 0
  },
  reactivationDays: 90,
  reorderGraceDays: 7,
  visitOverdueDays: 60,
  highCommercialValue: 2000
};

export function evaluateOpportunity(
  facts: OpportunityFacts,
  config: OpportunityEngineConfig = defaultOpportunityEngineConfig
): OpportunityCandidate | null {
  if (!facts.active || !facts.salesRepId || !facts.locationId) return null;
  const reasons: OpportunityReason[] = [];
  const add = (
    code: string,
    weight: number,
    factor: number,
    value: number | boolean | string | null
  ) => {
    const contribution = round(weight * clamp(factor));
    if (contribution > 0) reasons.push({ code, contribution, value });
  };

  add(
    "COMMERCIAL_POTENTIAL",
    config.weights.commercialPotential,
    facts.lifetimeTurnover / Math.max(1, config.highCommercialValue),
    facts.lifetimeTurnover
  );
  const reorderOverdue =
    facts.daysSinceLastOrder !== null && facts.averageReorderDays !== null
      ? facts.daysSinceLastOrder - facts.averageReorderDays - config.reorderGraceDays
      : 0;
  add(
    "REORDER_WINDOW_OVERDUE",
    config.weights.reorderLikelihood,
    reorderOverdue / Math.max(1, facts.averageReorderDays ?? 30),
    reorderOverdue
  );
  add(
    "REACTIVATION_THRESHOLD_REACHED",
    config.weights.reactivation,
    facts.daysSinceLastOrder !== null && facts.daysSinceLastOrder >= config.reactivationDays
      ? facts.daysSinceLastOrder / Math.max(1, config.reactivationDays)
      : 0,
    facts.daysSinceLastOrder
  );
  const decline =
    facts.previousTurnover90d > 0
      ? Math.max(0, (facts.previousTurnover90d - facts.turnover90d) / facts.previousTurnover90d)
      : 0;
  add("TURNOVER_DECLINE", config.weights.turnoverDecline, decline, round(decline * 100));
  add("CROSS_SELL_GAP", config.weights.crossSell, facts.crossSellGap ? 1 : 0, facts.crossSellGap);
  add(
    "VISIT_OVERDUE",
    config.weights.visitOverdue,
    facts.daysSinceLastVisit === null
      ? 1
      : facts.daysSinceLastVisit / Math.max(1, config.visitOverdueDays),
    facts.daysSinceLastVisit
  );
  add(
    facts.campaignFollowUp ? "CAMPAIGN_FOLLOW_UP_DUE" : "OPEN_TASK_URGENCY",
    config.weights.taskCampaignUrgency,
    Math.max(facts.campaignFollowUp ? 1 : 0, taskPriorityFactor(facts.openTaskPriority)),
    facts.campaignFollowUp || facts.openTaskPriority
  );
  add(
    "STRATEGIC_PRIORITY",
    config.weights.strategicPriority,
    facts.strategicPriority ? 1 : 0,
    facts.strategicPriority
  );
  if (!reasons.length) return null;
  const opportunityType = primaryType(facts, reorderOverdue, decline, config);
  const sorted = [...reasons].sort(
    (a, b) => b.contribution - a.contribution || a.code.localeCompare(b.code)
  );
  return {
    customerId: facts.customerId,
    locationId: facts.locationId,
    salesRepId: facts.salesRepId,
    opportunityType,
    score: clampScore(reasons.reduce((total, reason) => total + reason.contribution, 0)),
    estimatedValue: facts.averageOrderValue,
    primaryReasonCode: sorted[0]!.code,
    reasons: sorted,
    facts: {
      daysSinceLastOrder: facts.daysSinceLastOrder,
      averageReorderDays: facts.averageReorderDays,
      turnover90d: facts.turnover90d,
      previousTurnover90d: facts.previousTurnover90d,
      lifetimeTurnover: facts.lifetimeTurnover,
      daysSinceLastVisit: facts.daysSinceLastVisit,
      campaignFollowUp: facts.campaignFollowUp,
      crossSellGap: facts.crossSellGap,
      b2bStatus: facts.b2bStatus,
      lastOrderDate: facts.lastOrderDate,
      lastVisitDate: facts.lastVisitDate
    },
    sourceTaskId: facts.sourceTaskId,
    sourceCampaignId: facts.sourceCampaignId
  };
}

export function generateOpportunities(
  facts: OpportunityFacts[],
  config: OpportunityEngineConfig = defaultOpportunityEngineConfig
): OpportunityCandidate[] {
  return facts
    .map((item) => evaluateOpportunity(item, config))
    .filter((item): item is OpportunityCandidate => item !== null)
    .sort((a, b) => b.score - a.score || a.customerId.localeCompare(b.customerId));
}

function primaryType(
  facts: OpportunityFacts,
  reorderOverdue: number,
  decline: number,
  config: OpportunityEngineConfig
): OpportunityType {
  if (facts.campaignFollowUp) return "CAMPAIGN_FOLLOW_UP";
  if (facts.daysSinceLastOrder !== null && facts.daysSinceLastOrder >= config.reactivationDays)
    return "REACTIVATION";
  if (facts.openTaskPriority) return "TASK_FOLLOW_UP";
  if (reorderOverdue > 0) return "REORDER";
  if (decline >= 0.2) return "RETENTION";
  if (facts.crossSellGap) return "CROSS_SELL";
  if (facts.b2bStatus !== "registered") return "B2B_REGISTRATION";
  if (facts.daysSinceLastVisit === null || facts.daysSinceLastVisit >= config.visitOverdueDays)
    return "OVERDUE_VISIT";
  if (facts.strategicPriority) return "STRATEGIC";
  return "OTHER";
}

function taskPriorityFactor(value: OpportunityFacts["openTaskPriority"]): number {
  return value === "urgent"
    ? 1
    : value === "high"
      ? 0.75
      : value === "normal"
        ? 0.5
        : value
          ? 0.25
          : 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, round(value)));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
