import type { CustomerServiceSummary } from "./types";
import { formatNumber, t } from "../../i18n";

interface CustomerServiceSummaryCardsProps {
  summary: CustomerServiceSummary;
}

export function CustomerServiceSummaryCards({ summary }: CustomerServiceSummaryCardsProps) {
  const cards = [
    [t("Today's call target"), formatNumber(summary.dailyCallTarget, 0)],
    [
      t("Completed"),
      `${formatNumber(summary.callsCompletedToday, 0)} / ${formatNumber(summary.dailyCallTarget, 0)}`
    ],
    [t("Remaining"), formatNumber(summary.callsRemaining, 0)],
    [t("Critical"), formatNumber(summary.criticalCustomers, 0)],
    [t("High priority"), formatNumber(summary.highPriorityCustomers, 0)],
    [t("Reactivation"), formatNumber(summary.reactivationCandidates, 0)],
    [t("Overdue follow-ups"), formatNumber(summary.overdueFollowUps, 0)]
  ];

  return (
    <section className="cs-summary-grid" aria-label={t("Customer Service daily summary")}>
      {cards.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
