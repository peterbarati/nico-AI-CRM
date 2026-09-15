export const opportunityTypes = [
  "REORDER",
  "REACTIVATION",
  "RETENTION",
  "CROSS_SELL",
  "B2B_REGISTRATION",
  "CAMPAIGN_FOLLOW_UP",
  "TASK_FOLLOW_UP",
  "OVERDUE_VISIT",
  "STRATEGIC",
  "OTHER"
] as const;
export type OpportunityType = (typeof opportunityTypes)[number];

export const opportunityStatuses = [
  "OPEN",
  "ACCEPTED",
  "DISMISSED",
  "CONVERTED",
  "EXPIRED"
] as const;
export type OpportunityStatus = (typeof opportunityStatuses)[number];

export const salesRouteStatuses = [
  "DRAFT",
  "RECOMMENDED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
] as const;
export type SalesRouteStatus = (typeof salesRouteStatuses)[number];

export const salesRouteStopStatuses = ["PLANNED", "REMOVED", "VISIT_PLANNED", "COMPLETED"] as const;
export type SalesRouteStopStatus = (typeof salesRouteStopStatuses)[number];

export function isOpportunityType(value: unknown): value is OpportunityType {
  return opportunityTypes.includes(value as OpportunityType);
}

export function isOpportunityStatus(value: unknown): value is OpportunityStatus {
  return opportunityStatuses.includes(value as OpportunityStatus);
}

export function isSalesRouteStatus(value: unknown): value is SalesRouteStatus {
  return salesRouteStatuses.includes(value as SalesRouteStatus);
}
