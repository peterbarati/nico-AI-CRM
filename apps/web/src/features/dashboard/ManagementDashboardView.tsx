import type { KpiResult, ManagementDashboard } from "./types";
import {
  displayLabel,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercentage,
  kpiLabel,
  kpiSource,
  t
} from "../../i18n";

export function ManagementDashboardView({ report }: { report: ManagementDashboard }) {
  const summary = report.dashboard;
  const metrics = [
    [t("Company turnover"), formatCurrency(summary.turnover)],
    [t("Plan vs actual"), formatPercentage(summary.salesAchievementPercent)],
    [t("Active customers"), formatNumber(summary.activeCustomers)],
    [t("At risk"), formatNumber(summary.atRiskCustomers)],
    [t("Critical"), formatNumber(summary.criticalCustomers)],
    [t("90+ day inactive"), formatNumber(summary.reactivationCandidates)],
    [t("Reactivated"), formatNumber(summary.reactivatedCustomers)],
    [t("CS calls"), formatNumber(summary.callsCompleted)],
    [t("Sales visits"), formatNumber(summary.visitsCompleted)],
    [t("B2B penetration"), formatPercentage(summary.b2bPenetrationPercent)],
    [t("Overdue tasks"), formatNumber(summary.overdueTasks)],
    [t("CS / Sales handoffs"), `${summary.csToSalesHandoffs} / ${summary.salesToCsHandoffs}`]
  ];
  return (
    <>
      <p className="report-period">
        {formatDate(report.period.fromDate)} – {formatDate(report.period.toDate)} ·{" "}
        {report.period.timezone} · {formatPercentage(report.period.progressPercent)} {t("elapsed")}
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
          <span className="muted">{t("Company sales target")}</span>
          <strong>{formatCurrency(summary.salesTarget)}</strong>
        </div>
        <progress max="100" value={Math.min(summary.salesAchievementPercent, 100)} />
        <small>{t("Source: normalized CRM/demo completed orders")}</small>
      </section>
      <section className="page-stack" aria-labelledby="performance-heading">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{t("KPI summary")}</p>
            <h3 id="performance-heading">{t("Team and user performance")}</h3>
          </div>
        </div>
        <div className="table-wrap table-wrap--compact">
          <table className="crm-table crm-table--compact">
            <thead>
              <tr>
                <th>{t("Team")}</th>
                <th>{t("Overall")}</th>
                <th>{t("KPI progress")}</th>
              </tr>
            </thead>
            <tbody>
              {report.roles.map((role) => (
                <tr key={role.role}>
                  <td>
                    <strong>{displayLabel(role.role)}</strong>
                  </td>
                  <td>
                    <KpiStatus
                      achievementPercent={role.overall.achievementPercent}
                      status={role.overall.status}
                    />
                  </td>
                  <td>
                    {role.kpis
                      .map(
                        (kpi) =>
                          `${kpiLabel(kpi.kpiCode, kpi.name)}: ${formatPercentage(kpi.achievementPercent)}`
                      )
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
                <th>{t("User")}</th>
                <th>{t("Role")}</th>
                <th>{t("Turnover")}</th>
                <th>{t("Calls / visits")}</th>
                <th>{t("Tasks")}</th>
                <th>{t("ReactivatedShort")}</th>
                <th>B2B</th>
                <th>{t("Overall")}</th>
              </tr>
            </thead>
            <tbody>
              {report.users.map((user) => (
                <tr key={user.userId}>
                  <td>
                    <strong>{user.userName}</strong>
                  </td>
                  <td>{displayLabel(user.role)}</td>
                  <td>{formatCurrency(user.attributedTurnover)}</td>
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
            <h3>
              {user.userName} – {t("KPI detail")}
            </h3>
            <div className="table-wrap table-wrap--compact">
              <table className="crm-table crm-table--compact">
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th>{t("Actual")}</th>
                    <th>{t("Target")}</th>
                    <th>{t("Achievement")}</th>
                    <th>{t("Weight")}</th>
                    <th>{t("Status")}</th>
                    <th>{t("Source")}</th>
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
          <div className="empty-state">
            {t("No KPI activity or configured users for this filter.")}
          </div>
        ) : null}
      </section>
    </>
  );
}

function KpiRow({ result }: { result: KpiResult }) {
  const format = result.metricType === "currency" ? formatCurrency : formatNumber;
  return (
    <tr>
      <td>
        <strong>{kpiLabel(result.kpiCode, result.name)}</strong>
        <span>{result.kpiCode}</span>
      </td>
      <td>{format(result.actual)}</td>
      <td>{format(result.target)}</td>
      <td>{formatPercentage(result.achievementPercent)}</td>
      <td>{formatPercentage(result.weight * 100)}</td>
      <td>
        <KpiStatus achievementPercent={result.achievementPercent} status={result.status} />
      </td>
      <td className="kpi-source">{kpiSource(result.kpiCode)}</td>
    </tr>
  );
}

function KpiStatus({
  achievementPercent,
  status
}: Pick<KpiResult, "achievementPercent" | "status">) {
  return (
    <span className={`kpi-status kpi-status--${status}`}>
      {displayLabel(status)} · {formatPercentage(achievementPercent)}
    </span>
  );
}
