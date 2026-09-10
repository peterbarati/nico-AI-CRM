import type { CountRow, DatabaseContext, PaginatedResult, PaginationInput } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type { OrderRow, OrderSummary } from "./types";

export async function listCustomerOrders(
  context: DatabaseContext,
  customerId: string,
  pagination: PaginationInput = {}
): Promise<PaginatedResult<OrderSummary>> {
  const normalized = normalizePagination(pagination);
  const totalRow = await context.db
    .prepare("SELECT COUNT(*) AS total FROM orders WHERE customer_id = ?")
    .bind(customerId)
    .first<CountRow>();

  const result = await context.db
    .prepare(
      `
      SELECT id, external_id, customer_id, customer_location_id, order_number,
        order_date, net_amount, gross_amount, currency, status, source
      FROM orders
      WHERE customer_id = ?
      ORDER BY order_date DESC, id ASC
      LIMIT ? OFFSET ?
    `
    )
    .bind(customerId, normalized.pageSize, normalized.offset)
    .all<OrderRow>();

  return {
    items: result.results.map(mapOrder),
    pagination: toPagination(normalized.page, normalized.pageSize, totalRow?.total ?? 0)
  };
}

export function mapOrder(row: OrderRow): OrderSummary {
  return {
    id: row.id,
    externalId: row.external_id,
    customerId: row.customer_id,
    customerLocationId: row.customer_location_id,
    orderNumber: row.order_number,
    orderDate: row.order_date,
    netAmount: row.net_amount,
    grossAmount: row.gross_amount,
    currency: row.currency,
    status: row.status,
    source: row.source
  };
}
