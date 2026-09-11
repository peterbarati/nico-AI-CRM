import { useEffect, useMemo, useState } from "react";
import { AppShell, type NavItem } from "./layouts/AppShell";
import { CustomersPage } from "./features/customers/CustomersPage";
import { CustomerServicePage } from "./features/customer-service/CustomerServicePage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { SalesPage } from "./features/sales/SalesPage";
import { ActivityReportPage } from "./features/reports/activity/ActivityReportPage";
import { ManagementDashboardPage } from "./features/dashboard/ManagementDashboardPage";
import { SettingsPage } from "./features/settings/SettingsPage";

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/" },
  { label: "Customers", path: "/customers" },
  { label: "Tasks", path: "/tasks" },
  { label: "Customer Service", path: "/customer-service" },
  { label: "Sales", path: "/sales" },
  { label: "Campaigns", path: "/campaigns" },
  { label: "Reports", path: "/reports" },
  { label: "Settings", path: "/settings" }
];

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activeItem = useMemo(
    () =>
      navItems.find((item) => item.path !== "/" && path.startsWith(item.path)) ??
      navItems.find((item) => item.path === "/") ??
      navItems[0],
    [path]
  );

  function navigate(nextPath: string) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  const customerDetailMatch = path.match(/^\/customers\/([^/]+)$/);
  const page =
    path === "/" || path === "/dashboard" ? (
      <ManagementDashboardPage />
    ) : path === "/customers" || customerDetailMatch ? (
      <CustomersPage customerId={customerDetailMatch?.[1]} onNavigate={navigate} />
    ) : path === "/customer-service" ? (
      <CustomerServicePage onNavigate={navigate} />
    ) : path === "/sales" ? (
      <SalesPage onNavigate={navigate} />
    ) : path === "/reports/activity" || path === "/reports" ? (
      <ActivityReportPage />
    ) : path === "/settings" ? (
      <SettingsPage />
    ) : (
      <ComingSoonPage title={activeItem.label} />
    );

  return (
    <AppShell activePath={activeItem.path} navItems={navItems} onNavigate={navigate}>
      {page}
    </AppShell>
  );
}
