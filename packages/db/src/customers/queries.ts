import { listCustomerInteractions } from "../interactions/queries";
import { getCustomerMetrics } from "../metrics/queries";
import { listCustomerOrders } from "../orders/queries";
import { getCustomerSegments } from "../segments/queries";
import { listCustomerTasks } from "../tasks/queries";
import type { CountRow, DatabaseContext, PaginatedResult } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type {
  CustomerListItem,
  CustomerListQuery,
  CustomerListRow,
  CustomerLocation,
  CustomerLocationRow,
  CustomerOverview,
  CustomerSortField
} from "./types";

const customerSortColumns: Record<CustomerSortField, string> = {
  company_name: "c.company_name",
  city: "c.city",
  updated_at: "c.updated_at",
  last_order_date: "m.last_order_date"
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
        m.last_order_date, COALESCE(m.turnover_365d, 0) AS turnover_365d,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.customer_id = c.id AND t.status IN ('open', 'in_progress')
        ) AS open_task_count,
        c.updated_at
      FROM customers c
      LEFT JOIN users u ON u.id = c.assigned_sales_rep_id
      LEFT JOIN customer_metrics m ON m.customer_id = c.id
      ${whereSql}
      ORDER BY ${sort} ${direction}, c.id ASC
      LIMIT ? OFFSET ?
    `
    )
    .bind(...params, pageSize, offset)
    .all<CustomerListRow>();

  return {
    items: result.results.map(mapCustomerListItem),
    pagination: toPagination(page, pageSize, totalRow?.total ?? 0)
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
        m.last_order_date, COALESCE(m.turnover_365d, 0) AS turnover_365d,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.customer_id = c.id AND t.status IN ('open', 'in_progress')
        ) AS open_task_count,
        c.updated_at
      FROM customers c
      LEFT JOIN users u ON u.id = c.assigned_sales_rep_id
      LEFT JOIN customer_metrics m ON m.customer_id = c.id
      WHERE c.id = ?
    `
    )
    .bind(customerId)
    .first<CustomerListRow>();

  return row ? mapCustomerListItem(row) : null;
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

function mapCustomerListItem(row: CustomerListRow): CustomerListItem {
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
    turnover365d: row.turnover_365d ?? 0,
    openTaskCount: row.open_task_count,
    updatedAt: row.updated_at
  };
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
