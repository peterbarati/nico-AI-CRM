export type UserRole = "admin" | "manager" | "customer_service" | "sales_rep";

export const permissions = [
  "CUSTOMERS_READ",
  "CUSTOMER_INTERACTIONS_WRITE",
  "CUSTOMER_SERVICE_QUEUE_READ",
  "SALES_QUEUE_READ",
  "SALES_VISIT_WRITE",
  "SALES_OPPORTUNITIES_READ",
  "SALES_OPPORTUNITIES_WRITE",
  "SALES_ROUTES_READ",
  "SALES_ROUTES_WRITE",
  "TASKS_READ",
  "TASK_WRITE",
  "DASHBOARD_READ",
  "REPORTS_READ",
  "KPI_READ",
  "SETTINGS_READ",
  "SETTINGS_WRITE",
  "AI_ASSISTANT_USE",
  "USER_ADMIN",
  "USER_REFERENCES_READ",
  "CAMPAIGNS_READ",
  "CAMPAIGNS_WRITE",
  "CAMPAIGNS_EXECUTE"
] as const;

export type Permission = (typeof permissions)[number];

export interface ProviderIdentity {
  provider: string;
  subject: string;
  email: string | null;
  name: string | null;
  crmUserId?: string;
}

export interface AuthenticatedActor {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  provider: string;
  providerIdentityId: string;
  permissions: Permission[];
}

export interface AuthProvider {
  readonly mode: "MOCK" | "OIDC";
  authenticate(request: Request): Promise<ProviderIdentity | null>;
}

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

export class InvalidAuthenticationError extends Error {
  constructor(message = "Authentication token is invalid.") {
    super(message);
    this.name = "InvalidAuthenticationError";
  }
}
