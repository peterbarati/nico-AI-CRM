export interface HealthResponse {
  ok: boolean;
  service: "nico-ai-crm-api";
  mode: "mock";
  timestamp: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  status: "lead" | "active" | "inactive";
}

export * from "./call-workflow";
export * from "./business-time";
export * from "./sales-workflow";
export * from "./tasks";
export * from "./campaigns";
export * from "./sales-opportunities";
export * from "./api-contract";
