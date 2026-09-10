import type { CountRow, DatabaseContext, PaginatedResult, PaginationInput } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type { CustomerInteraction, InteractionRow } from "./types";

export async function listCustomerInteractions(
  context: DatabaseContext,
  customerId: string,
  pagination: PaginationInput = {}
): Promise<PaginatedResult<CustomerInteraction>> {
  const normalized = normalizePagination(pagination);
  const totalRow = await context.db
    .prepare("SELECT COUNT(*) AS total FROM customer_interactions WHERE customer_id = ?")
    .bind(customerId)
    .first<CountRow>();

  const result = await context.db
    .prepare(
      `
      SELECT i.id, i.customer_id, i.customer_location_id, i.user_id,
        u.name AS user_name, u.email AS user_email, u.role AS user_role,
        i.interaction_type, i.reason, i.result, i.notes, i.next_action,
        i.follow_up_at, i.created_at, i.updated_at
      FROM customer_interactions i
      JOIN users u ON u.id = i.user_id
      WHERE i.customer_id = ?
      ORDER BY i.created_at DESC, i.id ASC
      LIMIT ? OFFSET ?
    `
    )
    .bind(customerId, normalized.pageSize, normalized.offset)
    .all<InteractionRow>();

  return {
    items: result.results.map(mapInteraction),
    pagination: toPagination(normalized.page, normalized.pageSize, totalRow?.total ?? 0)
  };
}

function mapInteraction(row: InteractionRow): CustomerInteraction {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerLocationId: row.customer_location_id,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      role: row.user_role
    },
    interactionType: row.interaction_type,
    reason: row.reason,
    result: row.result,
    notes: row.notes,
    nextAction: row.next_action,
    followUpAt: row.follow_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
