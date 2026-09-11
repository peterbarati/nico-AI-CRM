import { useEffect, useState } from "react";
import { formatLabel } from "../../customers/formatting";
import { fetchActivityReport } from "./api";
import type { ActivityReport } from "./types";

const initial = { period: "today", from: "", to: "", role: "", userId: "" };
const metricLabels = {
  callsCompleted: "Calls completed",
  customerInteractions: "Interactions",
  salesVisitsCompleted: "Visits completed",
  openTasks: "Open tasks",
  completedTasks: "Tasks completed",
  overdueTasks: "Overdue tasks",
  followUpsCreated: "Follow-ups created",
  csToSalesHandoffs: "CS to Sales",
  salesToCsHandoffs: "Sales to CS",
  reactivationActivities: "Reactivation",
  b2bActivities: "B2B activity"
} as const;

export function ActivityReportPage() {
  const [filters, setFilters] = useState(initial);
  const [report, setReport] = useState<ActivityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof typeof initial, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (filters.period === "custom" && (!filters.from || !filters.to)) return;
    let mounted = true;
    setError(null);
    fetchActivityReport(filters)
      .then((data) => mounted && setReport(data))
      .catch(
        (error: unknown) =>
          mounted && setError(error instanceof Error ? error.message : "Report unavailable.")
      );
    return () => {
      mounted = false;
    };
  }, [filters]);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Activity report</h2>
        </div>
        <p>Operational activity summarized by business date and responsible user.</p>
      </div>
      <section className="filter-panel" aria-label="Activity report filters">
        <label>
          Period
          <select value={filters.period} onChange={(event) => update("period", event.target.value)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
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
      </section>
      {error ? <p className="form-error">{error}</p> : null}
      {report ? (
        <>
          <p className="report-period">
            {report.period.fromDate} to {report.period.toDate} · {report.period.timezone}
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
                  <th>User</th>
                  <th>Calls</th>
                  <th>Interactions</th>
                  <th>Visits</th>
                  <th>Open</th>
                  <th>Completed</th>
                  <th>Overdue</th>
                  <th>Follow-ups</th>
                  <th>CS → Sales</th>
                  <th>Sales → CS</th>
                </tr>
              </thead>
              <tbody>
                {report.users.map((user) => (
                  <tr key={user.userId}>
                    <td>
                      <strong>{user.userName}</strong>
                      <span>{formatLabel(user.role)}</span>
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
      ) : (
        <div className="loading-state">Loading activity report...</div>
      )}
    </section>
  );
}
