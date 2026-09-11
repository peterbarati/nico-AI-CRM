import {
  defaultCustomerServiceRulesConfig,
  evaluateCustomerServicePriority,
  type CustomerServicePriorityLevel,
  type CustomerServiceRulesConfig
} from "@nico-ai-crm/crm-rules";
import {
  countCompletedCustomerServiceCallsToday,
  createDatabaseContext,
  getCustomerFilterOptions,
  getCustomerOverview,
  getSystemConfigByPrefix,
  listCustomerServiceCandidates,
  listCustomerInteractions,
  listCustomerOrders,
  listCustomers,
  listCustomerTasks,
  listCustomerVisits,
  listSegments,
  listTasks,
  type CustomerListQuery,
  type CustomerSortField,
  type PaginationInput,
  type SortDirection
} from "@nico-ai-crm/db";
import type { HealthResponse } from "@nico-ai-crm/shared";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV?: string;
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8"
};

function jsonResponse<T>(body: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...init?.headers
    }
  });
}

function ok<T>(data: T, init?: ResponseInit): Response {
  return jsonResponse({ ok: true, data }, init);
}

function notFound(message = "Not found"): Response {
  return jsonResponse({ ok: false, error: { code: "NOT_FOUND", message } }, { status: 404 });
}

function badRequest(message: string): Response {
  return jsonResponse({ ok: false, error: { code: "BAD_REQUEST", message } }, { status: 400 });
}

function internalError(): Response {
  return jsonResponse(
    { ok: false, error: { code: "INTERNAL_ERROR", message: "Unexpected API error." } },
    { status: 500 }
  );
}

function parsePagination(url: URL): PaginationInput {
  return {
    page: parsePositiveInt(url.searchParams.get("page")),
    pageSize: parsePositiveInt(url.searchParams.get("pageSize"))
  };
}

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
}

function parseCustomerListQuery(url: URL): CustomerListQuery {
  const activeParam = url.searchParams.get("active");
  const sortParam = url.searchParams.get("sort");
  const directionParam = url.searchParams.get("direction");

  return {
    ...parsePagination(url),
    search: url.searchParams.get("search") ?? undefined,
    assignedSalesRepId: url.searchParams.get("assignedSalesRepId") ?? undefined,
    b2bStatus: url.searchParams.get("b2bStatus") ?? undefined,
    segmentCode: url.searchParams.get("segmentCode") ?? undefined,
    active:
      activeParam === null
        ? undefined
        : activeParam === "true" || activeParam === "1"
          ? true
          : activeParam === "false" || activeParam === "0"
            ? false
            : undefined,
    sort: isCustomerSortField(sortParam) ? sortParam : undefined,
    direction: isSortDirection(directionParam) ? directionParam : undefined
  };
}

function parseCustomerServiceQueueQuery(url: URL) {
  const priority = url.searchParams.get("priority");

  return {
    limit: parsePositiveInt(url.searchParams.get("limit")),
    priority: isCustomerServicePriorityLevel(priority) ? priority : undefined,
    assignedSalesRepId: url.searchParams.get("assignedSalesRepId") ?? undefined,
    segmentCode: url.searchParams.get("segmentCode") ?? undefined
  };
}

function isCustomerServicePriorityLevel(
  value: string | null
): value is CustomerServicePriorityLevel {
  return value === "CRITICAL" || value === "HIGH" || value === "MEDIUM" || value === "LOW";
}

function isCustomerSortField(value: string | null): value is CustomerSortField {
  return (
    value === "company_name" ||
    value === "city" ||
    value === "updated_at" ||
    value === "last_order_date" ||
    value === "turnover_90d" ||
    value === "days_since_last_order"
  );
}

function isSortDirection(value: string | null): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function createHealthResponse(): HealthResponse {
  return {
    ok: true,
    service: "nico-ai-crm-api",
    mode: "mock",
    timestamp: new Date().toISOString()
  };
}

async function handleApiRequest(request: Request, env: Env, url: URL): Promise<Response> {
  const context = createDatabaseContext(env.DB);

  if (url.pathname === "/api/health") {
    return jsonResponse(createHealthResponse());
  }

  if (request.method !== "GET") {
    return badRequest("Only read-only GET API endpoints are available in this phase.");
  }

  if (url.pathname === "/api/customers") {
    const result = await listCustomers(context, parseCustomerListQuery(url));
    return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
  }

  if (url.pathname === "/api/customers/filters") {
    return ok(await getCustomerFilterOptions(context));
  }

  if (url.pathname === "/api/segments") {
    return ok(await listSegments(context));
  }

  if (url.pathname === "/api/tasks") {
    const result = await listTasks(context, {
      ...parsePagination(url),
      status: url.searchParams.get("status") ?? undefined
    });
    return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
  }

  if (url.pathname === "/api/customer-service/queue") {
    const now = new Date();
    const query = parseCustomerServiceQueueQuery(url);
    const [configRows, candidates, callsCompletedToday] = await Promise.all([
      getSystemConfigByPrefix(context, "customer_service."),
      listCustomerServiceCandidates(context, {
        ...query,
        limit: query.limit ? Math.max(query.limit * 5, 100) : undefined,
        now
      }),
      countCompletedCustomerServiceCallsToday(context, now)
    ]);
    const config = applyCustomerServiceConfigRows(defaultCustomerServiceRulesConfig, configRows);
    const rankedItems = candidates
      .map((candidate) => {
        const priority = evaluateCustomerServicePriority(
          {
            active: candidate.active,
            averageReorderDays: candidate.averageReorderDays,
            b2bStatus: candidate.b2bStatus,
            campaignClickedWithoutConversion: candidate.campaignClickedWithoutConversion,
            customerId: candidate.customerId,
            daysSinceLastOrder: candidate.daysSinceLastOrder,
            lastInteractionAt: candidate.lastInteraction?.createdAt ?? null,
            openTaskCount: candidate.openTaskCount,
            overdueTaskCount: candidate.overdueTaskCount,
            previousTurnover90d: candidate.previousTurnover90d,
            segmentCodes: candidate.segments.map((segment) => segment.code),
            turnover90d: candidate.turnover90d
          },
          config,
          now
        );

        return {
          ...candidate,
          priority
        };
      })
      .filter((item) => item.priority.shouldContact)
      .filter((item) => !query.priority || item.priority.priorityLevel === query.priority)
      .sort(
        (left, right) =>
          right.priority.priorityScore - left.priority.priorityScore ||
          right.turnover90d - left.turnover90d ||
          left.companyName.localeCompare(right.companyName)
      );
    const limit = query.limit ?? config.dailyCallTarget;
    const items = rankedItems.slice(0, limit);
    const summary = {
      dailyCallTarget: config.dailyCallTarget,
      callsCompletedToday,
      callsRemaining: Math.max(0, config.dailyCallTarget - callsCompletedToday),
      criticalCustomers: rankedItems.filter((item) => item.priority.priorityLevel === "CRITICAL")
        .length,
      highPriorityCustomers: rankedItems.filter((item) => item.priority.priorityLevel === "HIGH")
        .length,
      reactivationCandidates: rankedItems.filter((item) =>
        item.priority.recommendedActions.includes("REACTIVATION")
      ).length,
      overdueFollowUps: rankedItems.filter((item) => item.overdueTaskCount > 0).length
    };

    return jsonResponse({
      ok: true,
      data: {
        items,
        summary,
        meta: {
          generatedAt: now.toISOString(),
          limit,
          evaluatedCandidates: candidates.length,
          returned: items.length
        }
      }
    });
  }

  const customerRoute = url.pathname.match(
    /^\/api\/customers\/([^/]+)(?:\/(orders|interactions|tasks|visits))?$/
  );

  if (customerRoute) {
    const customerId = decodeURIComponent(customerRoute[1]);
    const childRoute = customerRoute[2];

    if (!childRoute) {
      const overview = await getCustomerOverview(context, customerId);
      return overview ? ok(overview) : notFound("Customer not found.");
    }

    if (childRoute === "orders") {
      const result = await listCustomerOrders(context, customerId, parsePagination(url));
      return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
    }

    if (childRoute === "interactions") {
      const result = await listCustomerInteractions(context, customerId, parsePagination(url));
      return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
    }

    if (childRoute === "tasks") {
      const result = await listCustomerTasks(context, customerId, {
        ...parsePagination(url),
        status: url.searchParams.get("status") ?? undefined
      });
      return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
    }

    if (childRoute === "visits") {
      const result = await listCustomerVisits(context, customerId, parsePagination(url));
      return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
    }
  }

  return notFound();
}

function applyCustomerServiceConfigRows(
  defaults: CustomerServiceRulesConfig,
  rows: Array<{ key: string; value: string }>
): CustomerServiceRulesConfig {
  const config: CustomerServiceRulesConfig = {
    ...defaults,
    weights: {
      ...defaults.weights
    }
  };

  for (const row of rows) {
    const numericValue = Number(row.value);
    if (!Number.isFinite(numericValue)) {
      continue;
    }

    assignCustomerServiceConfigValue(config, row.key, numericValue);
  }

  return config;
}

function assignCustomerServiceConfigValue(
  config: CustomerServiceRulesConfig,
  key: string,
  value: number
) {
  switch (key) {
    case "customer_service.daily_call_target":
      config.dailyCallTarget = value;
      break;
    case "customer_service.reorder_grace_days":
      config.reorderGraceDays = value;
      break;
    case "customer_service.at_risk_days":
      config.atRiskDays = value;
      break;
    case "customer_service.critical_days":
      config.criticalDays = value;
      break;
    case "customer_service.reactivation_days":
      config.reactivationDays = value;
      break;
    case "customer_service.recent_interaction_suppression_days":
      config.recentInteractionSuppressionDays = value;
      break;
    case "customer_service.weight_reorder_slightly_overdue":
      config.weights.reorderSlightlyOverdue = value;
      break;
    case "customer_service.weight_reorder_significantly_overdue":
      config.weights.reorderSignificantlyOverdue = value;
      break;
    case "customer_service.weight_reorder_severely_overdue":
      config.weights.reorderSeverelyOverdue = value;
      break;
    case "customer_service.weight_decline_20":
      config.weights.decline20 = value;
      break;
    case "customer_service.weight_decline_30":
      config.weights.decline30 = value;
      break;
    case "customer_service.weight_decline_50":
      config.weights.decline50 = value;
      break;
    case "customer_service.weight_inactivity_at_risk":
      config.weights.inactivityAtRisk = value;
      break;
    case "customer_service.weight_inactivity_critical":
      config.weights.inactivityCritical = value;
      break;
    case "customer_service.weight_inactivity_reactivation":
      config.weights.inactivityReactivation = value;
      break;
    case "customer_service.weight_b2b_missing":
      config.weights.b2bMissing = value;
      break;
    case "customer_service.weight_campaign_interest":
      config.weights.campaignInterest = value;
      break;
    case "customer_service.weight_open_follow_up_task":
      config.weights.openFollowUpTask = value;
      break;
    case "customer_service.weight_overdue_follow_up_task":
      config.weights.overdueFollowUpTask = value;
      break;
    case "customer_service.weight_cross_sell":
      config.weights.crossSell = value;
      break;
    case "customer_service.weight_recent_interaction_reduction":
      config.weights.recentInteractionReduction = value;
      break;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApiRequest(request, env, url);
      } catch (error) {
        console.error(error);
        return internalError();
      }
    }

    return env.ASSETS.fetch(request);
  }
};
