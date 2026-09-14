import { CampaignProviderUnavailableError, type CampaignProvider } from "./types";

abstract class UnconfiguredCampaignProvider implements CampaignProvider {
  abstract readonly code: "BREVO" | "MAILCHIMP";
  async send(): Promise<never> {
    throw new CampaignProviderUnavailableError(this.code);
  }
}
export class BrevoCampaignProvider extends UnconfiguredCampaignProvider {
  readonly code = "BREVO" as const;
}
export class MailchimpCampaignProvider extends UnconfiguredCampaignProvider {
  readonly code = "MAILCHIMP" as const;
}
