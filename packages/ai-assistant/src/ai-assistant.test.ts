import { describe, expect, it, vi } from "vitest";
import {
  MockAIProvider,
  OpenAIProvider,
  customerCommercialAssistantPromptVersion,
  validateCustomerAssistantOutput,
  type CustomerAssistantContext
} from "./index";

const context: CustomerAssistantContext = {
  contextVersion: "customer-commercial-context-v1",
  purpose: "CALL_PREPARATION",
  customer: {
    customerId: "cus-1",
    companyName: "Demo Shop",
    city: "Bratislava",
    assignedSalesRepName: "Sales User",
    b2bStatus: "missing"
  },
  commercial: {
    lastOrderDate: "2026-06-01",
    daysSinceLastOrder: 100,
    averageReorderDays: 30,
    turnover30d: 0,
    turnover90d: 100,
    previousTurnover90d: 300,
    turnover365d: 800,
    salesTrend: "down",
    averageOrderValue: 100,
    lifetimeTurnover: 2000,
    currency: "EUR"
  },
  priority: {
    score: 70,
    level: "CRITICAL",
    reasons: [{ code: "INACTIVITY", message: "No order for 100 days.", value: 100 }],
    deterministicActions: ["REACTIVATION"]
  },
  segments: [],
  recentInteractions: [],
  latestVisit: null,
  latestOrders: [],
  openTasks: [],
  campaign: null,
  purchasedProducts: [],
  purchasedCategories: [],
  crossSellSignals: []
};

describe("AI assistant providers", () => {
  it("returns deterministic grounded mock assistance", async () => {
    const result = await new MockAIProvider().generateCustomerAssistance(context, {
      model: "mock-v1",
      maxOutputTokens: 500,
      timeoutMs: 1000
    });
    expect(result.output.priorityExplanation).toBe("Zákazník neobjednal 100 dní.");
    expect(result.output.customerSummary).toContain("bez registrácie");
    expect(result.output.customerSummary).not.toContain("missing");
    expect(result.output.suggestedOpening).toContain("Dobrý deň");
    expect(result.output.confidence).toBe("HIGH");
    expect(customerCommercialAssistantPromptVersion).toBe("customer-commercial-assistant-v3-sk");
  });

  it("rejects malformed structured output", () => {
    expect(() => validateCustomerAssistantOutput({ customerSummary: "partial" })).toThrow();
    expect(() =>
      validateCustomerAssistantOutput({
        customerSummary: "Summary",
        priorityExplanation: "Priority",
        callReason: "Reason",
        callObjective: "Objective",
        recommendedAction: "Action",
        suggestedOpening: "Opening",
        objectionsToPrepareFor: [],
        crossSellOpportunity: null,
        riskSummary: null,
        confidence: "HIGH",
        unsupported: "must not pass"
      })
    ).toThrow("unsupported fields");
  });

  it("uses the provider abstraction and validates OpenAI structured output", async () => {
    const output = await new MockAIProvider().generateCustomerAssistance(context, {
      model: "mock-v1",
      maxOutputTokens: 500,
      timeoutMs: 1000
    });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify(output.output),
          usage: { input_tokens: 10, output_tokens: 20 }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const result = await new OpenAIProvider("test-key", fetcher).generateCustomerAssistance(
      context,
      { model: "test-model", maxOutputTokens: 500, timeoutMs: 1000 }
    );
    expect(result).toMatchObject({ provider: "OPENAI", inputTokens: 10, outputTokens: 20 });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("rejects malformed provider output and enforces timeout cancellation", async () => {
    const malformed = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ output_text: "{}" }), { status: 200 }));
    await expect(
      new OpenAIProvider("test", malformed).generateCustomerAssistance(context, {
        model: "test",
        maxOutputTokens: 500,
        timeoutMs: 1000
      })
    ).rejects.toThrow("customerSummary");

    const hanging = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          )
        )
    );
    await expect(
      new OpenAIProvider("test", hanging as typeof fetch).generateCustomerAssistance(context, {
        model: "test",
        maxOutputTokens: 500,
        timeoutMs: 5
      })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
