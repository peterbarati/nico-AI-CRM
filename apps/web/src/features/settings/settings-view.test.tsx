import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsPage } from "./SettingsPage";

describe("settings localization", () => {
  it("renders the Slovak settings loading state", () => {
    expect(renderToStaticMarkup(<SettingsPage />)).toContain("Načítavajú sa firemné nastavenia");
  });
});
