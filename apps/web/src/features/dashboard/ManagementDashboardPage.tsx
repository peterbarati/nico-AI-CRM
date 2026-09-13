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

export interface DashboardLoadState {
  loading: false;
  report: ManagementDashboard | null;
  error: string | null;
}

export async function loadDashboard(
  filters: DashboardFilters,
  loader = fetchManagementDashboard
): Promise<DashboardLoadState> {
  try {
    return { loading: false, report: await loader(filters), error: null };
  } catch (error) {
    return {
      loading: false,
      report: null,
      error: error instanceof Error ? error.message : "Dashboard unavailable."
    };
  }
}

export function ManagementDashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState<ManagementDashboard | null>(null);
  const [knownUsers, setKnownUsers] = useState<ManagementDashboard["users"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const update = (key: keyof DashboardFilters, value: string) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "role" ? { userId: "" } : {})
    }));

  useEffect(() => {
    if (filters.period === "custom" && (!filters.from || !filters.to)) {
      setLoading(false);
      setReport(null);
      setError(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setReport(null);
    setError(null);
    void loadDashboard(filters).then((state) => {
      if (!mounted) return;
      setLoading(state.loading);
      setError(state.error);
      setReport(state.report);
      if (state.report && !filters.role && !filters.userId) setKnownUsers(state.report.users);
    });
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
      <DashboardContent loading={loading} error={error} report={report} />
    </section>
  );
}

export function DashboardContent({
  loading,
  error,
  report
}: {
  loading: boolean;
  error: string | null;
  report: ManagementDashboard | null;
}) {
  if (loading) return <div className="loading-state">Loading management dashboard...</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (report) return <ManagementDashboardView report={report} />;
  return <div className="empty-state">Select a complete date range to load the dashboard.</div>;
}
