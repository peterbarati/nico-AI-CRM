import { describe, expect, it } from "vitest";
import { campaignRate, canTransitionCampaign } from "./campaigns";

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
});
