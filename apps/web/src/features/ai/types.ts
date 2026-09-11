import type { CustomerAssistantOutput } from "@nico-ai-crm/ai-assistant";

export interface CustomerAssistantData {
  status: "READY" | "DISABLED" | "UNAVAILABLE";
  assistance: CustomerAssistantOutput | null;
  deterministic: {
    priority: {
      priorityScore: number;
      priorityLevel: string;
      recommendedActions: string[];
      reasons: Array<{ message: string }>;
    };
    commercial: { turnover90d?: number; daysSinceLastOrder?: number | null } | null;
    segments: Array<{ code: string }>;
  };
  message?: string;
  meta?: {
    cached: boolean;
    provider: string;
    model: string;
    promptVersion: string;
    createdAt: string;
  };
}
