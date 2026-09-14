import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCampaigns, updateCampaign } from "./api";
import { CampaignFormModal } from "./CampaignFormModal";

afterEach(() => vi.unstubAllGlobals());

describe("Campaigns frontend", () => {
  it("loads campaigns through the shared credentialed API client", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        ok: true,
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchCampaigns({ page: 1, pageSize: 20, search: "", status: "", campaignType: "" })
    ).resolves.toMatchObject({ items: [], pagination: { total: 0 } });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "same-origin" });
  });

  it("preserves structured campaign errors for localized UI handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "CAMPAIGN_STATE_INVALID", message: "Invalid transition." }
          }),
          { status: 409, headers: { "content-type": "application/json" } }
        )
      )
    );

    await expect(
      updateCampaign("cmp-1", {
        name: "Test",
        description: null,
        campaignType: "NEWSLETTER"
      })
    ).rejects.toMatchObject({ code: "CAMPAIGN_STATE_INVALID", status: 409 });
  });

  it("renders a Slovak creation form while keeping controlled codes internal", () => {
    const markup = renderToStaticMarkup(
      <CampaignFormModal
        customers={[]}
        segments={[
          {
            id: "seg-1",
            code: "ACTIVE",
            name: "Aktívni zákazníci",
            description: null,
            active: true,
            system: true
          }
        ]}
        users={[]}
        defaults={{ followUpDelayDays: 3, followUpClicked: true, followUpOpened: false }}
        onClose={() => undefined}
        onCreated={() => undefined}
      />
    );

    expect(markup).toContain("Pridať kampaň");
    expect(markup).toContain("Názov kampane");
    expect(markup).toContain("Zobraziť náhľad publika");
    expect(markup).toContain('value="PRODUCT_LAUNCH"');
    expect(markup).toContain("Uvedenie produktu");
    expect(markup).toContain('value="3"');
  });

  it("provides localized empty and error-state copy", async () => {
    const { t } = await import("../../i18n");
    expect(t("No campaigns")).toBe("Žiadne kampane");
    expect(t("No campaign activity")).toBe("Žiadna aktivita kampane");
    expect(t("Campaigns unavailable")).toBe("Kampane nie sú dostupné");
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
