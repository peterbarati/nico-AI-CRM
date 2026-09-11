import { formatLabel } from "../customers/formatting";
import type { KpiResult, ManagementDashboard } from "./types";

const currency = new Intl.NumberFormat("en-SK", { style: "currency", currency: "EUR" });
const number = new Intl.NumberFormat("en-SK", { maximumFractionDigits: 1 });

export function ManagementDashboardView({ report }: { report: ManagementDashboard }) {
  const summary = report.dashboard;
  const metrics = [
    ["Company turnover", currency.format(summary.turnover)],
    ["Plan vs actual", `${number.format(summary.salesAchievementPercent)}%`],
    ["Active customers", number.format(summary.activeCustomers)],
    ["At risk", number.format(summary.atRiskCustomers)],
    ["Critical", number.format(summary.criticalCustomers)],
    ["90+ day inactive", number.format(summary.reactivationCandidates)],
    ["Reactivated", number.format(summary.reactivatedCustomers)],
    ["CS calls", number.format(summary.callsCompleted)],
    ["Sales visits", number.format(summary.visitsCompleted)],
    ["B2B penetration", `${number.format(summary.b2bPenetrationPercent)}%`],
    ["Overdue tasks", number.format(summary.overdueTasks)],
    ["CS / Sales handoffs", `${summary.csToSalesHandoffs} / ${summary.salesToCsHandoffs}`]
  ];
  return (
    <>
      <p className="report-period">
        {report.period.fromDate} to {report.period.toDate} · {report.period.timezone} ·{" "}
        {number.format(report.period.progressPercent)}% elapsed
      </p>
      <div className="dashboard-metric-grid">
        {metrics.map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="detail-panel dashboard-plan">
        <div>
          <span className="muted">Company sales target</span>
          <strong>{currency.format(summary.salesTarget)}</strong>
        </div>
        <progress max="100" value={Math.min(summary.salesAchievementPercent, 100)} />
        <small>Source: normalized CRM/demo completed orders</small>
      </section>
      <section className="page-stack" aria-labelledby="performance-heading">
        <div className="page-heading">
          <div>
            <p className="eyebrow">KPI summary</p>
            <h3 id="performance-heading">Team and user performance</h3>
          </div>
        </div>
        <div className="table-wrap table-wrap--compact">
          <table className="crm-table crm-table--compact">
            <thead>
              <tr>
                <th>Team</th>
                <th>Overall</th>
                <th>KPI progress</th>
              </tr>
            </thead>
            <tbody>
              {report.roles.map((role) => (
                <tr key={role.role}>
                  <td>
                    <strong>{formatLabel(role.role)}</strong>
                  </td>
                  <td>
                    <KpiStatus
                      achievementPercent={role.overall.achievementPercent}
                      status={role.overall.status}
                    />
                  </td>
                  <td>
                    {role.kpis
                      .map((kpi) => `${kpi.name}: ${number.format(kpi.achievementPercent)}%`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table className="crm-table kpi-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Turnover</th>
                <th>Calls / visits</th>
                <th>Tasks</th>
                <th>Reactivated</th>
                <th>B2B</th>
                <th>Overall</th>
              </tr>
            </thead>
            <tbody>
              {report.users.map((user) => (
                <tr key={user.userId}>
                  <td>
                    <strong>{user.userName}</strong>
                  </td>
                  <td>{formatLabel(user.role)}</td>
                  <td>{currency.format(user.attributedTurnover)}</td>
                  <td>
                    {user.role === "customer_service" ? user.callsCompleted : user.visitsCompleted}
                  </td>
                  <td>{user.completedTasks}</td>
                  <td>{user.reactivations}</td>
                  <td>{user.b2bActivations}</td>
                  <td>
                    <KpiStatus
                      achievementPercent={user.overall.achievementPercent}
                      status={user.overall.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.users.map((user) => (
          <section className="detail-panel" key={`${user.userId}-details`}>
            <h3>{user.userName} KPI detail</h3>
            <div className="table-wrap table-wrap--compact">
              <table className="crm-table crm-table--compact">
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th>Actual</th>
                    <th>Target</th>
                    <th>Achievement</th>
                    <th>Weight</th>
                    <th>Status</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {user.kpis.map((kpi) => (
                    <KpiRow key={kpi.kpiCode} result={kpi} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {report.users.length === 0 ? (
          <div className="empty-state">No KPI activity or configured users for this filter.</div>
        ) : null}
      </section>
    </>
  );
}

function KpiRow({ result }: { result: KpiResult }) {
  const format = result.metricType === "currency" ? currency.format : number.format;
  return (
    <tr>
      <td>
        <strong>{result.name}</strong>
        <span>{result.kpiCode}</span>
      </td>
      <td>{format(result.actual)}</td>
      <td>{format(result.target)}</td>
      <td>{number.format(result.achievementPercent)}%</td>
      <td>{number.format(result.weight * 100)}%</td>
      <td>
        <KpiStatus achievementPercent={result.achievementPercent} status={result.status} />
      </td>
      <td className="kpi-source">{result.source}</td>
    </tr>
  );
}

function KpiStatus({
  achievementPercent,
  status
}: Pick<KpiResult, "achievementPercent" | "status">) {
  return (
    <span className={`kpi-status kpi-status--${status}`}>
      {formatLabel(status)} · {number.format(achievementPercent)}%
    </span>
  );
}
