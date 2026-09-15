import { describe, expect, it } from "vitest";
import {
  CampaignProviderUnavailableError,
  EcomailCampaignProvider,
  MockCampaignProvider,
  OmnisendCampaignProvider,
  createCampaignProvider
} from "./index";

describe("campaign providers", () => {
  it("returns deterministic normalized mock outcomes", async () => {
    const provider = new MockCampaignProvider();
    expect(provider.capabilities).toMatchObject({
      channels: ["EMAIL"],
      campaignDelivery: true,
      trackingEvents: true
    });
    const input = {
      campaignId: "cmp-test",
      occurredAt: "2026-09-14T10:00:00.000Z",
      members: [
        { membershipId: "mem-1", customerId: "cus-001" },
        { membershipId: "mem-2", customerId: "cus-002" }
      ]
    };
    expect(await provider.send(input)).toEqual(await provider.send(input));
  });

  it.each([new EcomailCampaignProvider(), new OmnisendCampaignProvider()])(
    "fails closed for unconfigured $code provider",
    async (provider) => {
      expect(provider.capabilities.campaignDelivery).toBe(false);
      await expect(
        provider.send({ campaignId: "x", occurredAt: "x", members: [] })
      ).rejects.toBeInstanceOf(CampaignProviderUnavailableError);
    }
  );

  it("creates the requested implementation without a fallback", () => {
    expect(createCampaignProvider("MOCK")).toBeInstanceOf(MockCampaignProvider);
    expect(createCampaignProvider("ECOMAIL")).toBeInstanceOf(EcomailCampaignProvider);
    expect(createCampaignProvider("OMNISEND")).toBeInstanceOf(OmnisendCampaignProvider);
  });
});
