import type { AuthenticatedActor, Permission, UserRole } from "./types";

const allPermissions = [
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
] satisfies Permission[];

export const rolePermissions: Record<UserRole, readonly Permission[]> = {
  admin: allPermissions,
  manager: [
    "CUSTOMERS_READ",
    "CUSTOMER_SERVICE_QUEUE_READ",
    "SALES_QUEUE_READ",
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
    "AI_ASSISTANT_USE",
    "USER_REFERENCES_READ",
    "CAMPAIGNS_READ",
    "CAMPAIGNS_WRITE",
    "CAMPAIGNS_EXECUTE"
  ],
  customer_service: [
    "CUSTOMERS_READ",
    "CUSTOMER_INTERACTIONS_WRITE",
    "CUSTOMER_SERVICE_QUEUE_READ",
    "TASKS_READ",
    "TASK_WRITE",
    "AI_ASSISTANT_USE",
    "USER_REFERENCES_READ",
    "CAMPAIGNS_READ"
  ],
  sales_rep: [
    "CUSTOMERS_READ",
    "SALES_QUEUE_READ",
    "SALES_VISIT_WRITE",
    "SALES_OPPORTUNITIES_READ",
    "SALES_OPPORTUNITIES_WRITE",
    "SALES_ROUTES_READ",
    "SALES_ROUTES_WRITE",
    "TASKS_READ",
    "TASK_WRITE",
    "AI_ASSISTANT_USE",
    "USER_REFERENCES_READ"
  ]
};

export function resolvePermissions(role: UserRole): Permission[] {
  return [...rolePermissions[role]];
}

export function hasPermission(actor: AuthenticatedActor, permission: Permission): boolean {
  return actor.active && actor.permissions.includes(permission);
}
