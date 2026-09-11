import { useEffect, useState } from "react";
import { fetchManagementDashboard } from "./api";
import { ManagementDashboardView } from "./ManagementDashboardView";
import type { DashboardFilters, ManagementDashboard } from "./types";

const initialFilters: DashboardFilters = {
  period: "month",
  from: "",
  to: "",
  role: "",
  userId: ""
};

export function ManagementDashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState<ManagementDashboard | null>(null);
  const [knownUsers, setKnownUsers] = useState<ManagementDashboard["users"]>([]);
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof DashboardFilters, value: string) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "role" ? { userId: "" } : {})
    }));

  useEffect(() => {
    if (filters.period === "custom" && (!filters.from || !filters.to)) return;
    let mounted = true;
    setError(null);
    fetchManagementDashboard(filters)
      .then((data) => {
        if (!mounted) return;
        setReport(data);
        if (!filters.role && !filters.userId) setKnownUsers(data.users);
      })
      .catch(
        (error: unknown) =>
          mounted && setError(error instanceof Error ? error.message : "Dashboard unavailable.")
      );
    return () => {
      mounted = false;
    };
  }, [filters]);

  const userOptions = knownUsers.filter((user) => !filters.role || user.role === filters.role);
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Management</p>
          <h2>Commercial dashboard</h2>
        </div>
        <p>Deterministic company, team, and user performance from normalized CRM facts.</p>
      </div>
      <section className="filter-panel dashboard-filters" aria-label="Dashboard filters">
        <label>
          Period
          <select value={filters.period} onChange={(event) => update("period", event.target.value)}>
            <option value="month">Current month</option>
            <option value="previous_month">Previous month</option>
            <option value="week">Current week</option>
            <option value="day">Today</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {filters.period === "custom" ? (
          <>
            <label>
              From
              <input
                type="date"
                value={filters.from}
                onChange={(event) => update("from", event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={filters.to}
                onChange={(event) => update("to", event.target.value)}
              />
            </label>
          </>
        ) : null}
        <label>
          Role
          <select value={filters.role} onChange={(event) => update("role", event.target.value)}>
            <option value="">All roles</option>
            <option value="customer_service">Customer Service</option>
            <option value="sales_rep">Sales</option>
          </select>
        </label>
        <label>
          User
          <select value={filters.userId} onChange={(event) => update("userId", event.target.value)}>
            <option value="">All users</option>
            {userOptions.map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.userName}
              </option>
            ))}
          </select>
        </label>
      </section>
      {error ? <div className="error-state">{error}</div> : null}
      {report ? (
        <ManagementDashboardView report={report} />
      ) : (
        <div className="loading-state">Loading management dashboard...</div>
      )}
    </section>
  );
}
