import type {
  AIProvider,
  AIProviderOptions,
  AIProviderResult,
  CustomerAssistantContext
} from "./types";

export class MockAIProvider implements AIProvider {
  async generateCustomerAssistance(
    context: CustomerAssistantContext,
    options: AIProviderOptions
  ): Promise<AIProviderResult> {
    const action = context.priority.deterministicActions[0] ?? "REVIEW_CUSTOMER";
    const reason =
      context.priority.reasons[0]?.message ?? "No urgent deterministic trigger is recorded.";
    const crossSell =
      context.crossSellSignals.length > 0
        ? `Review ${context.crossSellSignals.join(", ")} using the recorded purchase history.`
        : null;
    return {
      provider: "MOCK",
      model: options.model,
      output: {
        customerSummary: `${context.customer.companyName} is a ${context.customer.b2bStatus} B2B account with ${context.commercial.turnover90d.toFixed(0)} ${context.commercial.currency} turnover in the last 90 days.`,
        priorityExplanation: reason,
        callReason: action.replaceAll("_", " ").toLowerCase(),
        callObjective: `Confirm the customer's current situation and agree the next human-reviewed step for ${action.replaceAll("_", " ").toLowerCase()}.`,
        recommendedAction: `Use the deterministic ${action} recommendation as the agenda and record the customer's response.`,
        suggestedOpening: `Hello, I am calling from NICO to check how things are going with your current needs and recent orders.`,
        objectionsToPrepareFor: [
          "Timing may not be convenient.",
          "Current stock or demand may be sufficient."
        ],
        crossSellOpportunity: crossSell,
        riskSummary:
          context.commercial.salesTrend === "down"
            ? "Recorded 90-day turnover is below the previous comparison period."
            : null,
        confidence: context.priority.reasons.length > 0 ? "HIGH" : "LOW"
      }
    };
  }
}
