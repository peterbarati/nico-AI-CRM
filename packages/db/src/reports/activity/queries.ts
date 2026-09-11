import type { DatabaseContext } from "../../types";
import type {
  ActivityMetrics,
  ActivityReport,
  ActivityReportQuery,
  ActivityUserRow,
  UserActivityBreakdown
} from "./types";

export async function getActivityReport(
  context: DatabaseContext,
  query: ActivityReportQuery
): Promise<ActivityReport> {
  const filters = ["u.active = 1"];
  const params: unknown[] = [query.range.fromUtc, query.range.toUtcExclusive, query.nowUtc];
  if (query.role) {
    filters.push("u.role = ?");
    params.push(query.role);
  }
  if (query.userId) {
    filters.push("u.id = ?");
    params.push(query.userId);
  }

  const result = await context.db
    .prepare(
      `
      WITH report_range AS (
        SELECT ? AS from_utc, ? AS to_utc, ? AS now_utc
      )
      SELECT u.id AS user_id, u.name AS user_name, u.role,
        (SELECT COUNT(*) FROM customer_interactions i
          WHERE i.user_id = u.id AND i.created_at >= r.from_utc AND i.created_at < r.to_utc
        ) AS customer_interactions,
        (SELECT COUNT(*) FROM customer_interactions i
          WHERE i.user_id = u.id AND i.interaction_type = 'CALL'
            AND i.created_at >= r.from_utc AND i.created_at < r.to_utc
        ) AS calls_completed,
        (SELECT COUNT(*) FROM sales_visits v
          WHERE v.sales_rep_id = u.id AND v.status = 'completed'
            AND v.completed_at >= r.from_utc AND v.completed_at < r.to_utc
        ) AS sales_visits_completed,
        (SELECT COUNT(*) FROM tasks t
          WHERE t.assigned_user_id = u.id AND t.status IN ('open', 'in_progress')
        ) AS open_tasks,
        (SELECT COUNT(*) FROM tasks t
          WHERE t.assigned_user_id = u.id AND t.status = 'completed'
            AND t.completed_at >= r.from_utc AND t.completed_at < r.to_utc
        ) AS completed_tasks,
        (SELECT COUNT(*) FROM tasks t
          WHERE t.assigned_user_id = u.id AND t.status IN ('open', 'in_progress')
            AND t.due_at IS NOT NULL AND t.due_at < r.now_utc
        ) AS overdue_tasks,
        (SELECT COUNT(*) FROM tasks t
          WHERE t.created_by_user_id = u.id
            AND t.created_at >= r.from_utc AND t.created_at < r.to_utc
            AND t.task_type IN ('call', 'email', 'follow_up', 'visit')
        ) AS follow_ups_created,
        (SELECT COUNT(*) FROM tasks t JOIN users assigned ON assigned.id = t.assigned_user_id
          WHERE t.created_by_user_id = u.id AND u.role = 'customer_service'
            AND assigned.role = 'sales_rep' AND t.source_interaction_id IS NOT NULL
            AND t.created_at >= r.from_utc AND t.created_at < r.to_utc
        ) AS cs_to_sales_handoffs,
        (SELECT COUNT(*) FROM tasks t JOIN users assigned ON assigned.id = t.assigned_user_id
          WHERE t.created_by_user_id = u.id AND u.role = 'sales_rep'
            AND assigned.role = 'customer_service' AND t.source_visit_id IS NOT NULL
            AND t.created_at >= r.from_utc AND t.created_at < r.to_utc
        ) AS sales_to_cs_handoffs,
        (SELECT COUNT(*) FROM customer_interactions i
          WHERE i.user_id = u.id AND i.reason = 'REACTIVATION'
            AND i.created_at >= r.from_utc AND i.created_at < r.to_utc
        ) AS reactivation_interactions,
        (SELECT COUNT(*) FROM sales_visits v
          LEFT JOIN tasks source_task ON source_task.id = v.source_task_id
          LEFT JOIN customer_interactions source_interaction ON source_interaction.id = source_task.source_interaction_id
          WHERE v.sales_rep_id = u.id AND v.status = 'completed'
            AND source_interaction.reason = 'REACTIVATION'
            AND v.completed_at >= r.from_utc AND v.completed_at < r.to_utc
        ) AS reactivation_visits,
        (SELECT COUNT(*) FROM customer_interactions i
          WHERE i.user_id = u.id AND i.reason = 'B2B_REGISTRATION'
            AND i.created_at >= r.from_utc AND i.created_at < r.to_utc
        ) AS b2b_interactions,
        (SELECT COUNT(*) FROM sales_visits v
          WHERE v.sales_rep_id = u.id AND v.status = 'completed' AND v.result = 'B2B_REGISTRATION'
            AND v.completed_at >= r.from_utc AND v.completed_at < r.to_utc
        ) AS b2b_visits
      FROM users u CROSS JOIN report_range r
      WHERE ${filters.join(" AND ")}
      ORDER BY u.role ASC, u.name ASC
    `
    )
    .bind(...params)
    .all<ActivityUserRow>();

  const users = result.results.map(mapUserActivity);
  return {
    period: query.range,
    metrics: users.reduce<ActivityMetrics>(
      (total, user) => ({
        callsCompleted: total.callsCompleted + user.callsCompleted,
        customerInteractions: total.customerInteractions + user.customerInteractions,
        salesVisitsCompleted: total.salesVisitsCompleted + user.salesVisitsCompleted,
        openTasks: total.openTasks + user.openTasks,
        completedTasks: total.completedTasks + user.completedTasks,
        overdueTasks: total.overdueTasks + user.overdueTasks,
        followUpsCreated: total.followUpsCreated + user.followUpsCreated,
        csToSalesHandoffs: total.csToSalesHandoffs + user.csToSalesHandoffs,
        salesToCsHandoffs: total.salesToCsHandoffs + user.salesToCsHandoffs,
        reactivationActivities: total.reactivationActivities + user.reactivationActivities,
        b2bActivities: total.b2bActivities + user.b2bActivities
      }),
      emptyMetrics()
    ),
    users
  };
}

function mapUserActivity(row: ActivityUserRow): UserActivityBreakdown {
  return {
    userId: row.user_id,
    userName: row.user_name,
    role: row.role,
    callsCompleted: row.calls_completed,
    customerInteractions: row.customer_interactions,
    salesVisitsCompleted: row.sales_visits_completed,
    openTasks: row.open_tasks,
    completedTasks: row.completed_tasks,
    overdueTasks: row.overdue_tasks,
    followUpsCreated: row.follow_ups_created,
    csToSalesHandoffs: row.cs_to_sales_handoffs,
    salesToCsHandoffs: row.sales_to_cs_handoffs,
    reactivationActivities: row.reactivation_interactions + row.reactivation_visits,
    b2bActivities: row.b2b_interactions + row.b2b_visits
  };
}

function emptyMetrics(): ActivityMetrics {
  return {
    callsCompleted: 0,
    customerInteractions: 0,
    salesVisitsCompleted: 0,
    openTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    followUpsCreated: 0,
    csToSalesHandoffs: 0,
    salesToCsHandoffs: 0,
    reactivationActivities: 0,
    b2bActivities: 0
  };
}
