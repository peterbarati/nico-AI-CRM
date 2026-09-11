import type { DatabaseContext } from "../types";
import type {
  CompanyTargetRecord,
  CompanyTargetRow,
  DashboardFacts,
  DashboardFactsRow,
  KpiDefinitionRecord,
  KpiDefinitionRow,
  KpiTargetRecord,
  KpiTargetRow,
  ManagementKpiData,
  ManagementQuery,
  UserKpiFacts,
  UserKpiFactsRow
} from "./types";

export async function getManagementKpiData(
  context: DatabaseContext,
  query: ManagementQuery
): Promise<ManagementKpiData> {
  const [definitions, targets, companyTargets, users, dashboard] = await Promise.all([
    listKpiDefinitions(context, query.role),
    listKpiTargets(context, query),
    listCompanyTargets(context, query),
    listUserKpiFacts(context, query),
    getDashboardFacts(context, query)
  ]);
  return { definitions, targets, companyTargets, users, dashboard };
}

export async function listKpiDefinitions(
  context: DatabaseContext,
  role?: ManagementQuery["role"]
): Promise<KpiDefinitionRecord[]> {
  const result = await context.db
    .prepare(
      `SELECT id, code, name, metric_type, role, source_key
       FROM kpi_definitions
       WHERE active = 1 AND role IS NOT NULL AND source_key IS NOT NULL
         AND (? IS NULL OR role = ?)
       ORDER BY role, code`
    )
    .bind(role ?? null, role ?? null)
    .all<KpiDefinitionRow>();
  return result.results.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    metricType: row.metric_type,
    role: row.role,
    sourceKey: row.source_key
  }));
}

export async function listKpiTargets(
  context: DatabaseContext,
  query: ManagementQuery
): Promise<KpiTargetRecord[]> {
  const result = await context.db
    .prepare(
      `SELECT t.kpi_definition_id, t.user_id, t.role, t.period_start, t.period_end,
              t.target_value, COALESCE(t.weight, 0) AS weight
       FROM kpi_targets t
       JOIN kpi_definitions d ON d.id = t.kpi_definition_id AND d.active = 1
       WHERE t.period_start <= ? AND t.period_end >= ?
         AND (? IS NULL OR d.role = ?)
         AND (? IS NULL OR t.user_id = ? OR (t.user_id IS NULL AND t.role = d.role))
       ORDER BY t.user_id IS NOT NULL DESC, t.period_start DESC`
    )
    .bind(
      query.range.toDate,
      query.range.fromDate,
      query.role ?? null,
      query.role ?? null,
      query.userId ?? null,
      query.userId ?? null
    )
    .all<KpiTargetRow>();
  return result.results.map((row) => ({
    kpiDefinitionId: row.kpi_definition_id,
    userId: row.user_id,
    role: row.role,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    targetValue: row.target_value,
    weight: row.weight ?? 0
  }));
}

export async function listCompanyTargets(
  context: DatabaseContext,
  query: ManagementQuery
): Promise<CompanyTargetRecord[]> {
  const result = await context.db
    .prepare(
      `SELECT kpi_definition_id, period_start, period_end, target_value
       FROM company_kpi_targets
       WHERE period_start <= ? AND period_end >= ?
       ORDER BY period_start DESC`
    )
    .bind(query.range.toDate, query.range.fromDate)
    .all<CompanyTargetRow>();
  return result.results.map((row) => ({
    kpiDefinitionId: row.kpi_definition_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    targetValue: row.target_value
  }));
}

export async function listUserKpiFacts(
  context: DatabaseContext,
  query: ManagementQuery
): Promise<UserKpiFacts[]> {
  const params = [
    query.range.fromUtc,
    query.range.toUtcExclusive,
    query.range.fromDate,
    query.range.toDate,
    query.attributionWindowDays,
    query.reactivationInactivityDays,
    query.nowUtc,
    query.role ?? null,
    query.role ?? null,
    query.userId ?? null,
    query.userId ?? null
  ];
  const result = await context.db
    .prepare(
      `${attributionCtes()}
       SELECT u.id AS user_id, u.name AS user_name, u.role,
         COALESCE((SELECT SUM(ao.net_amount) FROM attributed_orders ao
                   WHERE ao.user_id = u.id AND ao.attribution_rank = 1), 0) AS attributed_turnover,
         (SELECT COUNT(*) FROM customer_interactions i
          WHERE i.user_id = u.id AND i.interaction_type = 'CALL'
            AND i.created_at >= p.from_utc AND i.created_at < p.to_utc) AS calls_completed,
         (SELECT COUNT(*) FROM sales_visits v
          WHERE v.sales_rep_id = u.id AND v.status = 'completed'
            AND v.completed_at >= p.from_utc AND v.completed_at < p.to_utc) AS visits_completed,
         (SELECT COUNT(*) FROM tasks t
          WHERE t.assigned_user_id = u.id AND t.status = 'completed'
            AND t.completed_at >= p.from_utc AND t.completed_at < p.to_utc) AS completed_tasks,
         (SELECT COUNT(DISTINCT ao.customer_id) FROM attributed_orders ao
          WHERE ao.user_id = u.id AND ao.attribution_rank = 1
            AND ao.previous_order_date IS NOT NULL
            AND julianday(ao.order_date) - julianday(ao.previous_order_date) >= p.reactivation_days
         ) AS reactivations,
         (SELECT COUNT(*) FROM b2b_activations b
          WHERE b.attributed_user_id = u.id
            AND b.activated_at >= p.from_utc AND b.activated_at < p.to_utc) AS b2b_activations
       FROM users u CROSS JOIN params p
       WHERE u.active = 1 AND u.role IN ('customer_service', 'sales_rep')
         AND (? IS NULL OR u.role = ?)
         AND (? IS NULL OR u.id = ?)
       ORDER BY u.role, u.name`
    )
    .bind(...params)
    .all<UserKpiFactsRow>();
  return result.results.map(mapUserFacts);
}

export async function getDashboardFacts(
  context: DatabaseContext,
  query: ManagementQuery
): Promise<DashboardFacts> {
  const row = await context.db
    .prepare(
      `${attributionCtes()},
       last_orders AS (
         SELECT c.id AS customer_id,
                MAX(CASE WHEN o.status = 'completed' AND o.order_date <= p.to_date THEN o.order_date END) AS last_order_date
         FROM customers c CROSS JOIN params p
         LEFT JOIN orders o ON o.customer_id = c.id
         WHERE c.active = 1
         GROUP BY c.id
       )
       SELECT
         COALESCE((SELECT SUM(o.net_amount) FROM orders o
                   WHERE o.status = 'completed' AND o.order_date >= p.from_date AND o.order_date <= p.to_date), 0) AS turnover,
         (SELECT COUNT(*) FROM customers c WHERE c.active = 1) AS active_customers,
         (SELECT COUNT(*) FROM last_orders l WHERE l.last_order_date IS NOT NULL
          AND julianday(p.to_date) - julianday(l.last_order_date) >= 30
          AND julianday(p.to_date) - julianday(l.last_order_date) < 60) AS at_risk_customers,
         (SELECT COUNT(*) FROM last_orders l WHERE l.last_order_date IS NULL
          OR julianday(p.to_date) - julianday(l.last_order_date) >= 60) AS critical_customers,
         (SELECT COUNT(*) FROM last_orders l WHERE l.last_order_date IS NULL
          OR julianday(p.to_date) - julianday(l.last_order_date) >= p.reactivation_days) AS reactivation_candidates,
         (SELECT COUNT(DISTINCT ao.customer_id) FROM attributed_orders ao
          WHERE ao.attribution_rank = 1 AND ao.previous_order_date IS NOT NULL
            AND julianday(ao.order_date) - julianday(ao.previous_order_date) >= p.reactivation_days) AS reactivated_customers,
         (SELECT COUNT(*) FROM customer_interactions i WHERE i.interaction_type = 'CALL'
          AND i.created_at >= p.from_utc AND i.created_at < p.to_utc) AS calls_completed,
         (SELECT COUNT(*) FROM sales_visits v WHERE v.status = 'completed'
          AND v.completed_at >= p.from_utc AND v.completed_at < p.to_utc) AS visits_completed,
         (SELECT COUNT(*) FROM customers c WHERE c.active = 1 AND c.b2b_status = 'registered') AS b2b_registered_customers,
         ROUND(100.0 * (SELECT COUNT(*) FROM customers c WHERE c.active = 1 AND c.b2b_status = 'registered') /
           NULLIF((SELECT COUNT(*) FROM customers c WHERE c.active = 1), 0), 2) AS b2b_penetration_percent,
         (SELECT COUNT(*) FROM tasks t WHERE t.status IN ('open', 'in_progress')
          AND t.due_at IS NOT NULL AND t.due_at < p.now_utc) AS overdue_tasks,
         (SELECT COUNT(*) FROM tasks t JOIN users creator ON creator.id = t.created_by_user_id
          JOIN users assigned ON assigned.id = t.assigned_user_id
          WHERE creator.role = 'customer_service' AND assigned.role = 'sales_rep'
            AND t.source_interaction_id IS NOT NULL
            AND t.created_at >= p.from_utc AND t.created_at < p.to_utc) AS cs_to_sales_handoffs,
         (SELECT COUNT(*) FROM tasks t JOIN users creator ON creator.id = t.created_by_user_id
          JOIN users assigned ON assigned.id = t.assigned_user_id
          WHERE creator.role = 'sales_rep' AND assigned.role = 'customer_service'
            AND t.source_visit_id IS NOT NULL
            AND t.created_at >= p.from_utc AND t.created_at < p.to_utc) AS sales_to_cs_handoffs
       FROM params p`
    )
    .bind(
      query.range.fromUtc,
      query.range.toUtcExclusive,
      query.range.fromDate,
      query.range.toDate,
      query.attributionWindowDays,
      query.reactivationInactivityDays,
      query.nowUtc
    )
    .first<DashboardFactsRow>();
  if (!row) throw new Error("Dashboard aggregation returned no result.");
  return {
    turnover: row.turnover,
    activeCustomers: row.active_customers,
    atRiskCustomers: row.at_risk_customers,
    criticalCustomers: row.critical_customers,
    reactivationCandidates: row.reactivation_candidates,
    reactivatedCustomers: row.reactivated_customers,
    callsCompleted: row.calls_completed,
    visitsCompleted: row.visits_completed,
    b2bRegisteredCustomers: row.b2b_registered_customers,
    b2bPenetrationPercent: row.b2b_penetration_percent ?? 0,
    overdueTasks: row.overdue_tasks,
    csToSalesHandoffs: row.cs_to_sales_handoffs,
    salesToCsHandoffs: row.sales_to_cs_handoffs
  };
}

function attributionCtes(): string {
  return `WITH params AS (
    SELECT ? AS from_utc, ? AS to_utc, ? AS from_date, ? AS to_date,
           ? AS attribution_days, ? AS reactivation_days, ? AS now_utc
  ),
  activities AS (
    SELECT i.id, i.customer_id, i.user_id, i.created_at AS activity_at, 'interaction' AS activity_type
    FROM customer_interactions i
    UNION ALL
    SELECT v.id, v.customer_id, v.sales_rep_id, v.completed_at, 'visit'
    FROM sales_visits v WHERE v.status = 'completed' AND v.completed_at IS NOT NULL
  ),
  period_orders AS (
    SELECT o.*,
      (SELECT MAX(previous.order_date) FROM orders previous
       WHERE previous.customer_id = o.customer_id AND previous.status = 'completed'
         AND previous.order_date < o.order_date) AS previous_order_date
    FROM orders o CROSS JOIN params p
    WHERE o.status = 'completed' AND o.order_date >= p.from_date AND o.order_date <= p.to_date
  ),
  attributed_orders AS (
    SELECT o.id AS order_id, o.customer_id, o.order_date, o.net_amount, o.previous_order_date,
           a.user_id, a.activity_type, a.activity_at,
           ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY a.activity_at DESC, a.id DESC) AS attribution_rank
    FROM period_orders o CROSS JOIN params p
    JOIN activities a ON a.customer_id = o.customer_id
      AND date(a.activity_at) <= o.order_date
      AND date(a.activity_at) >= date(o.order_date, '-' || p.attribution_days || ' days')
  )`;
}

function mapUserFacts(row: UserKpiFactsRow): UserKpiFacts {
  return {
    userId: row.user_id,
    userName: row.user_name,
    role: row.role,
    attributedTurnover: row.attributed_turnover,
    callsCompleted: row.calls_completed,
    visitsCompleted: row.visits_completed,
    completedTasks: row.completed_tasks,
    reactivations: row.reactivations,
    b2bActivations: row.b2b_activations
  };
}
