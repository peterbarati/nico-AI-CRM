import type { CustomerListSegment } from "../customers/types";
import type { DatabaseContext } from "../types";
import type {
  CustomerServiceCandidate,
  CustomerServiceCandidateRow,
  CustomerServiceCandidateSegmentRow,
  CustomerServiceQueueQuery,
  DailyCompletedCallsRow,
  UtcDateRange
} from "./types";

const defaultCandidatePoolLimit = 200;
const maxCandidatePoolLimit = 500;

export async function listCustomerServiceCandidates(
  context: DatabaseContext,
  query: CustomerServiceQueueQuery = {}
): Promise<CustomerServiceCandidate[]> {
  const now = query.now ?? new Date();
  const limit = Math.min(
    maxCandidatePoolLimit,
    Math.max(1, Math.trunc(query.limit ?? defaultCandidatePoolLimit))
  );
  const businessDayToUtc = query.businessDayToUtc ?? now.toISOString();
  const where: string[] = ["c.active = 1"];
  const params: unknown[] = [];

  if (query.assignedSalesRepId?.trim()) {
    where.push("c.assigned_sales_rep_id = ?");
    params.push(query.assignedSalesRepId.trim());
  }

  if (query.segmentCode?.trim()) {
    where.push(
      `EXISTS (
        SELECT 1
        FROM customer_segment_memberships csm_filter
        JOIN customer_segments cs_filter ON cs_filter.id = csm_filter.segment_id
        WHERE csm_filter.customer_id = c.id AND cs_filter.code = ?
      )`
    );
    params.push(query.segmentCode.trim());
  }

  const result = await context.db
    .prepare(
      `
      SELECT
        c.id AS customer_id, c.company_name, c.contact_name, c.email, c.phone,
        c.city, c.country, c.active, c.b2b_status, c.assigned_sales_rep_id,
        u.name AS sales_rep_name, u.email AS sales_rep_email, u.role AS sales_rep_role,
        m.last_order_date, m.days_since_last_order, m.average_reorder_days,
        COALESCE(m.turnover_90d, 0) AS turnover_90d,
        COALESCE(m.previous_turnover_90d, 0) AS previous_turnover_90d,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.customer_id = c.id AND t.status IN ('open', 'in_progress')
        ) AS open_task_count,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.customer_id = c.id
            AND t.status IN ('open', 'in_progress')
            AND t.due_at IS NOT NULL
            AND t.due_at < ?
        ) AS overdue_task_count,
        EXISTS (
          SELECT 1
          FROM customer_campaigns cc
          WHERE cc.customer_id = c.id
            AND cc.clicked_at IS NOT NULL
            AND cc.converted_at IS NULL
            AND cc.conversion_order_id IS NULL
        ) AS campaign_clicked_without_conversion,
        li.id AS last_interaction_id,
        li.interaction_type AS last_interaction_type,
        li.reason AS last_interaction_reason,
        li.result AS last_interaction_result,
        li.created_at AS last_interaction_created_at
      FROM customers c
      LEFT JOIN users u ON u.id = c.assigned_sales_rep_id
      LEFT JOIN customer_metrics m ON m.customer_id = c.id
      LEFT JOIN customer_interactions li ON li.id = (
        SELECT i.id
        FROM customer_interactions i
        WHERE i.customer_id = c.id
        ORDER BY i.created_at DESC, i.id ASC
        LIMIT 1
      )
      WHERE ${where.join(" AND ")}
      ORDER BY
        COALESCE(m.days_since_last_order, 0) DESC,
        open_task_count DESC,
        campaign_clicked_without_conversion DESC,
        COALESCE(m.turnover_90d, 0) DESC,
        c.company_name ASC
      LIMIT ?
    `
    )
    .bind(businessDayToUtc, ...params, limit)
    .all<CustomerServiceCandidateRow>();

  const segmentsByCustomerId = await getCandidateSegmentsByCustomerId(
    context,
    result.results.map((row) => row.customer_id)
  );

  return result.results.map((row) =>
    mapCandidate(row, segmentsByCustomerId.get(row.customer_id) ?? [])
  );
}

export async function countCompletedCustomerServiceCallsToday(
  context: DatabaseContext,
  range: UtcDateRange
): Promise<number> {
  const row = await context.db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM customer_interactions i
      JOIN users u ON u.id = i.user_id
      WHERE i.interaction_type = 'CALL'
        AND u.role = 'customer_service'
        AND i.created_at >= ?
        AND i.created_at < ?
    `
    )
    .bind(range.fromUtc, range.toUtcExclusive)
    .first<DailyCompletedCallsRow>();

  return row?.total ?? 0;
}

async function getCandidateSegmentsByCustomerId(
  context: DatabaseContext,
  customerIds: string[]
): Promise<Map<string, CustomerListSegment[]>> {
  if (customerIds.length === 0) {
    return new Map();
  }

  const placeholders = customerIds.map(() => "?").join(", ");
  const result = await context.db
    .prepare(
      `
      SELECT csm.customer_id, s.id AS segment_id, s.code, s.name, csm.reason, csm.score
      FROM customer_segment_memberships csm
      JOIN customer_segments s ON s.id = csm.segment_id
      WHERE csm.customer_id IN (${placeholders})
      ORDER BY csm.score DESC, s.code ASC
    `
    )
    .bind(...customerIds)
    .all<CustomerServiceCandidateSegmentRow>();

  const segmentsByCustomerId = new Map<string, CustomerListSegment[]>();

  for (const row of result.results) {
    const existing = segmentsByCustomerId.get(row.customer_id) ?? [];
    existing.push({
      id: row.segment_id,
      code: row.code,
      name: row.name,
      reason: row.reason,
      score: row.score
    });
    segmentsByCustomerId.set(row.customer_id, existing);
  }

  return segmentsByCustomerId;
}

function mapCandidate(
  row: CustomerServiceCandidateRow,
  segments: CustomerListSegment[]
): CustomerServiceCandidate {
  const turnover90d = row.turnover_90d ?? 0;
  const previousTurnover90d = row.previous_turnover_90d ?? 0;

  return {
    customerId: row.customer_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    country: row.country,
    active: Boolean(row.active),
    b2bStatus: row.b2b_status,
    assignedSalesRep:
      row.assigned_sales_rep_id && row.sales_rep_name && row.sales_rep_email && row.sales_rep_role
        ? {
            id: row.assigned_sales_rep_id,
            name: row.sales_rep_name,
            email: row.sales_rep_email,
            role: row.sales_rep_role
          }
        : null,
    lastOrderDate: row.last_order_date,
    daysSinceLastOrder: row.days_since_last_order,
    averageReorderDays: row.average_reorder_days,
    turnover90d,
    previousTurnover90d,
    salesTrend: mapSalesTrend(turnover90d, previousTurnover90d),
    openTaskCount: row.open_task_count,
    overdueTaskCount: row.overdue_task_count,
    campaignClickedWithoutConversion: Boolean(row.campaign_clicked_without_conversion),
    lastInteraction:
      row.last_interaction_id && row.last_interaction_type && row.last_interaction_created_at
        ? {
            id: row.last_interaction_id,
            interactionType: row.last_interaction_type,
            reason: row.last_interaction_reason,
            result: row.last_interaction_result,
            createdAt: row.last_interaction_created_at
          }
        : null,
    segments
  };
}

function mapSalesTrend(
  turnover90d: number,
  previousTurnover90d: number
): CustomerServiceCandidate["salesTrend"] {
  if (previousTurnover90d === 0 && turnover90d > 0) {
    return "new";
  }

  if (turnover90d > previousTurnover90d * 1.05) {
    return "up";
  }

  if (turnover90d < previousTurnover90d * 0.95) {
    return "down";
  }

  return "flat";
}
