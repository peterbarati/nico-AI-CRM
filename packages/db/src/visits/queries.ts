import type { CountRow, DatabaseContext, PaginatedResult, PaginationInput } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type { SalesVisit, VisitRow } from "./types";

export async function listCustomerVisits(
  context: DatabaseContext,
  customerId: string,
  pagination: PaginationInput = {}
): Promise<PaginatedResult<SalesVisit>> {
  const normalized = normalizePagination(pagination);
  const totalRow = await context.db
    .prepare("SELECT COUNT(*) AS total FROM sales_visits WHERE customer_id = ?")
    .bind(customerId)
    .first<CountRow>();

  const result = await context.db
    .prepare(
      `
      SELECT v.id, v.customer_id, v.customer_location_id, v.sales_rep_id,
        u.name AS sales_rep_name, u.email AS sales_rep_email, u.role AS sales_rep_role,
        v.planned_at, v.started_at, v.completed_at, v.status, v.result, v.notes,
        v.order_value, v.created_at, v.updated_at
      FROM sales_visits v
      JOIN users u ON u.id = v.sales_rep_id
      WHERE v.customer_id = ?
      ORDER BY COALESCE(v.planned_at, v.created_at) DESC, v.id ASC
      LIMIT ? OFFSET ?
    `
    )
    .bind(customerId, normalized.pageSize, normalized.offset)
    .all<VisitRow>();

  return {
    items: result.results.map(mapVisit),
    pagination: toPagination(normalized.page, normalized.pageSize, totalRow?.total ?? 0)
  };
}

function mapVisit(row: VisitRow): SalesVisit {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerLocationId: row.customer_location_id,
    salesRep: {
      id: row.sales_rep_id,
      name: row.sales_rep_name,
      email: row.sales_rep_email,
      role: row.sales_rep_role
    },
    plannedAt: row.planned_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    result: row.result,
    notes: row.notes,
    orderValue: row.order_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
