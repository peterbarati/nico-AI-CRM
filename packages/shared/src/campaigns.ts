export const campaignStatuses = ["DRAFT", "READY", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export const campaignTypes = [
  "NEWSLETTER",
  "PRODUCT_LAUNCH",
  "PROMOTION",
  "REACTIVATION",
  "B2B",
  "CROSS_SELL",
  "INFORMATIONAL",
  "OTHER"
] as const;
export type CampaignType = (typeof campaignTypes)[number];

export const campaignAudienceKinds = ["SEGMENT", "MANUAL", "FILTERED"] as const;
export type CampaignAudienceKind = (typeof campaignAudienceKinds)[number];
export const campaignProviderCodes = ["MOCK", "ECOMAIL", "OMNISEND"] as const;
export type CampaignProviderCode = (typeof campaignProviderCodes)[number];
export const campaignChannels = ["EMAIL", "SMS", "PUSH"] as const;
export type CampaignChannel = (typeof campaignChannels)[number];
export type CampaignEventType =
  | "PREPARED"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "CLICKED"
  | "FAILED"
  | "CONVERTED"
  | "COMPLETED"
  | "CANCELLED";

export interface CampaignAudienceConfig {
  segmentCode?: string;
  customerIds?: string[];
  active?: boolean;
  b2bStatus?: string;
  assignedSalesRepId?: string;
  inactivityDays?: number;
  city?: string;
  country?: string;
}

export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return campaignStatuses.includes(value as CampaignStatus);
}
export function isCampaignType(value: unknown): value is CampaignType {
  return campaignTypes.includes(value as CampaignType);
}
export function isCampaignAudienceKind(value: unknown): value is CampaignAudienceKind {
  return campaignAudienceKinds.includes(value as CampaignAudienceKind);
}
export function isCampaignProviderCode(value: unknown): value is CampaignProviderCode {
  return campaignProviderCodes.includes(value as CampaignProviderCode);
}
export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus): boolean {
  if (to === "CANCELLED") return !["COMPLETED", "CANCELLED"].includes(from);
  return (
    (from === "DRAFT" && to === "READY") ||
    (from === "READY" && to === "ACTIVE") ||
    (from === "ACTIVE" && to === "COMPLETED")
  );
}
export function campaignRate(value: number, denominator: number): number {
  return denominator > 0 ? (value / denominator) * 100 : 0;
}
