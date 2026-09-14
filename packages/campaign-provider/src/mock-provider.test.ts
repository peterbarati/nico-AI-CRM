import { describe, expect, it } from "vitest";
import {
  BrevoCampaignProvider,
  CampaignProviderUnavailableError,
  MockCampaignProvider
} from "./index";

describe("campaign providers", () => {
  it("returns deterministic normalized mock outcomes", async () => {
    const provider = new MockCampaignProvider();
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

  it("fails closed for unconfigured real providers", async () => {
    await expect(
      new BrevoCampaignProvider().send({ campaignId: "x", occurredAt: "x", members: [] })
    ).rejects.toBeInstanceOf(CampaignProviderUnavailableError);
  });
});
