import type { CampaignProviderCode } from "@nico-ai-crm/shared";
import { MockCampaignProvider } from "./mock-provider";
import { EcomailCampaignProvider, OmnisendCampaignProvider } from "./placeholder-providers";
import type { CampaignProvider } from "./types";

export function createCampaignProvider(code: CampaignProviderCode): CampaignProvider {
  switch (code) {
    case "MOCK":
      return new MockCampaignProvider();
    case "ECOMAIL":
      return new EcomailCampaignProvider();
    case "OMNISEND":
      return new OmnisendCampaignProvider();
  }
}
