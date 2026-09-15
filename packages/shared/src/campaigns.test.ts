import { describe, expect, it } from "vitest";
import {
  campaignProviderCodes,
  campaignRate,
  canTransitionCampaign,
  isCampaignProviderCode
} from "./campaigns";

describe("campaign contracts", () => {
  it("allows only the controlled lifecycle", () => {
    expect(canTransitionCampaign("DRAFT", "READY")).toBe(true);
    expect(canTransitionCampaign("READY", "ACTIVE")).toBe(true);
    expect(canTransitionCampaign("ACTIVE", "COMPLETED")).toBe(true);
    expect(canTransitionCampaign("ACTIVE", "CANCELLED")).toBe(true);
    expect(canTransitionCampaign("COMPLETED", "ACTIVE")).toBe(false);
  });

  it("calculates safe rates", () => {
    expect(campaignRate(2, 4)).toBe(50);
    expect(campaignRate(1, 0)).toBe(0);
  });

  it("exposes only the approved campaign provider codes", () => {
    expect(campaignProviderCodes).toEqual(["MOCK", "ECOMAIL", "OMNISEND"]);
    expect(isCampaignProviderCode("ECOMAIL")).toBe(true);
    expect(isCampaignProviderCode("OMNISEND")).toBe(true);
    expect(isCampaignProviderCode("BREVO")).toBe(false);
    expect(isCampaignProviderCode("MAILCHIMP")).toBe(false);
  });
});
