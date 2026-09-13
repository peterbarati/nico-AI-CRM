import { useEffect, useState } from "react";
import { fetchActivityReport } from "./api";
import type { ActivityReport } from "./types";
import { apiErrorMessage, displayLabel, formatDate, t } from "../../../i18n";

const initial = { period: "today", from: "", to: "", role: "", userId: "" };
const metricLabels = {
  callsCompleted: t("Completed"),
  customerInteractions: t("Interactions"),
  salesVisitsCompleted: t("Visits completed"),
  openTasks: t("Open tasks"),
  completedTasks: t("Tasks completed"),
  overdueTasks: t("Overdue tasks"),
  followUpsCreated: t("Follow-ups created"),
  csToSalesHandoffs: t("CS to Sales"),
  salesToCsHandoffs: t("Sales to CS"),
  reactivationActivities: t("Reactivation"),
  b2bActivities: t("B2B activity")
} as const;

export function ActivityReportPage() {
  const [filters, setFilters] = useState(initial);
  const [report, setReport] = useState<ActivityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const update = (key: keyof typeof initial, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (filters.period === "custom" && (!filters.from || !filters.to)) {
      setLoading(false);
      setReport(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setReport(null);
    setError(null);
    fetchActivityReport(filters)
      .then((data) => mounted && setReport(data))
      .catch(
        (error: unknown) =>
          mounted && setError(apiErrorMessage(error, "Report momentálne nie je dostupný."))
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [filters]);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("Reports")}</p>
          <h2>{t("Activity report")}</h2>
        </div>
        <p>{t("Operational activity summarized by business date and responsible user.")}</p>
      </div>
      <section className="filter-panel" aria-label={t("Activity report filters")}>
        <label>
          {t("Period")}
          <select value={filters.period} onChange={(event) => update("period", event.target.value)}>
            <option value="today">{t("Today")}</option>
            <option value="week">{t("This week")}</option>
            <option value="month">{t("This month")}</option>
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
      </section>
      {error ? <p className="form-error">{error}</p> : null}
      {report ? (
        <>
          <p className="report-period">
            {formatDate(report.period.fromDate)} – {formatDate(report.period.toDate)} ·{" "}
            {report.period.timezone}
          </p>
          <div className="metric-grid">
            {Object.entries(metricLabels).map(([key, label]) => (
              <article className="metric-card" key={key}>
                <span>{label}</span>
                <strong>{report.metrics[key as keyof typeof metricLabels]}</strong>
              </article>
            ))}
          </div>
          <div className="table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>{t("User")}</th>
                  <th>{t("Calls")}</th>
                  <th>{t("Interactions")}</th>
                  <th>{t("Visits")}</th>
                  <th>{t("Open tasks")}</th>
                  <th>{t("Tasks completed")}</th>
                  <th>{t("Overdue tasks")}</th>
                  <th>{t("Follow-ups created")}</th>
                  <th>{t("CS to Sales")}</th>
                  <th>{t("Sales to CS")}</th>
                </tr>
              </thead>
              <tbody>
                {report.users.map((user) => (
                  <tr key={user.userId}>
                    <td>
                      <strong>{user.userName}</strong>
                      <span>{displayLabel(user.role)}</span>
                    </td>
                    <td>{user.callsCompleted}</td>
                    <td>{user.customerInteractions}</td>
                    <td>{user.salesVisitsCompleted}</td>
                    <td>{user.openTasks}</td>
                    <td>{user.completedTasks}</td>
                    <td>{user.overdueTasks}</td>
                    <td>{user.followUpsCreated}</td>
                    <td>{user.csToSalesHandoffs}</td>
                    <td>{user.salesToCsHandoffs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : loading ? (
        <div className="loading-state">{t("Loading activity report...")}</div>
      ) : null}
    </section>
  );
}
