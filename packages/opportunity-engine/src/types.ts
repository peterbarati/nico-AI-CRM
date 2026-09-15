import type { OpportunityType } from "@nico-ai-crm/shared";

export interface OpportunityWeights {
  commercialPotential: number;
  reorderLikelihood: number;
  reactivation: number;
  turnoverDecline: number;
  crossSell: number;
  visitOverdue: number;
  taskCampaignUrgency: number;
  strategicPriority: number;
}

export interface OpportunityEngineConfig {
  weights: OpportunityWeights;
  reactivationDays: number;
  reorderGraceDays: number;
  visitOverdueDays: number;
  highCommercialValue: number;
}

export interface OpportunityFacts {
  customerId: string;
  locationId: string;
  salesRepId: string;
  active: boolean;
  b2bStatus: string;
  daysSinceLastOrder: number | null;
  averageReorderDays: number | null;
  turnover90d: number;
  previousTurnover90d: number;
  lifetimeTurnover: number;
  averageOrderValue: number | null;
  daysSinceLastVisit: number | null;
  openTaskPriority: "low" | "normal" | "high" | "urgent" | null;
  sourceTaskId: string | null;
  campaignFollowUp: boolean;
  sourceCampaignId: string | null;
  crossSellGap: boolean;
  strategicPriority: boolean;
  lastOrderDate: string | null;
  lastVisitDate: string | null;
}

export interface OpportunityReason {
  code: string;
  contribution: number;
  value: number | boolean | string | null;
}

export interface OpportunityCandidate {
  customerId: string;
  locationId: string;
  salesRepId: string;
  opportunityType: OpportunityType;
  score: number;
  estimatedValue: number | null;
  primaryReasonCode: string;
  reasons: OpportunityReason[];
  facts: {
    daysSinceLastOrder: number | null;
    averageReorderDays: number | null;
    turnover90d: number;
    previousTurnover90d: number;
    lifetimeTurnover: number;
    daysSinceLastVisit: number | null;
    campaignFollowUp: boolean;
    crossSellGap: boolean;
    b2bStatus: string;
    lastOrderDate: string | null;
    lastVisitDate: string | null;
  };
  sourceTaskId: string | null;
  sourceCampaignId: string | null;
}
