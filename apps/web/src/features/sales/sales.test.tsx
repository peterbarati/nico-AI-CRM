import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SalesPage } from "./SalesPage";

describe("sales localization", () => {
  it("renders Slovak filters while preserving internal option values", () => {
    const markup = renderToStaticMarkup(<SalesPage onNavigate={() => undefined} />);

    expect(markup).toContain("Obchodné úlohy");
    expect(markup).toContain("Všetci obchodní zástupcovia");
    expect(markup).toContain('value="in_progress"');
    expect(markup).toContain("Prebieha");
    expect(markup).toContain("Načítavajú sa obchodné úlohy");
  });
});
