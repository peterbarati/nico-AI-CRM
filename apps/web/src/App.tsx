import { useEffect, useMemo, useState } from "react";
import { AppShell, type NavItem } from "./layouts/AppShell";
import { CustomersPage } from "./features/customers/CustomersPage";
import { CustomerServicePage } from "./features/customer-service/CustomerServicePage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { SalesPage } from "./features/sales/SalesPage";
import { ActivityReportPage } from "./features/reports/activity/ActivityReportPage";
import { ManagementDashboardPage } from "./features/dashboard/ManagementDashboardPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { useAuth } from "./features/auth/AuthContext";
import { ForbiddenState } from "./features/auth/ForbiddenState";
import { UsersPage } from "./features/users/UsersPage";
import { TasksPage } from "./features/tasks/TasksPage";
import { CampaignsPage } from "./features/campaigns/CampaignsPage";
import { CampaignDetailPage } from "./features/campaigns/CampaignDetailPage";
import type { Permission } from "@nico-ai-crm/auth";
import { t } from "./i18n";

export const navItems: Array<NavItem & { permission: Permission }> = [
  { label: t("Dashboard"), path: "/", permission: "DASHBOARD_READ" },
  { label: t("Customers"), path: "/customers", permission: "CUSTOMERS_READ" },
  { label: t("Tasks"), path: "/tasks", permission: "TASKS_READ" },
  {
    label: t("Customer Service"),
    path: "/customer-service",
    permission: "CUSTOMER_SERVICE_QUEUE_READ"
  },
  { label: t("Sales"), path: "/sales", permission: "SALES_QUEUE_READ" },
  { label: t("Campaigns"), path: "/campaigns", permission: "CAMPAIGNS_READ" },
  { label: t("Reports"), path: "/reports", permission: "REPORTS_READ" },
  { label: t("Settings"), path: "/settings", permission: "SETTINGS_READ" },
  { label: t("Users"), path: "/users", permission: "USER_ADMIN" }
];

export function App() {
  const { actor, logout } = useAuth();
  const [path, setPath] = useState(() => window.location.pathname);
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => actor.permissions.includes(item.permission)),
    [actor.permissions]
  );

  useEffect(() => {
    if (path !== "/" || actor.permissions.includes("DASHBOARD_READ")) return;
    const firstPath = visibleNavItems[0]?.path;
    if (!firstPath) return;
    window.history.replaceState({}, "", firstPath);
    setPath(firstPath);
  }, [actor.permissions, path, visibleNavItems]);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activeItem = useMemo(
    () =>
      visibleNavItems.find((item) => item.path !== "/" && path.startsWith(item.path)) ??
      visibleNavItems.find((item) => item.path === "/") ??
      visibleNavItems[0],
    [path, visibleNavItems]
  );

  function navigate(nextPath: string) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  const customerDetailMatch = path.match(/^\/customers\/([^/]+)$/);
  const campaignDetailMatch = path.match(/^\/campaigns\/([^/]+)$/);
  const permission = permissionForPath(path);
  const page =
    permission && !actor.permissions.includes(permission) ? (
      <ForbiddenState />
    ) : path === "/" || path === "/dashboard" ? (
      <ManagementDashboardPage />
    ) : path === "/customers" || customerDetailMatch ? (
      <CustomersPage customerId={customerDetailMatch?.[1]} onNavigate={navigate} />
    ) : path === "/customer-service" ? (
      <CustomerServicePage onNavigate={navigate} />
    ) : path === "/tasks" ? (
      <TasksPage onNavigate={navigate} />
    ) : path === "/sales" ? (
      <SalesPage onNavigate={navigate} />
    ) : campaignDetailMatch ? (
      <CampaignDetailPage
        campaignId={campaignDetailMatch[1]}
        onBack={() => navigate("/campaigns")}
        onOpenCustomer={(id) => navigate(`/customers/${id}`)}
      />
    ) : path === "/campaigns" ? (
      <CampaignsPage onNavigate={navigate} />
    ) : path === "/reports/activity" || path === "/reports" ? (
      <ActivityReportPage />
    ) : path === "/settings" ? (
      <SettingsPage canWrite={actor.permissions.includes("SETTINGS_WRITE")} />
    ) : path === "/users" ? (
      <UsersPage />
    ) : (
      <ComingSoonPage title={activeItem.label} />
    );

  return (
    <AppShell
      activePath={activeItem?.path ?? ""}
      actor={actor}
      navItems={visibleNavItems}
      onLogout={() => void logout()}
      onNavigate={navigate}
    >
      {page}
    </AppShell>
  );
}

export function permissionForPath(path: string): Permission | null {
  if (path === "/" || path === "/dashboard") return "DASHBOARD_READ";
  if (path.startsWith("/customers")) return "CUSTOMERS_READ";
  if (path === "/tasks") return "TASKS_READ";
  if (path.startsWith("/campaigns")) return "CAMPAIGNS_READ";
  if (path === "/customer-service") return "CUSTOMER_SERVICE_QUEUE_READ";
  if (path === "/sales") return "SALES_QUEUE_READ";
  if (path.startsWith("/reports")) return "REPORTS_READ";
  if (path === "/settings") return "SETTINGS_READ";
  if (path === "/users") return "USER_ADMIN";
  return null;
}
