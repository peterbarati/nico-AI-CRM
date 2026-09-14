import type { CampaignDeliveryOutcome, CampaignProvider } from "./types";

export class MockCampaignProvider implements CampaignProvider {
  readonly code = "MOCK" as const;

  async send(input: Parameters<CampaignProvider["send"]>[0]): Promise<CampaignDeliveryOutcome[]> {
    return input.members.map((member) => {
      const score = [...`${input.campaignId}:${member.customerId}`].reduce(
        (sum, char) => sum + char.charCodeAt(0),
        0
      );
      const failed = score % 11 === 0;
      const opened = !failed && score % 2 === 0;
      const clicked = opened && score % 3 === 0;
      const converted = clicked && score % 5 === 0;
      return {
        membershipId: member.membershipId,
        externalMemberId: `mock-${member.membershipId}`,
        sentAt: failed ? null : input.occurredAt,
        deliveredAt: failed ? null : input.occurredAt,
        openedAt: opened ? input.occurredAt : null,
        clickedAt: clicked ? input.occurredAt : null,
        convertedAt: converted ? input.occurredAt : null,
        failedAt: failed ? input.occurredAt : null,
        failureReason: failed ? "DETERMINISTIC_MOCK_FAILURE" : null
      };
    });
  }
}
