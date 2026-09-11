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
