import { formatCurrency, formatDays } from "./formatting";
import type { CustomerMetrics } from "./types";

interface CustomerMetricsCardsProps {
  metrics: CustomerMetrics | null;
  salesTrend: string;
}

export function CustomerMetricsCards({ metrics, salesTrend }: CustomerMetricsCardsProps) {
  const cards = [
    ["Turnover 30d", formatCurrency(metrics?.turnover30d)],
    ["Turnover 90d", formatCurrency(metrics?.turnover90d)],
    ["Turnover 365d", formatCurrency(metrics?.turnover365d)],
    ["Previous 90d", formatCurrency(metrics?.previousTurnover90d)],
    ["Sales trend", salesTrend],
    ["Average order", formatCurrency(metrics?.averageOrderValue)],
    ["Reorder interval", formatDays(metrics?.averageReorderDays ?? null)],
    ["Since last order", formatDays(metrics?.daysSinceLastOrder ?? null)],
    ["Lifetime turnover", formatCurrency(metrics?.lifetimeTurnover)]
  ];

  return (
    <section className="metric-grid" aria-label="Commercial overview">
      {cards.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
