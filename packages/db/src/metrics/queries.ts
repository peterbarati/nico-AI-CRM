import type { DatabaseContext } from "../types";
import type { CustomerMetrics, CustomerMetricsRow } from "./types";

export async function getCustomerMetrics(
  context: DatabaseContext,
  customerId: string
): Promise<CustomerMetrics | null> {
  const row = await context.db
    .prepare(
      `
      SELECT customer_id, last_order_date, first_order_date, turnover_30d,
        turnover_90d, turnover_365d, previous_turnover_90d, average_order_value,
        average_reorder_days, days_since_last_order, order_count_30d,
        order_count_90d, order_count_365d, lifetime_order_count,
        lifetime_turnover, updated_at
      FROM customer_metrics
      WHERE customer_id = ?
    `
    )
    .bind(customerId)
    .first<CustomerMetricsRow>();

  return row ? mapMetrics(row) : null;
}

function mapMetrics(row: CustomerMetricsRow): CustomerMetrics {
  return {
    customerId: row.customer_id,
    lastOrderDate: row.last_order_date,
    firstOrderDate: row.first_order_date,
    turnover30d: row.turnover_30d,
    turnover90d: row.turnover_90d,
    turnover365d: row.turnover_365d,
    previousTurnover90d: row.previous_turnover_90d,
    averageOrderValue: row.average_order_value,
    averageReorderDays: row.average_reorder_days,
    daysSinceLastOrder: row.days_since_last_order,
    orderCount30d: row.order_count_30d,
    orderCount90d: row.order_count_90d,
    orderCount365d: row.order_count_365d,
    lifetimeOrderCount: row.lifetime_order_count,
    lifetimeTurnover: row.lifetime_turnover,
    updatedAt: row.updated_at
  };
}
