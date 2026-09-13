import { formatCurrency, formatDays } from "./formatting";
import type { CustomerMetrics } from "./types";
import { displayLabel, t } from "../../i18n";

interface CustomerMetricsCardsProps {
  metrics: CustomerMetrics | null;
  salesTrend: string;
}

export function CustomerMetricsCards({ metrics, salesTrend }: CustomerMetricsCardsProps) {
  const cards = [
    [t("Turnover 30d"), formatCurrency(metrics?.turnover30d)],
    [t("Turnover 90d"), formatCurrency(metrics?.turnover90d)],
    [t("Turnover 365d"), formatCurrency(metrics?.turnover365d)],
    [t("Previous 90d"), formatCurrency(metrics?.previousTurnover90d)],
    [t("Sales trend"), displayLabel(salesTrend)],
    [t("Average order"), formatCurrency(metrics?.averageOrderValue)],
    [t("Reorder interval"), formatDays(metrics?.averageReorderDays ?? null)],
    [t("Since last order"), formatDays(metrics?.daysSinceLastOrder ?? null)],
    [t("Lifetime turnover"), formatCurrency(metrics?.lifetimeTurnover)]
  ];

  return (
    <section className="metric-grid" aria-label={t("Commercial overview")}>
      {cards.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
