import type { CampaignProviderCode } from "@nico-ai-crm/shared";

export interface CampaignDeliveryMember {
  membershipId: string;
  customerId: string;
}
export interface CampaignDeliveryOutcome {
  membershipId: string;
  externalMemberId: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  convertedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
}
export interface CampaignProvider {
  readonly code: CampaignProviderCode;
  send(input: {
    campaignId: string;
    members: CampaignDeliveryMember[];
    occurredAt: string;
  }): Promise<CampaignDeliveryOutcome[]>;
}
export class CampaignProviderUnavailableError extends Error {
  constructor(public readonly provider: CampaignProviderCode) {
    super(`${provider} campaign provider is not configured.`);
    this.name = "CampaignProviderUnavailableError";
  }
}
