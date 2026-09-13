import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommercialAssistantContent, CommercialAssistantPanel } from "./CommercialAssistantPanel";
import { prepareCustomerAssistant } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("commercial assistant frontend", () => {
  it("renders an explicit not-generated advisory state", () => {
    const markup = renderToStaticMarkup(
      <CommercialAssistantPanel customerId="cus-1" customerName="Demo Shop" />
    );
    expect(markup).toContain("AI obchodný asistent");
    expect(markup).toContain("Odporúčanie ešte nebolo vytvorené");
    expect(markup).toContain("Pripraviť hovor");
  });

  it("renders loading, success, disabled, and provider error states", () => {
    const deterministic = {
      priority: {
        priorityScore: 70,
        priorityLevel: "CRITICAL",
        recommendedActions: ["REACTIVATION"],
        reasons: [{ message: "Customer is inactive." }]
      },
      commercial: { turnover90d: 100, daysSinceLastOrder: 90 },
      segments: [{ code: "AT_RISK" }]
    };
    const loading = renderToStaticMarkup(
      <CommercialAssistantContent data={null} error={null} loading />
    );
    const success = renderToStaticMarkup(
      <CommercialAssistantContent
        data={{
          status: "READY",
          deterministic,
          assistance: {
            customerSummary: "Customer activity is declining.",
            priorityExplanation: "The deterministic priority is critical.",
            callReason: "Reactivation",
            callObjective: "Confirm current needs.",
            recommendedAction: "Call the customer.",
            suggestedOpening: "Hello, I am checking in about your current needs.",
            objectionsToPrepareFor: [],
            crossSellOpportunity: null,
            riskSummary: "Order activity has declined.",
            confidence: "HIGH"
          },
          meta: {
            cached: false,
            provider: "MOCK",
            model: "mock-v1",
            promptVersion: "customer-commercial-assistant-v1",
            createdAt: "2026-09-11T10:00:00.000Z"
          }
        }}
        error={null}
        loading={false}
      />
    );
    const disabled = renderToStaticMarkup(
      <CommercialAssistantContent
        data={{ status: "DISABLED", assistance: null, deterministic }}
        error={null}
        loading={false}
      />
    );
    const providerError = renderToStaticMarkup(
      <CommercialAssistantContent data={null} error="Provider failed." loading={false} />
    );

    expect(loading).toContain("Pripravujú sa odporúčania");
    expect(success).toContain("Fakty");
    expect(success).toContain("AI odporúčanie");
    expect(disabled).toContain("AI je vypnutá");
    expect(providerError).toContain("AI asistent momentálne nie je dostupný");
  });

  it("handles structured success and provider errors", async () => {
    const success = {
      status: "DISABLED",
      assistance: null,
      deterministic: {
        priority: { priorityScore: 10, priorityLevel: "LOW", recommendedActions: [], reasons: [] },
        commercial: null,
        segments: []
      }
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: success }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "AI_PROVIDER_UNAVAILABLE", message: "AI unavailable" }
          }),
          {
            status: 503,
            headers: { "content-type": "application/json" }
          }
        )
      );
    vi.stubGlobal("fetch", fetcher);
    await expect(prepareCustomerAssistant("cus-1")).resolves.toMatchObject({ status: "DISABLED" });
    await expect(prepareCustomerAssistant("cus-1")).rejects.toThrow("AI unavailable");
  });
});
