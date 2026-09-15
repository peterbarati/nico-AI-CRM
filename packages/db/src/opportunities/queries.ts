import type { OpportunityStatus, SalesRouteStatus } from "@nico-ai-crm/shared";
import type { CountRow, DatabaseContext } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type {
  OpportunityFactRecord,
  OpportunityItem,
  OpportunityListQuery,
  OpportunityPage,
  RouteListQuery,
  RoutePage,
  RouteSaveResult,
  RouteStopItem,
  SalesRouteDetail,
  SalesRouteItem,
  SaveOpportunityCommand,
  SaveOpportunityResult,
  SaveRouteCommand
} from "./types";
import { OpportunityWriteError } from "./types";

export async function listOpportunityFacts(
  context: DatabaseContext,
  salesRepId: string,
  now: string
): Promise<OpportunityFactRecord[]> {
  const rows = await context.db
    .prepare(
      `SELECT c.id AS customer_id,c.active,c.b2b_status,c.assigned_sales_rep_id,
        l.id AS location_id,m.last_order_date,m.days_since_last_order,m.average_reorder_days,
        COALESCE(m.turnover_90d,0) AS turnover_90d,
        COALESCE(m.previous_turnover_90d,0) AS previous_turnover_90d,
        COALESCE(m.lifetime_turnover,0) AS lifetime_turnover,m.average_order_value,
        (SELECT MAX(v.completed_at) FROM sales_visits v
          WHERE v.customer_id=c.id AND v.sales_rep_id=? AND v.status='completed') AS last_visit_date,
        CAST(julianday(?) - julianday((SELECT MAX(v.completed_at) FROM sales_visits v
          WHERE v.customer_id=c.id AND v.sales_rep_id=? AND v.status='completed')) AS INTEGER) AS days_since_last_visit,
        (SELECT t.priority FROM tasks t WHERE t.customer_id=c.id AND t.assigned_user_id=?
          AND t.status IN ('open','in_progress') ORDER BY CASE t.priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC,t.created_at DESC LIMIT 1) AS task_priority,
        (SELECT t.id FROM tasks t WHERE t.customer_id=c.id AND t.assigned_user_id=?
          AND t.status IN ('open','in_progress') ORDER BY CASE t.priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC,t.created_at DESC LIMIT 1) AS source_task_id,
        (SELECT cc.campaign_id FROM customer_campaigns cc JOIN campaigns cp ON cp.id=cc.campaign_id
          WHERE cc.customer_id=c.id AND cc.clicked_at IS NOT NULL AND cc.converted_at IS NULL
          AND cp.operational_status='ACTIVE' ORDER BY cc.clicked_at DESC LIMIT 1) AS source_campaign_id,
        CASE WHEN EXISTS (SELECT 1 FROM customer_campaigns cc JOIN campaigns cp ON cp.id=cc.campaign_id
          WHERE cc.customer_id=c.id AND cc.clicked_at IS NOT NULL AND cc.converted_at IS NULL
          AND cp.operational_status='ACTIVE') THEN 1 ELSE 0 END AS campaign_follow_up,
        CASE WHEN (SELECT COUNT(DISTINCT p.category) FROM order_items oi JOIN orders o ON o.id=oi.order_id
          JOIN products p ON p.id=oi.product_id WHERE o.customer_id=c.id AND o.status='completed' AND p.category IS NOT NULL) > 0
          AND (SELECT COUNT(DISTINCT p.category) FROM order_items oi JOIN orders o ON o.id=oi.order_id
          JOIN products p ON p.id=oi.product_id WHERE o.customer_id=c.id AND o.status='completed' AND p.category IS NOT NULL)
          < (SELECT COUNT(DISTINCT category) FROM products WHERE active=1 AND category IS NOT NULL)
          THEN 1 ELSE 0 END AS cross_sell_gap,
        CASE WHEN EXISTS (SELECT 1 FROM customer_segment_memberships sm JOIN customer_segments s ON s.id=sm.segment_id
          WHERE sm.customer_id=c.id AND s.code='STRATEGIC') THEN 1 ELSE 0 END AS strategic_priority
      FROM customers c
      JOIN customer_locations l ON l.id=(SELECT candidate.id FROM customer_locations candidate
        WHERE candidate.customer_id=c.id AND candidate.active=1
        ORDER BY CASE candidate.location_type WHEN 'retail_pos' THEN 0 WHEN 'headquarters' THEN 1 ELSE 2 END,candidate.id LIMIT 1)
      LEFT JOIN customer_metrics m ON m.customer_id=c.id
      JOIN users u ON u.id=c.assigned_sales_rep_id AND u.active=1 AND u.role='sales_rep'
      WHERE c.active=1 AND c.assigned_sales_rep_id=?
      ORDER BY c.id`
    )
    .bind(salesRepId, now, salesRepId, salesRepId, salesRepId, salesRepId)
    .all<OpportunityFactRow>();
  return rows.results.map((row) => ({
    customerId: row.customer_id,
    locationId: row.location_id,
    salesRepId: row.assigned_sales_rep_id,
    active: Boolean(row.active),
    b2bStatus: row.b2b_status,
    daysSinceLastOrder: row.days_since_last_order,
    averageReorderDays: row.average_reorder_days,
    turnover90d: row.turnover_90d,
    previousTurnover90d: row.previous_turnover_90d,
    lifetimeTurnover: row.lifetime_turnover,
    averageOrderValue: row.average_order_value,
    daysSinceLastVisit: row.days_since_last_visit,
    openTaskPriority: row.task_priority,
    sourceTaskId: row.source_task_id,
    campaignFollowUp: Boolean(row.campaign_follow_up),
    sourceCampaignId: row.source_campaign_id,
    crossSellGap: Boolean(row.cross_sell_gap),
    strategicPriority: Boolean(row.strategic_priority),
    lastOrderDate: row.last_order_date,
    lastVisitDate: row.last_visit_date
  }));
}

export async function saveGeneratedOpportunity(
  context: DatabaseContext,
  command: SaveOpportunityCommand
): Promise<SaveOpportunityResult> {
  await context.db
    .prepare(
      "UPDATE sales_opportunities SET status='EXPIRED',updated_at=? WHERE status='OPEN' AND expires_at IS NOT NULL AND expires_at<=?"
    )
    .bind(command.generatedAt, command.generatedAt)
    .run();
  const existing = await context.db
    .prepare(
      "SELECT id FROM sales_opportunities WHERE customer_id=? AND location_id=? AND sales_rep_id=? AND opportunity_type=? AND status IN ('OPEN','ACCEPTED') LIMIT 1"
    )
    .bind(command.customerId, command.locationId, command.salesRepId, command.opportunityType)
    .first<{ id: string }>();
  if (existing) {
    if (
      await context.db
        .prepare("SELECT id FROM sales_opportunities WHERE id=? AND status='OPEN'")
        .bind(existing.id)
        .first()
    ) {
      await context.db
        .prepare(
          `UPDATE sales_opportunities SET score=?,estimated_value=?,primary_reason_code=?,reason_codes_json=?,facts_json=?,
            source_task_id=?,source_campaign_id=?,generated_at=?,expires_at=?,updated_at=? WHERE id=?`
        )
        .bind(
          command.score,
          command.estimatedValue,
          command.primaryReasonCode,
          JSON.stringify(command.reasonCodes),
          JSON.stringify(command.facts),
          command.sourceTaskId,
          command.sourceCampaignId,
          command.generatedAt,
          command.expiresAt,
          command.generatedAt,
          existing.id
        )
        .run();
    }
    return { opportunity: await requireOpportunity(context, existing.id), duplicate: true };
  }
  await context.db
    .prepare(
      `INSERT INTO sales_opportunities (id,customer_id,location_id,sales_rep_id,opportunity_type,score,
        estimated_value,status,primary_reason_code,reason_codes_json,facts_json,source_task_id,
        source_campaign_id,generated_at,expires_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,'OPEN',?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      command.id,
      command.customerId,
      command.locationId,
      command.salesRepId,
      command.opportunityType,
      command.score,
      command.estimatedValue,
      command.primaryReasonCode,
      JSON.stringify(command.reasonCodes),
      JSON.stringify(command.facts),
      command.sourceTaskId,
      command.sourceCampaignId,
      command.generatedAt,
      command.expiresAt,
      command.generatedAt,
      command.generatedAt
    )
    .run();
  return { opportunity: await requireOpportunity(context, command.id), duplicate: false };
}

export async function listSalesOpportunities(
  context: DatabaseContext,
  query: OpportunityListQuery = {}
): Promise<OpportunityPage> {
  const page = normalizePagination(query);
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    where.push(sql);
    params.push(value);
  };
  if (query.salesRepId) add("o.sales_rep_id=?", query.salesRepId);
  if (query.opportunityType) add("o.opportunity_type=?", query.opportunityType);
  if (query.status) add("o.status=?", query.status);
  if (query.customerId) add("o.customer_id=?", query.customerId);
  if (query.minimumScore !== undefined) add("o.score>=?", query.minimumScore);
  if (query.maximumScore !== undefined) add("o.score<=?", query.maximumScore);
  if (query.hasCoordinates === true)
    where.push("l.latitude IS NOT NULL AND l.longitude IS NOT NULL");
  if (query.hasCoordinates === false) where.push("(l.latitude IS NULL OR l.longitude IS NULL)");
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = await context.db
    .prepare(
      `SELECT COUNT(*) AS total FROM sales_opportunities o JOIN customer_locations l ON l.id=o.location_id ${whereSql}`
    )
    .bind(...params)
    .first<CountRow>();
  const rows = await context.db
    .prepare(
      `${opportunitySelect} ${whereSql} ORDER BY o.score DESC,o.generated_at DESC,o.id LIMIT ? OFFSET ?`
    )
    .bind(...params, page.pageSize, page.offset)
    .all<OpportunityRow>();
  return {
    items: rows.results.map(mapOpportunity),
    pagination: toPagination(page.page, page.pageSize, total?.total ?? 0)
  };
}

export async function getSalesOpportunity(
  context: DatabaseContext,
  id: string
): Promise<OpportunityItem | null> {
  const row = await context.db
    .prepare(`${opportunitySelect} WHERE o.id=?`)
    .bind(id)
    .first<OpportunityRow>();
  return row ? mapOpportunity(row) : null;
}

export async function transitionSalesOpportunity(
  context: DatabaseContext,
  id: string,
  status: "ACCEPTED" | "DISMISSED" | "CONVERTED",
  now: string
): Promise<{ opportunity: OpportunityItem; duplicate: boolean }> {
  const current = await requireOpportunity(context, id);
  if (current.status === status) return { opportunity: current, duplicate: true };
  if (current.status !== "OPEN" && !(current.status === "ACCEPTED" && status === "CONVERTED"))
    throw new OpportunityWriteError(
      "OPPORTUNITY_STATE_INVALID",
      "Opportunity transition is not allowed."
    );
  await context.db
    .prepare(
      "UPDATE sales_opportunities SET status=?,accepted_at=?,dismissed_at=?,updated_at=? WHERE id=?"
    )
    .bind(
      status,
      status === "ACCEPTED" ? now : current.acceptedAt,
      status === "DISMISSED" ? now : current.dismissedAt,
      now,
      id
    )
    .run();
  return { opportunity: await requireOpportunity(context, id), duplicate: false };
}

export async function saveGeneratedRoute(
  context: DatabaseContext,
  command: SaveRouteCommand
): Promise<RouteSaveResult> {
  const existing = await context.db
    .prepare(
      "SELECT id,status FROM sales_routes WHERE sales_rep_id=? AND route_date=? AND status IN ('DRAFT','RECOMMENDED','ACCEPTED','IN_PROGRESS') LIMIT 1"
    )
    .bind(command.salesRepId, command.routeDate)
    .first<{ id: string; status: SalesRouteStatus }>();
  if (existing && ["ACCEPTED", "IN_PROGRESS"].includes(existing.status))
    throw new OpportunityWriteError(
      "ROUTE_STATE_INVALID",
      "Accepted routes require explicit manual changes."
    );
  const routeId = existing?.id ?? command.id;
  if (existing) {
    await context.db.prepare("DELETE FROM sales_route_stops WHERE route_id=?").bind(routeId).run();
    await updateRouteSummary(context, routeId, command, command.now);
  } else {
    await context.db
      .prepare(
        `INSERT INTO sales_routes (id,sales_rep_id,route_date,status,provider,start_latitude,start_longitude,
          end_latitude,end_longitude,planned_distance_km,planned_travel_minutes,planned_visit_minutes,
          planned_duration_minutes,estimated_value,created_by_user_id,created_at,updated_at)
         VALUES (?,?,?,'RECOMMENDED',?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        routeId,
        command.salesRepId,
        command.routeDate,
        command.provider,
        command.startLatitude,
        command.startLongitude,
        command.endLatitude,
        command.endLongitude,
        command.plannedDistanceKm,
        command.plannedTravelMinutes,
        command.plannedVisitMinutes,
        command.plannedDurationMinutes,
        command.estimatedValue,
        command.createdByUserId,
        command.now,
        command.now
      )
      .run();
  }
  await insertRouteStops(context, routeId, command.stops, command.now);
  return { route: await requireRoute(context, routeId), replaced: Boolean(existing) };
}

export async function replaceRoutePlan(
  context: DatabaseContext,
  routeId: string,
  command: Omit<
    SaveRouteCommand,
    "id" | "salesRepId" | "routeDate" | "createdByUserId" | "provider"
  >
): Promise<SalesRouteDetail> {
  const route = await requireRoute(context, routeId);
  if (!["DRAFT", "RECOMMENDED", "ACCEPTED"].includes(route.status))
    throw new OpportunityWriteError("ROUTE_STATE_INVALID", "This route can no longer be edited.");
  await context.db.prepare("DELETE FROM sales_route_stops WHERE route_id=?").bind(routeId).run();
  await updateRouteSummary(context, routeId, command, command.now);
  await insertRouteStops(context, routeId, command.stops, command.now);
  return requireRoute(context, routeId);
}

export async function listSalesRoutes(
  context: DatabaseContext,
  query: RouteListQuery = {}
): Promise<RoutePage> {
  const page = normalizePagination(query);
  const where: string[] = [];
  const params: unknown[] = [];
  if (query.salesRepId) {
    where.push("r.sales_rep_id=?");
    params.push(query.salesRepId);
  }
  if (query.status) {
    where.push("r.status=?");
    params.push(query.status);
  }
  if (query.routeDate) {
    where.push("r.route_date=?");
    params.push(query.routeDate);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = await context.db
    .prepare(`SELECT COUNT(*) AS total FROM sales_routes r ${whereSql}`)
    .bind(...params)
    .first<CountRow>();
  const rows = await context.db
    .prepare(
      `${routeSelect} ${whereSql} ORDER BY r.route_date DESC,r.created_at DESC LIMIT ? OFFSET ?`
    )
    .bind(...params, page.pageSize, page.offset)
    .all<RouteRow>();
  return {
    items: rows.results.map(mapRoute),
    pagination: toPagination(page.page, page.pageSize, total?.total ?? 0)
  };
}

export async function getSalesRoute(
  context: DatabaseContext,
  id: string
): Promise<SalesRouteDetail | null> {
  const row = await context.db.prepare(`${routeSelect} WHERE r.id=?`).bind(id).first<RouteRow>();
  if (!row) return null;
  const stops = await context.db
    .prepare(
      `SELECT s.id,s.route_id,s.opportunity_id,s.customer_id,c.company_name AS customer_name,
        s.location_id,l.name AS location_name,l.address,l.city,l.latitude,l.longitude,
        o.opportunity_type,o.score,o.estimated_value,s.sales_visit_id,s.sequence,s.planned_arrival,
        s.planned_duration_minutes,s.distance_from_previous_km,s.travel_time_from_previous_minutes,
        s.route_utility,s.status FROM sales_route_stops s JOIN sales_opportunities o ON o.id=s.opportunity_id
        JOIN customers c ON c.id=s.customer_id JOIN customer_locations l ON l.id=s.location_id
        WHERE s.route_id=? AND s.status<>'REMOVED' ORDER BY s.sequence`
    )
    .bind(id)
    .all<RouteStopRow>();
  return { ...mapRoute(row), stops: stops.results.map(mapRouteStop) };
}

export async function transitionSalesRoute(
  context: DatabaseContext,
  id: string,
  status: "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  now: string
): Promise<{ route: SalesRouteDetail; duplicate: boolean }> {
  const route = await requireRoute(context, id);
  if (route.status === status) return { route, duplicate: true };
  const allowed: Record<SalesRouteStatus, SalesRouteStatus[]> = {
    DRAFT: ["RECOMMENDED", "CANCELLED"],
    RECOMMENDED: ["ACCEPTED", "CANCELLED"],
    ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: []
  };
  if (!allowed[route.status].includes(status))
    throw new OpportunityWriteError("ROUTE_STATE_INVALID", "Route transition is not allowed.");
  await context.db
    .prepare(
      "UPDATE sales_routes SET status=?,accepted_at=?,started_at=?,completed_at=?,updated_at=? WHERE id=?"
    )
    .bind(
      status,
      status === "ACCEPTED" ? now : route.acceptedAt,
      status === "IN_PROGRESS" ? now : route.startedAt,
      status === "COMPLETED" ? now : route.completedAt,
      now,
      id
    )
    .run();
  return { route: await requireRoute(context, id), duplicate: false };
}

export async function scheduleRouteStopVisit(
  context: DatabaseContext,
  routeId: string,
  stopId: string,
  visitId: string,
  now: string
): Promise<{ visitId: string; duplicate: boolean }> {
  const route = await requireRoute(context, routeId);
  if (!["ACCEPTED", "IN_PROGRESS"].includes(route.status))
    throw new OpportunityWriteError(
      "ROUTE_STATE_INVALID",
      "Accept the route before planning visits."
    );
  const stop = route.stops.find((candidate) => candidate.id === stopId);
  if (!stop) throw new OpportunityWriteError("ROUTE_STOP_NOT_FOUND", "Route stop not found.");
  if (stop.salesVisitId) return { visitId: stop.salesVisitId, duplicate: true };
  const source = await context.db
    .prepare("SELECT source_task_id FROM sales_opportunities WHERE id=?")
    .bind(stop.opportunityId)
    .first<{ source_task_id: string | null }>();
  await context.db.batch([
    context.db
      .prepare(
        `INSERT INTO sales_visits (id,customer_id,customer_location_id,sales_rep_id,source_task_id,
          create_idempotency_key,planned_at,status,created_at,updated_at)
         VALUES (?,?,?,?,?,? ,?,'planned',?,?)`
      )
      .bind(
        visitId,
        stop.customerId,
        stop.locationId,
        route.salesRep.id,
        source?.source_task_id ?? null,
        `route-stop:${stopId}`,
        stop.plannedArrival,
        now,
        now
      ),
    context.db
      .prepare(
        "UPDATE sales_route_stops SET sales_visit_id=?,status='VISIT_PLANNED',updated_at=? WHERE id=?"
      )
      .bind(visitId, now, stopId),
    context.db
      .prepare(
        "UPDATE sales_opportunities SET status='ACCEPTED',accepted_at=COALESCE(accepted_at,?),updated_at=? WHERE id=? AND status='OPEN'"
      )
      .bind(now, now, stop.opportunityId)
  ]);
  return { visitId, duplicate: false };
}

async function insertRouteStops(
  context: DatabaseContext,
  routeId: string,
  stops: SaveRouteCommand["stops"],
  now: string
) {
  if (!stops.length) return;
  await context.db.batch(
    stops.map((stop) =>
      context.db
        .prepare(
          `INSERT INTO sales_route_stops (id,route_id,opportunity_id,customer_id,location_id,sequence,
            planned_arrival,planned_duration_minutes,distance_from_previous_km,
            travel_time_from_previous_minutes,route_utility,status,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,'PLANNED',?,?)`
        )
        .bind(
          stop.id,
          routeId,
          stop.opportunityId,
          stop.customerId,
          stop.locationId,
          stop.sequence,
          stop.plannedArrival,
          stop.plannedDurationMinutes,
          stop.distanceFromPreviousKm,
          stop.travelTimeFromPreviousMinutes,
          stop.routeUtility,
          now,
          now
        )
    )
  );
}

async function updateRouteSummary(
  context: DatabaseContext,
  routeId: string,
  command: Pick<
    SaveRouteCommand,
    | "startLatitude"
    | "startLongitude"
    | "endLatitude"
    | "endLongitude"
    | "plannedDistanceKm"
    | "plannedTravelMinutes"
    | "plannedVisitMinutes"
    | "plannedDurationMinutes"
    | "estimatedValue"
  >,
  now: string
) {
  await context.db
    .prepare(
      `UPDATE sales_routes SET start_latitude=?,start_longitude=?,end_latitude=?,end_longitude=?,
        planned_distance_km=?,planned_travel_minutes=?,planned_visit_minutes=?,planned_duration_minutes=?,
        estimated_value=?,updated_at=? WHERE id=?`
    )
    .bind(
      command.startLatitude,
      command.startLongitude,
      command.endLatitude,
      command.endLongitude,
      command.plannedDistanceKm,
      command.plannedTravelMinutes,
      command.plannedVisitMinutes,
      command.plannedDurationMinutes,
      command.estimatedValue,
      now,
      routeId
    )
    .run();
}

async function requireOpportunity(context: DatabaseContext, id: string): Promise<OpportunityItem> {
  const opportunity = await getSalesOpportunity(context, id);
  if (!opportunity)
    throw new OpportunityWriteError("OPPORTUNITY_NOT_FOUND", "Opportunity not found.");
  return opportunity;
}

async function requireRoute(context: DatabaseContext, id: string): Promise<SalesRouteDetail> {
  const route = await getSalesRoute(context, id);
  if (!route) throw new OpportunityWriteError("ROUTE_NOT_FOUND", "Route not found.");
  return route;
}

const opportunitySelect = `SELECT o.id,o.customer_id,c.company_name AS customer_name,o.location_id,
  l.name AS location_name,l.address,l.city,l.latitude,l.longitude,o.sales_rep_id,u.name AS sales_rep_name,
  u.email AS sales_rep_email,u.role AS sales_rep_role,o.opportunity_type,o.score,o.estimated_value,o.status,
  o.primary_reason_code,o.reason_codes_json,o.facts_json,o.source_task_id,o.source_campaign_id,
  o.generated_at,o.expires_at,o.accepted_at,o.dismissed_at,o.updated_at FROM sales_opportunities o
  JOIN customers c ON c.id=o.customer_id JOIN customer_locations l ON l.id=o.location_id
  JOIN users u ON u.id=o.sales_rep_id`;

const routeSelect = `SELECT r.id,r.sales_rep_id,u.name AS sales_rep_name,u.email AS sales_rep_email,
  u.role AS sales_rep_role,r.route_date,r.status,r.provider,r.start_latitude,r.start_longitude,
  r.end_latitude,r.end_longitude,r.planned_distance_km,r.planned_travel_minutes,
  r.planned_visit_minutes,r.planned_duration_minutes,r.estimated_value,
  (SELECT COUNT(*) FROM sales_route_stops s WHERE s.route_id=r.id AND s.status<>'REMOVED') AS stop_count,
  r.accepted_at,r.started_at,r.completed_at,r.created_at,r.updated_at FROM sales_routes r
  JOIN users u ON u.id=r.sales_rep_id`;

interface OpportunityFactRow {
  customer_id: string;
  location_id: string;
  assigned_sales_rep_id: string;
  active: number;
  b2b_status: string;
  days_since_last_order: number | null;
  average_reorder_days: number | null;
  turnover_90d: number;
  previous_turnover_90d: number;
  lifetime_turnover: number;
  average_order_value: number | null;
  days_since_last_visit: number | null;
  task_priority: OpportunityFactRecord["openTaskPriority"];
  source_task_id: string | null;
  campaign_follow_up: number;
  source_campaign_id: string | null;
  cross_sell_gap: number;
  strategic_priority: number;
  last_order_date: string | null;
  last_visit_date: string | null;
}
interface OpportunityRow {
  id: string;
  customer_id: string;
  customer_name: string;
  location_id: string;
  location_name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  sales_rep_id: string;
  sales_rep_name: string;
  sales_rep_email: string;
  sales_rep_role: string;
  opportunity_type: OpportunityItem["opportunityType"];
  score: number;
  estimated_value: number | null;
  status: OpportunityStatus;
  primary_reason_code: string;
  reason_codes_json: string;
  facts_json: string;
  source_task_id: string | null;
  source_campaign_id: string | null;
  generated_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  dismissed_at: string | null;
  updated_at: string;
}
interface RouteRow {
  id: string;
  sales_rep_id: string;
  sales_rep_name: string;
  sales_rep_email: string;
  sales_rep_role: string;
  route_date: string;
  status: SalesRouteStatus;
  provider: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  planned_distance_km: number;
  planned_travel_minutes: number;
  planned_visit_minutes: number;
  planned_duration_minutes: number;
  estimated_value: number;
  stop_count: number;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
interface RouteStopRow {
  id: string;
  route_id: string;
  opportunity_id: string;
  customer_id: string;
  customer_name: string;
  location_id: string;
  location_name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  opportunity_type: RouteStopItem["opportunityType"];
  score: number;
  estimated_value: number | null;
  sales_visit_id: string | null;
  sequence: number;
  planned_arrival: string;
  planned_duration_minutes: number;
  distance_from_previous_km: number;
  travel_time_from_previous_minutes: number;
  route_utility: number;
  status: RouteStopItem["status"];
}

function mapOpportunity(row: OpportunityRow): OpportunityItem {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    locationId: row.location_id,
    locationName: row.location_name,
    address: row.address,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    hasCoordinates: row.latitude !== null && row.longitude !== null,
    salesRep: {
      id: row.sales_rep_id,
      name: row.sales_rep_name,
      email: row.sales_rep_email,
      role: row.sales_rep_role
    },
    opportunityType: row.opportunity_type,
    score: row.score,
    estimatedValue: row.estimated_value,
    status: row.status,
    primaryReasonCode: row.primary_reason_code,
    reasonCodes: parseJson(row.reason_codes_json, []),
    facts: parseJson(row.facts_json, {}),
    sourceTaskId: row.source_task_id,
    sourceCampaignId: row.source_campaign_id,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    dismissedAt: row.dismissed_at,
    updatedAt: row.updated_at
  };
}
function mapRoute(row: RouteRow): SalesRouteItem {
  return {
    id: row.id,
    salesRep: {
      id: row.sales_rep_id,
      name: row.sales_rep_name,
      email: row.sales_rep_email,
      role: row.sales_rep_role
    },
    routeDate: row.route_date,
    status: row.status,
    provider: row.provider,
    startLatitude: row.start_latitude,
    startLongitude: row.start_longitude,
    endLatitude: row.end_latitude,
    endLongitude: row.end_longitude,
    plannedDistanceKm: row.planned_distance_km,
    plannedTravelMinutes: row.planned_travel_minutes,
    plannedVisitMinutes: row.planned_visit_minutes,
    plannedDurationMinutes: row.planned_duration_minutes,
    estimatedValue: row.estimated_value,
    stopCount: row.stop_count,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapRouteStop(row: RouteStopRow): RouteStopItem {
  return {
    id: row.id,
    routeId: row.route_id,
    opportunityId: row.opportunity_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    locationId: row.location_id,
    locationName: row.location_name,
    address: row.address,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    opportunityType: row.opportunity_type,
    opportunityScore: row.score,
    estimatedValue: row.estimated_value,
    salesVisitId: row.sales_visit_id,
    sequence: row.sequence,
    plannedArrival: row.planned_arrival,
    plannedDurationMinutes: row.planned_duration_minutes,
    distanceFromPreviousKm: row.distance_from_previous_km,
    travelTimeFromPreviousMinutes: row.travel_time_from_previous_minutes,
    routeUtility: row.route_utility,
    status: row.status
  };
}
function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
