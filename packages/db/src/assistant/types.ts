export interface CustomerAssistantSupplement {
  latestVisit: { result: string | null; status: string; occurredAt: string | null } | null;
  campaign: { sent: boolean; opened: boolean; clicked: boolean; converted: boolean } | null;
  purchasedProducts: string[];
  purchasedCategories: string[];
  overdueTaskIds: string[];
}

export interface CachedAssistantRun {
  id: string;
  responseJson: string;
  provider: string;
  model: string;
  createdAt: string;
}

export interface RecordAssistantRunInput {
  id: string;
  customerId: string;
  purpose: string;
  provider: string;
  model: string;
  promptVersion: string;
  contextFingerprint: string;
  status: "success" | "failure";
  responseJson: string | null;
  errorCode: string | null;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  createdAt: string;
  expiresAt: string;
}
