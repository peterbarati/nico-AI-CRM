import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsPage, campaignProviderOptions } from "./SettingsPage";

describe("settings localization", () => {
  it("renders the Slovak settings loading state", () => {
    expect(renderToStaticMarkup(<SettingsPage />)).toContain("Načítavajú sa firemné nastavenia");
  });

  it("offers approved providers and hides Mock outside development", () => {
    expect(campaignProviderOptions(true)).toEqual(["MOCK", "ECOMAIL", "OMNISEND"]);
    expect(campaignProviderOptions(false)).toEqual(["ECOMAIL", "OMNISEND"]);
  });
});
