import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivityReportPage } from "./ActivityReportPage";

describe("activity report localization", () => {
  it("renders Slovak filters and a bounded loading state", () => {
    const markup = renderToStaticMarkup(<ActivityReportPage />);

    expect(markup).toContain("Report aktivít");
    expect(markup).toContain("Filtre reportu aktivít");
    expect(markup).toContain("Všetky roly");
    expect(markup).toContain("Načítava sa report aktivít");
  });
});
