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
    const reason = mockReason(
      context.priority.reasons[0]?.code,
      context.priority.reasons[0]?.value
    );
    const crossSell =
      context.crossSellSignals.length > 0
        ? `Podľa evidovanej histórie nákupov zvážte ponuku: ${context.crossSellSignals.join(", ")}.`
        : null;
    return {
      provider: "MOCK",
      model: options.model,
      output: {
        customerSummary: `${context.customer.companyName} je B2B zákazník so stavom ${b2bStatusLabel(context.customer.b2bStatus)} a obratom ${context.commercial.turnover90d.toFixed(0)} ${context.commercial.currency} za posledných 90 dní.`,
        priorityExplanation: reason,
        callReason: actionLabel(action),
        callObjective: `Overiť aktuálnu situáciu zákazníka a dohodnúť ďalší krok pre oblasť ${actionLabel(action)}.`,
        recommendedAction: `Použite odporúčanie ${actionLabel(action)} ako osnovu hovoru a zaznamenajte odpoveď zákazníka.`,
        suggestedOpening: `Dobrý deň, volám zo spoločnosti NICO. Rád by som overil vaše aktuálne potreby a situáciu s objednávkami.`,
        objectionsToPrepareFor: [
          "Termín hovoru nemusí zákazníkovi vyhovovať.",
          "Aktuálne zásoby alebo dopyt môžu byť dostatočné."
        ],
        crossSellOpportunity: crossSell,
        riskSummary:
          context.commercial.salesTrend === "down"
            ? "Evidovaný obrat za 90 dní je nižší ako v predchádzajúcom porovnateľnom období."
            : null,
        confidence: context.priority.reasons.length > 0 ? "HIGH" : "LOW"
      }
    };
  }
}

function b2bStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    registered: "registrovaný",
    missing: "bez registrácie",
    pending: "s rozpracovanou registráciou",
    not_applicable: "bez relevantnej B2B registrácie",
    unknown: "s nezisteným stavom registrácie"
  };
  return labels[status] ?? "s nezisteným stavom registrácie";
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    REORDER: "doplnenie zásob",
    RETENTION: "udržanie zákazníka",
    REACTIVATION: "reaktivácia",
    B2B_REGISTRATION: "B2B registrácia",
    CROSS_SELL: "cross-sell",
    CAMPAIGN_FOLLOW_UP: "follow-up kampane",
    TASK_FOLLOW_UP: "follow-up úlohy",
    REVIEW_CUSTOMER: "kontrola zákazníka"
  };
  return labels[action] ?? "ďalší obchodný krok";
}

function mockReason(code?: string, value?: number): string {
  if (code === "INACTIVITY" && value !== undefined)
    return `Zákazník neobjednal ${Math.abs(value)} dní.`;
  if (code === "SALES_DECLINE" && value !== undefined)
    return `Evidovaný obrat klesol o ${Math.abs(value)} %.`;
  if (code === "REORDER_OVERDUE" && value !== undefined)
    return `Očakávaný interval doobjednania bol prekročený o ${Math.abs(value)} dní.`;
  if (code === "B2B_MISSING") return "Zákazník nemá dokončenú B2B registráciu.";
  return "Nie je evidovaný naliehavý dôvod na kontaktovanie.";
}
