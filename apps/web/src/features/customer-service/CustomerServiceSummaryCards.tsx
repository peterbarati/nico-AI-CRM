import type { CustomerServiceSummary } from "./types";

interface CustomerServiceSummaryCardsProps {
  summary: CustomerServiceSummary;
}

export function CustomerServiceSummaryCards({ summary }: CustomerServiceSummaryCardsProps) {
  const cards = [
    ["Today's call target", String(summary.dailyCallTarget)],
    ["Completed", `${summary.callsCompletedToday} / ${summary.dailyCallTarget}`],
    ["Remaining", String(summary.callsRemaining)],
    ["Critical", String(summary.criticalCustomers)],
    ["High priority", String(summary.highPriorityCustomers)],
    ["Reactivation", String(summary.reactivationCandidates)],
    ["Overdue follow-ups", String(summary.overdueFollowUps)]
  ];

  return (
    <section className="cs-summary-grid" aria-label="Customer Service daily summary">
      {cards.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
