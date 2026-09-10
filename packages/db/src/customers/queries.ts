import { listCustomerInteractions } from "../interactions/queries";
import { getCustomerMetrics } from "../metrics/queries";
import { listCustomerOrders } from "../orders/queries";
import { getCustomerSegments } from "../segments/queries";
import { listCustomerTasks } from "../tasks/queries";
import type { CountRow, DatabaseContext, PaginatedResult } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type {
  CustomerFilterB2BStatusRow,
  CustomerFilterOptions,
  CustomerFilterSalesRepRow,
  CustomerListItem,
  CustomerListQuery,
  CustomerListRow,
  CustomerListSegment,
  CustomerListSegmentRow,
  CustomerLocation,
  CustomerLocationRow,
  CustomerOverview,
  CustomerSortField
} from "./types";

const customerSortColumns: Record<CustomerSortField, string> = {
  company_name: "c.company_name",
  city: "c.city",
  updated_at: "c.updated_at",
  last_order_date: "m.last_order_date",
  turnover_90d: "m.turnover_90d",
  days_since_last_order: "m.days_since_last_order"
};

export async function listCustomers(
  context: DatabaseContext,
  query: CustomerListQuery = {}
): Promise<PaginatedResult<CustomerListItem>> {
  const { page, pageSize, offset } = normalizePagination(query);
  const where: string[] = [];
  const params: unknown[] = [];

  if (query.active !== undefined) {
    where.push("c.active = ?");
    params.push(query.active ? 1 : 0);
  }

  if (query.search?.trim()) {
    where.push(
      "(c.company_name LIKE ? OR c.contact_name LIKE ? OR c.email LIKE ? OR c.city LIKE ?)"
    );
    const search = `%${query.search.trim()}%`;
    params.push(search, search, search, search);
  }

  if (query.assignedSalesRepId?.trim()) {
    where.push("c.assigned_sales_rep_id = ?");
    params.push(query.assignedSalesRepId.trim());
  }

  if (query.b2bStatus?.trim()) {
    where.push("c.b2b_status = ?");
    params.push(query.b2bStatus.trim());
  }

  if (query.segmentCode?.trim()) {
    where.push(
      `EXISTS (
        SELECT 1
        FROM customer_segment_memberships csm
        JOIN customer_segments cs ON cs.id = csm.segment_id
        WHERE csm.customer_id = c.id AND cs.code = ?
      )`
    );
    params.push(query.segmentCode.trim());
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const sort = customerSortColumns[query.sort ?? "company_name"];
  const direction = query.direction === "desc" ? "DESC" : "ASC";

  const totalRow = await context.db
    .prepare(`SELECT COUNT(*) AS total FROM customers c ${whereSql}`)
    .bind(...params)
    .first<CountRow>();

  const result = await context.db
    .prepare(
      `
      SELECT
        c.id, c.external_id, c.company_name, c.contact_name, c.email, c.phone,
        c.city, c.country, c.b2b_status, c.active, c.assigned_sales_rep_id,
        u.name AS sales_rep_name, u.email AS sales_rep_email, u.role AS sales_rep_role,
        m.last_order_date, COALESCE(m.turnover_90d, 0) AS turnover_90d,
        COALESCE(m.turnover_365d, 0) AS turnover_365d,
        COALESCE(m.previous_turnover_90d, 0) AS previous_turnover_90d,
        m.days_since_last_order,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.customer_id = c.id AND t.status IN ('open', 'in_progress')
        ) AS open_task_count,
        li.id AS last_interaction_id,
        li.interaction_type AS last_interaction_type,
        li.reason AS last_interaction_reason,
        li.result AS last_interaction_result,
        li.created_at AS last_interaction_created_at,
        c.updated_at
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
      ${whereSql}
      ORDER BY ${sort} ${direction}, c.id ASC
      LIMIT ? OFFSET ?
    `
    )
    .bind(...params, pageSize, offset)
    .all<CustomerListRow>();

  const segmentsByCustomerId = await getSegmentsByCustomerId(
    context,
    result.results.map((row) => row.id)
  );

  return {
    items: result.results.map((row) => mapCustomerListItem(row, segmentsByCustomerId.get(row.id))),
    pagination: toPagination(page, pageSize, totalRow?.total ?? 0)
  };
}

export async function getCustomerFilterOptions(
  context: DatabaseContext
): Promise<CustomerFilterOptions> {
  const [salesReps, b2bStatuses] = await Promise.all([
    context.db
      .prepare(
        `
        SELECT DISTINCT u.id, u.name, u.email, u.role
        FROM users u
        JOIN customers c ON c.assigned_sales_rep_id = u.id
        WHERE u.active = 1
        ORDER BY u.name ASC
      `
      )
      .all<CustomerFilterSalesRepRow>(),
    context.db
      .prepare(
        `
        SELECT DISTINCT b2b_status
        FROM customers
        ORDER BY b2b_status ASC
      `
      )
      .all<CustomerFilterB2BStatusRow>()
  ]);

  return {
    salesReps: salesReps.results.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role
    })),
    b2bStatuses: b2bStatuses.results.map((row) => row.b2b_status)
  };
}

export async function getCustomerOverview(
  context: DatabaseContext,
  customerId: string
): Promise<CustomerOverview | null> {
  const customer = await getCustomerListItem(context, customerId);

  if (!customer) {
    return null;
  }

  const [locations, metrics, segments, latestInteractions, latestOrders, openTasks] =
    await Promise.all([
      getCustomerLocations(context, customerId),
      getCustomerMetrics(context, customerId),
      getCustomerSegments(context, customerId),
      listCustomerInteractions(context, customerId, { pageSize: 5 }).then((result) => result.items),
      listCustomerOrders(context, customerId, { pageSize: 5 }).then((result) => result.items),
      listCustomerTasks(context, customerId, { status: "open", pageSize: 10 }).then(
        (result) => result.items
      )
    ]);

  return {
    customer,
    locations,
    metrics,
    segments,
    latestInteractions,
    latestOrders,
    openTasks
  };
}

async function getCustomerListItem(
  context: DatabaseContext,
  customerId: string
): Promise<CustomerListItem | null> {
  const row = await context.db
    .prepare(
      `
      SELECT
        c.id, c.external_id, c.company_name, c.contact_name, c.email, c.phone,
        c.city, c.country, c.b2b_status, c.active, c.assigned_sales_rep_id,
        u.name AS sales_rep_name, u.email AS sales_rep_email, u.role AS sales_rep_role,
        m.last_order_date, COALESCE(m.turnover_90d, 0) AS turnover_90d,
        COALESCE(m.turnover_365d, 0) AS turnover_365d,
        COALESCE(m.previous_turnover_90d, 0) AS previous_turnover_90d,
        m.days_since_last_order,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.customer_id = c.id AND t.status IN ('open', 'in_progress')
        ) AS open_task_count,
        li.id AS last_interaction_id,
        li.interaction_type AS last_interaction_type,
        li.reason AS last_interaction_reason,
        li.result AS last_interaction_result,
        li.created_at AS last_interaction_created_at,
        c.updated_at
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
      WHERE c.id = ?
    `
    )
    .bind(customerId)
    .first<CustomerListRow>();

  if (!row) {
    return null;
  }

  const segmentsByCustomerId = await getSegmentsByCustomerId(context, [row.id]);
  return mapCustomerListItem(row, segmentsByCustomerId.get(row.id));
}

async function getSegmentsByCustomerId(
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
    .all<CustomerListSegmentRow>();

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

async function getCustomerLocations(
  context: DatabaseContext,
  customerId: string
): Promise<CustomerLocation[]> {
  const result = await context.db
    .prepare(
      `
      SELECT id, external_id, customer_id, name, location_type, address, city,
        postal_code, country, latitude, longitude, phone, active
      FROM customer_locations
      WHERE customer_id = ?
      ORDER BY active DESC, name ASC
    `
    )
    .bind(customerId)
    .all<CustomerLocationRow>();

  return result.results.map(mapLocation);
}

function mapCustomerListItem(
  row: CustomerListRow,
  segments: CustomerListSegment[] = []
): CustomerListItem {
  return {
    id: row.id,
    externalId: row.external_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    country: row.country,
    b2bStatus: row.b2b_status,
    active: Boolean(row.active),
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
    turnover90d: row.turnover_90d ?? 0,
    turnover365d: row.turnover_365d ?? 0,
    previousTurnover90d: row.previous_turnover_90d ?? 0,
    salesTrend: mapSalesTrend(row.turnover_90d ?? 0, row.previous_turnover_90d ?? 0),
    daysSinceLastOrder: row.days_since_last_order,
    openTaskCount: row.open_task_count,
    segments,
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
    updatedAt: row.updated_at
  };
}

function mapSalesTrend(
  turnover90d: number,
  previousTurnover90d: number
): CustomerListItem["salesTrend"] {
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

function mapLocation(row: CustomerLocationRow): CustomerLocation {
  return {
    id: row.id,
    externalId: row.external_id,
    customerId: row.customer_id,
    name: row.name,
    locationType: row.location_type,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    active: Boolean(row.active)
  };
}
