export type AssistantPurpose = "CALL_PREPARATION" | "CUSTOMER_OVERVIEW" | "SALES_VISIT_PREPARATION";
export type AssistantConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface CustomerAssistantContext {
  contextVersion: "customer-commercial-context-v1";
  purpose: AssistantPurpose;
  customer: {
    customerId: string;
    companyName: string;
    city: string | null;
    assignedSalesRepName: string | null;
    b2bStatus: string;
  };
  commercial: {
    lastOrderDate: string | null;
    daysSinceLastOrder: number | null;
    averageReorderDays: number | null;
    turnover30d: number;
    turnover90d: number;
    previousTurnover90d: number;
    turnover365d: number;
    salesTrend: string;
    averageOrderValue: number | null;
    lifetimeTurnover: number;
    currency: string;
  };
  priority: {
    score: number;
    level: string;
    reasons: Array<{ code: string; message: string; value: number }>;
    deterministicActions: string[];
  };
  segments: Array<{ code: string; reason: string | null }>;
  recentInteractions: Array<{
    type: string;
    reason: string | null;
    result: string | null;
    occurredAt: string;
  }>;
  latestVisit: { result: string | null; status: string; occurredAt: string | null } | null;
  latestOrders: Array<{ orderDate: string; netAmount: number; currency: string; status: string }>;
  openTasks: Array<{ title: string; priority: string; dueAt: string | null; overdue: boolean }>;
  campaign: { sent: boolean; opened: boolean; clicked: boolean; converted: boolean } | null;
  purchasedProducts: string[];
  purchasedCategories: string[];
  crossSellSignals: string[];
}

export interface CustomerAssistantOutput {
  customerSummary: string;
  priorityExplanation: string;
  callReason: string;
  callObjective: string;
  recommendedAction: string;
  suggestedOpening: string;
  objectionsToPrepareFor: string[];
  crossSellOpportunity: string | null;
  riskSummary: string | null;
  confidence: AssistantConfidence;
}

export interface AIProviderOptions {
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
}

export interface AIProviderResult {
  output: CustomerAssistantOutput;
  provider: "MOCK" | "OPENAI";
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIProvider {
  generateCustomerAssistance(
    context: CustomerAssistantContext,
    options: AIProviderOptions
  ): Promise<AIProviderResult>;
}
