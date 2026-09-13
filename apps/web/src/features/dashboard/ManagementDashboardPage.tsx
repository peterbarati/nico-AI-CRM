import { useEffect, useState } from "react";
import { fetchManagementDashboard } from "./api";
import { ManagementDashboardView } from "./ManagementDashboardView";
import type { DashboardFilters, ManagementDashboard } from "./types";
import { apiErrorMessage, displayLabel, t } from "../../i18n";

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
      error: apiErrorMessage(error, "Prehľad momentálne nie je dostupný.")
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
          <p className="eyebrow">{t("Management")}</p>
          <h2>{t("Commercial dashboard")}</h2>
        </div>
        <p>{t("Deterministic company, team, and user performance from normalized CRM facts.")}</p>
      </div>
      <section className="filter-panel dashboard-filters" aria-label={t("Dashboard filters")}>
        <label>
          {t("Period")}
          <select value={filters.period} onChange={(event) => update("period", event.target.value)}>
            <option value="month">{t("Current month")}</option>
            <option value="previous_month">{t("Previous month")}</option>
            <option value="week">{t("Current week")}</option>
            <option value="day">{t("Today")}</option>
            <option value="custom">{t("Custom")}</option>
          </select>
        </label>
        {filters.period === "custom" ? (
          <>
            <label>
              {t("From")}
              <input
                type="date"
                value={filters.from}
                onChange={(event) => update("from", event.target.value)}
              />
            </label>
            <label>
              {t("To")}
              <input
                type="date"
                value={filters.to}
                onChange={(event) => update("to", event.target.value)}
              />
            </label>
          </>
        ) : null}
        <label>
          {t("Role")}
          <select value={filters.role} onChange={(event) => update("role", event.target.value)}>
            <option value="">{t("All roles")}</option>
            <option value="customer_service">{displayLabel("customer_service")}</option>
            <option value="sales_rep">{displayLabel("sales_rep")}</option>
          </select>
        </label>
        <label>
          {t("User")}
          <select value={filters.userId} onChange={(event) => update("userId", event.target.value)}>
            <option value="">{t("All users")}</option>
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
  if (loading) return <div className="loading-state">{t("Loading management dashboard...")}</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (report) return <ManagementDashboardView report={report} />;
  return (
    <div className="empty-state">{t("Select a complete date range to load the dashboard.")}</div>
  );
}
