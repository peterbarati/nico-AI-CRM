export interface CustomerMetrics {
  customerId: string;
  lastOrderDate: string | null;
  firstOrderDate: string | null;
  turnover30d: number;
  turnover90d: number;
  turnover365d: number;
  previousTurnover90d: number;
  averageOrderValue: number | null;
  averageReorderDays: number | null;
  daysSinceLastOrder: number | null;
  orderCount30d: number;
  orderCount90d: number;
  orderCount365d: number;
  lifetimeOrderCount: number;
  lifetimeTurnover: number;
  updatedAt: string;
}

export interface CustomerMetricsRow {
  customer_id: string;
  last_order_date: string | null;
  first_order_date: string | null;
  turnover_30d: number;
  turnover_90d: number;
  turnover_365d: number;
  previous_turnover_90d: number;
  average_order_value: number | null;
  average_reorder_days: number | null;
  days_since_last_order: number | null;
  order_count_30d: number;
  order_count_90d: number;
  order_count_365d: number;
  lifetime_order_count: number;
  lifetime_turnover: number;
  updated_at: string;
}
