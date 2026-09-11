export type CustomerServicePriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type CustomerServiceReasonCode =
  | "REORDER_OVERDUE"
  | "SALES_DECLINE"
  | "INACTIVITY"
  | "B2B_MISSING"
  | "CAMPAIGN_INTEREST"
  | "OPEN_FOLLOW_UP_TASK"
  | "CROSS_SELL"
  | "RECENT_INTERACTION";

export type CustomerServiceActionCode =
  | "REORDER"
  | "RETENTION"
  | "REACTIVATION"
  | "B2B_REGISTRATION"
  | "CROSS_SELL"
  | "CAMPAIGN_FOLLOW_UP"
  | "TASK_FOLLOW_UP";

export interface CustomerServiceRulesConfig {
  dailyCallTarget: number;
  reorderGraceDays: number;
  atRiskDays: number;
  criticalDays: number;
  reactivationDays: number;
  recentInteractionSuppressionDays: number;
  weights: {
    reorderSlightlyOverdue: number;
    reorderSignificantlyOverdue: number;
    reorderSeverelyOverdue: number;
    decline20: number;
    decline30: number;
    decline50: number;
    inactivityAtRisk: number;
    inactivityCritical: number;
    inactivityReactivation: number;
    b2bMissing: number;
    campaignInterest: number;
    openFollowUpTask: number;
    overdueFollowUpTask: number;
    crossSell: number;
    recentInteractionReduction: number;
  };
}

export interface CustomerServiceRuleInput {
  customerId: string;
  active: boolean;
  b2bStatus: string;
  daysSinceLastOrder: number | null;
  averageReorderDays: number | null;
  turnover90d: number;
  previousTurnover90d: number;
  openTaskCount: number;
  overdueTaskCount: number;
  campaignClickedWithoutConversion: boolean;
  lastInteractionAt: string | null;
  segmentCodes: string[];
}

export interface CustomerServicePriorityReason {
  code: CustomerServiceReasonCode;
  severity: CustomerServicePriorityLevel;
  value: number;
  scoreImpact: number;
  message: string;
}

export interface CustomerServicePriorityResult {
  customerId: string;
  priorityScore: number;
  priorityLevel: CustomerServicePriorityLevel;
  reasons: CustomerServicePriorityReason[];
  recommendedActions: CustomerServiceActionCode[];
  primaryRecommendedAction: CustomerServiceActionCode | null;
  shouldContact: boolean;
}

export const defaultCustomerServiceRulesConfig: CustomerServiceRulesConfig = {
  dailyCallTarget: 8,
  reorderGraceDays: 7,
  atRiskDays: 30,
  criticalDays: 60,
  reactivationDays: 90,
  recentInteractionSuppressionDays: 3,
  weights: {
    reorderSlightlyOverdue: 15,
    reorderSignificantlyOverdue: 25,
    reorderSeverelyOverdue: 35,
    decline20: 15,
    decline30: 25,
    decline50: 35,
    inactivityAtRisk: 15,
    inactivityCritical: 30,
    inactivityReactivation: 45,
    b2bMissing: 10,
    campaignInterest: 20,
    openFollowUpTask: 15,
    overdueFollowUpTask: 25,
    crossSell: 10,
    recentInteractionReduction: -20
  }
};

const actionRank: CustomerServiceActionCode[] = [
  "REACTIVATION",
  "RETENTION",
  "REORDER",
  "CAMPAIGN_FOLLOW_UP",
  "TASK_FOLLOW_UP",
  "B2B_REGISTRATION",
  "CROSS_SELL"
];

export function evaluateCustomerServicePriority(
  input: CustomerServiceRuleInput,
  config: CustomerServiceRulesConfig = defaultCustomerServiceRulesConfig,
  now = new Date()
): CustomerServicePriorityResult {
  const reasons: CustomerServicePriorityReason[] = [];
  const actions = new Set<CustomerServiceActionCode>();

  addReorderReason(input, config, reasons, actions);
  addDeclineReason(input, config, reasons, actions);
  addInactivityReason(input, config, reasons, actions);
  addB2BReason(input, config, reasons, actions);
  addCampaignReason(input, config, reasons, actions);
  addTaskReason(input, config, reasons, actions);
  addCrossSellReason(input, config, reasons, actions);
  addRecentInteractionReason(input, config, reasons, now);

  const priorityScore = Math.max(
    0,
    reasons.reduce((sum, reason) => sum + reason.scoreImpact, 0)
  );
  const recommendedActions = actionRank.filter((action) => actions.has(action));

  return {
    customerId: input.customerId,
    priorityScore,
    priorityLevel: mapPriorityLevel(priorityScore),
    reasons,
    recommendedActions,
    primaryRecommendedAction: recommendedActions[0] ?? null,
    shouldContact: input.active && priorityScore > 0 && recommendedActions.length > 0
  };
}

export function mapPriorityLevel(score: number): CustomerServicePriorityLevel {
  if (score >= 70) {
    return "CRITICAL";
  }

  if (score >= 45) {
    return "HIGH";
  }

  if (score >= 20) {
    return "MEDIUM";
  }

  return "LOW";
}

function addReorderReason(
  input: CustomerServiceRuleInput,
  config: CustomerServiceRulesConfig,
  reasons: CustomerServicePriorityReason[],
  actions: Set<CustomerServiceActionCode>
) {
  if (input.daysSinceLastOrder === null || input.averageReorderDays === null) {
    return;
  }

  const overdueDays = input.daysSinceLastOrder - input.averageReorderDays - config.reorderGraceDays;
  if (overdueDays <= 0) {
    return;
  }

  const scoreImpact =
    overdueDays >= 30
      ? config.weights.reorderSeverelyOverdue
      : overdueDays >= 14
        ? config.weights.reorderSignificantlyOverdue
        : config.weights.reorderSlightlyOverdue;

  reasons.push({
    code: "REORDER_OVERDUE",
    severity: mapReasonSeverity(scoreImpact),
    value: overdueDays,
    scoreImpact,
    message: `Customer is ${overdueDays} days past expected reorder interval.`
  });
  actions.add("REORDER");
}

function addDeclineReason(
  input: CustomerServiceRuleInput,
  config: CustomerServiceRulesConfig,
  reasons: CustomerServicePriorityReason[],
  actions: Set<CustomerServiceActionCode>
) {
  if (input.previousTurnover90d <= 0) {
    return;
  }

  const declinePercent = Math.round(
    ((input.previousTurnover90d - input.turnover90d) / input.previousTurnover90d) * 100
  );

  if (declinePercent < 20) {
    return;
  }

  const scoreImpact =
    declinePercent >= 50
      ? config.weights.decline50
      : declinePercent >= 30
        ? config.weights.decline30
        : config.weights.decline20;

  reasons.push({
    code: "SALES_DECLINE",
    severity: mapReasonSeverity(scoreImpact),
    value: -declinePercent,
    scoreImpact,
    message: `Turnover decreased by ${declinePercent}% compared with previous 90 days.`
  });
  actions.add("RETENTION");
}

function addInactivityReason(
  input: CustomerServiceRuleInput,
  config: CustomerServiceRulesConfig,
  reasons: CustomerServicePriorityReason[],
  actions: Set<CustomerServiceActionCode>
) {
  if (input.daysSinceLastOrder === null || input.daysSinceLastOrder < config.atRiskDays) {
    return;
  }

  const scoreImpact =
    input.daysSinceLastOrder >= config.reactivationDays
      ? config.weights.inactivityReactivation
      : input.daysSinceLastOrder >= config.criticalDays
        ? config.weights.inactivityCritical
        : config.weights.inactivityAtRisk;

  reasons.push({
    code: "INACTIVITY",
    severity: mapReasonSeverity(scoreImpact),
    value: input.daysSinceLastOrder,
    scoreImpact,
    message: `Customer has not ordered for ${input.daysSinceLastOrder} days.`
  });
  actions.add(input.daysSinceLastOrder >= config.reactivationDays ? "REACTIVATION" : "RETENTION");
}

function addB2BReason(
  input: CustomerServiceRuleInput,
  config: CustomerServiceRulesConfig,
  reasons: CustomerServicePriorityReason[],
  actions: Set<CustomerServiceActionCode>
) {
  if (!input.active || input.b2bStatus !== "missing") {
    return;
  }

  reasons.push({
    code: "B2B_MISSING",
    severity: "LOW",
    value: 1,
    scoreImpact: config.weights.b2bMissing,
    message: "Active customer is missing B2B registration."
  });
  actions.add("B2B_REGISTRATION");
}

function addCampaignReason(
  input: CustomerServiceRuleInput,
  config: CustomerServiceRulesConfig,
  reasons: CustomerServicePriorityReason[],
  actions: Set<CustomerServiceActionCode>
) {
  if (
    !input.campaignClickedWithoutConversion &&
    !input.segmentCodes.includes("NEWSLETTER_FOLLOW_UP")
  ) {
    return;
  }

  reasons.push({
    code: "CAMPAIGN_INTEREST",
    severity: "MEDIUM",
    value: 1,
    scoreImpact: config.weights.campaignInterest,
    message: "Customer clicked a campaign/newsletter without conversion."
  });
  actions.add("CAMPAIGN_FOLLOW_UP");
}

function addTaskReason(
  input: CustomerServiceRuleInput,
  config: CustomerServiceRulesConfig,
  reasons: CustomerServicePriorityReason[],
  actions: Set<CustomerServiceActionCode>
) {
  if (input.openTaskCount <= 0) {
    return;
  }

  const scoreImpact =
    input.overdueTaskCount > 0
      ? config.weights.overdueFollowUpTask
      : config.weights.openFollowUpTask;

  reasons.push({
    code: "OPEN_FOLLOW_UP_TASK",
    severity: mapReasonSeverity(scoreImpact),
    value: input.overdueTaskCount > 0 ? input.overdueTaskCount : input.openTaskCount,
    scoreImpact,
    message:
      input.overdueTaskCount > 0
        ? `${input.overdueTaskCount} open follow-up task is overdue.`
        : `${input.openTaskCount} open follow-up task requires attention.`
  });
  actions.add("TASK_FOLLOW_UP");
}

function addCrossSellReason(
  input: CustomerServiceRuleInput,
  config: CustomerServiceRulesConfig,
  reasons: CustomerServicePriorityReason[],
  actions: Set<CustomerServiceActionCode>
) {
  if (!input.segmentCodes.includes("CROSS_SELL")) {
    return;
  }

  reasons.push({
    code: "CROSS_SELL",
    severity: "LOW",
    value: 1,
    scoreImpact: config.weights.crossSell,
    message: "Customer is identified as a cross-sell candidate."
  });
  actions.add("CROSS_SELL");
}

function addRecentInteractionReason(
  input: CustomerServiceRuleInput,
  config: CustomerServiceRulesConfig,
  reasons: CustomerServicePriorityReason[],
  now: Date
) {
  if (!input.lastInteractionAt) {
    return;
  }

  const ageDays = Math.floor(
    (startOfDay(now).getTime() - startOfDay(new Date(input.lastInteractionAt)).getTime()) /
      86_400_000
  );

  const hasBlockingUrgency =
    input.overdueTaskCount > 0 ||
    input.campaignClickedWithoutConversion ||
    (input.daysSinceLastOrder !== null && input.daysSinceLastOrder >= config.criticalDays);

  if (ageDays < 0 || ageDays > config.recentInteractionSuppressionDays || hasBlockingUrgency) {
    return;
  }

  reasons.push({
    code: "RECENT_INTERACTION",
    severity: "LOW",
    value: ageDays,
    scoreImpact: config.weights.recentInteractionReduction,
    message: `Customer had an interaction ${ageDays} days ago; avoid repeated contact unless required.`
  });
}

function mapReasonSeverity(scoreImpact: number): CustomerServicePriorityLevel {
  if (scoreImpact >= 35) {
    return "CRITICAL";
  }

  if (scoreImpact >= 25) {
    return "HIGH";
  }

  if (scoreImpact >= 15) {
    return "MEDIUM";
  }

  return "LOW";
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
