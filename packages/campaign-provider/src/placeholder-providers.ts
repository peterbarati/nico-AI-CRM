import { CampaignProviderUnavailableError, type CampaignProvider } from "./types";

abstract class UnconfiguredCampaignProvider implements CampaignProvider {
  abstract readonly code: "ECOMAIL" | "OMNISEND";
  readonly capabilities = {
    channels: [],
    contactSynchronization: false,
    audienceSynchronization: false,
    campaignCreation: false,
    campaignDelivery: false,
    trackingEvents: false,
    webhooks: false
  } as const;
  async send(): Promise<never> {
    throw new CampaignProviderUnavailableError(this.code);
  }
}
export class EcomailCampaignProvider extends UnconfiguredCampaignProvider {
  readonly code = "ECOMAIL" as const;
}
export class OmnisendCampaignProvider extends UnconfiguredCampaignProvider {
  readonly code = "OMNISEND" as const;
}
