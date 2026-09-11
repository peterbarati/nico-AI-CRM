import {
  defaultCustomerServiceRulesConfig,
  evaluateCustomerServicePriority,
  type CustomerServicePriorityLevel,
  type CustomerServiceRulesConfig
} from "@nico-ai-crm/crm-rules";
import {
  countCompletedCustomerServiceCallsToday,
  createCallWorkflow,
  createDatabaseContext,
  getCustomerFilterOptions,
  getCustomerOverview,
  getSystemConfigByPrefix,
  getSystemConfigValue,
  getActivityReport,
  getSalesTaskQueueItem,
  getSalesVisitBySourceTaskId,
  listCustomerServiceCandidates,
  listCustomerInteractions,
  listCustomerOrders,
  listCustomers,
  listCustomerTasks,
  listCustomerVisits,
  listSegments,
  listActiveUsersByRole,
  listSalesTasks,
  listTasks,
  CallWorkflowError,
  SalesWorkflowError,
  completeSalesVisit,
  scheduleSalesVisit,
  startSalesVisit,
  type CustomerListQuery,
  type CustomerSortField,
  type PaginationInput,
  type SortDirection
} from "@nico-ai-crm/db";
import {
  getBusinessDateRange,
  isValidBusinessTimezone,
  validateCreateCallRequest,
  validateCompleteSalesVisitRequest,
  validateScheduleSalesVisitRequest,
  type ActivityPeriodPreset,
  type ApiErrorResponse,
  type ApiSuccess,
  type HealthResponse,
  type ValidationIssue
} from "@nico-ai-crm/shared";
import { getCustomerServiceActorId, getSalesActorId } from "./actor";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV?: string;
  DEMO_CUSTOMER_SERVICE_USER_ID?: string;
  DEMO_SALES_USER_ID?: string;
}

const defaultBusinessTimezone = "Europe/Bratislava";

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
  return jsonResponse<ApiSuccess<T>>({ ok: true, data }, init);
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  fields?: ValidationIssue[]
): Response {
  return jsonResponse<ApiErrorResponse>(
    { ok: false, error: { code, message, ...(fields?.length ? { fields } : {}) } },
    { status }
  );
}

function notFound(message = "Not found"): Response {
  return errorResponse(404, "NOT_FOUND", message);
}

function badRequest(message: string): Response {
  return errorResponse(400, "BAD_REQUEST", message);
}

function validationError(issues: ValidationIssue[], status = 422): Response {
  return errorResponse(status, "VALIDATION_ERROR", "Request validation failed.", issues);
}

function methodNotAllowed(): Response {
  return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
}

function internalError(): Response {
  return errorResponse(500, "INTERNAL_ERROR", "Unexpected API error.");
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

  const interactionWriteRoute = url.pathname.match(/^\/api\/customers\/([^/]+)\/interactions$/);
  if (interactionWriteRoute && request.method === "POST") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    const now = new Date();
    const validation = validateCreateCallRequest(body, now);
    if (!validation.success) {
      return validationError(validation.issues, 400);
    }

    try {
      const result = await createCallWorkflow(context, {
        actorUserId: getCustomerServiceActorId(env),
        createdAt: now.toISOString(),
        customerId: decodeURIComponent(interactionWriteRoute[1]),
        interactionId: crypto.randomUUID(),
        request: validation.data,
        taskId: crypto.randomUUID()
      });
      return ok(result, { status: result.duplicate ? 200 : 201 });
    } catch (error) {
      if (error instanceof CallWorkflowError) {
        const status =
          error.code === "CUSTOMER_NOT_FOUND"
            ? 404
            : error.code === "IDEMPOTENCY_CONFLICT"
              ? 409
              : 422;
        return errorResponse(status, error.code, error.message);
      }
      throw error;
    }
  }

  const scheduleVisitRoute = url.pathname.match(/^\/api\/sales\/tasks\/([^/]+)\/visits$/);
  if (scheduleVisitRoute && request.method === "POST") {
    const body = await readJsonBody(request);
    if (body instanceof Response) return body;
    const now = new Date();
    const validation = validateScheduleSalesVisitRequest(body, now);
    if (!validation.success) return validationError(validation.issues);
    try {
      const result = await scheduleSalesVisit(context, {
        actorUserId: getSalesActorId(env),
        createdAt: now.toISOString(),
        request: validation.data,
        sourceTaskId: decodeURIComponent(scheduleVisitRoute[1]),
        visitId: crypto.randomUUID()
      });
      return ok(result, { status: result.duplicate ? 200 : 201 });
    } catch (error) {
      return handleSalesWorkflowError(error);
    }
  }

  const startVisitRoute = url.pathname.match(/^\/api\/sales\/visits\/([^/]+)\/start$/);
  if (startVisitRoute && request.method === "POST") {
    try {
      const result = await startSalesVisit(
        context,
        decodeURIComponent(startVisitRoute[1]),
        getSalesActorId(env),
        new Date().toISOString()
      );
      return ok(result);
    } catch (error) {
      return handleSalesWorkflowError(error);
    }
  }

  const completeVisitRoute = url.pathname.match(/^\/api\/sales\/visits\/([^/]+)\/complete$/);
  if (completeVisitRoute && request.method === "POST") {
    const body = await readJsonBody(request);
    if (body instanceof Response) return body;
    const now = new Date();
    const validation = validateCompleteSalesVisitRequest(body, now);
    if (!validation.success) return validationError(validation.issues);
    try {
      const result = await completeSalesVisit(context, {
        actorUserId: getSalesActorId(env),
        completedAt: now.toISOString(),
        customerServiceUserId: getCustomerServiceActorId(env),
        followUpTaskId: crypto.randomUUID(),
        request: validation.data,
        visitId: decodeURIComponent(completeVisitRoute[1])
      });
      return ok(result);
    } catch (error) {
      return handleSalesWorkflowError(error);
    }
  }

  if (request.method !== "GET") {
    return methodNotAllowed();
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

  if (url.pathname === "/api/users") {
    const role = url.searchParams.get("role");
    if (role !== "sales_rep" && role !== "customer_service") {
      return badRequest("Supported roles are sales_rep and customer_service.");
    }
    return ok(await listActiveUsersByRole(context, role));
  }

  if (url.pathname === "/api/sales/tasks") {
    const now = new Date();
    const businessRange = await getCurrentBusinessDay(context, now);
    const result = await listSalesTasks(context, {
      ...parsePagination(url),
      assignedUserId: url.searchParams.get("assignedUserId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
      due: parseSalesDueFilter(url.searchParams.get("due")),
      nowUtc: now.toISOString(),
      businessDayFromUtc: businessRange.fromUtc,
      businessDayToUtc: businessRange.toUtcExclusive
    });
    return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
  }

  const salesTaskRoute = url.pathname.match(/^\/api\/sales\/tasks\/([^/]+)$/);
  if (salesTaskRoute) {
    const task = await getSalesTaskQueueItem(context, decodeURIComponent(salesTaskRoute[1]));
    if (!task) return notFound("Sales task not found.");
    const [customer, visit] = await Promise.all([
      getCustomerOverview(context, task.customerId),
      getSalesVisitBySourceTaskId(context, task.id)
    ]);
    return ok({ task, customer, visit });
  }

  if (url.pathname === "/api/reports/activity") {
    const now = new Date();
    const timezone = await getBusinessTimezone(context);
    const preset = parseActivityPreset(url.searchParams.get("period"));
    try {
      const range = getBusinessDateRange(
        preset,
        now,
        timezone,
        url.searchParams.get("from") ?? undefined,
        url.searchParams.get("to") ?? undefined
      );
      return ok(
        await getActivityReport(context, {
          range,
          nowUtc: now.toISOString(),
          role: url.searchParams.get("role") ?? undefined,
          userId: url.searchParams.get("userId") ?? undefined
        })
      );
    } catch (error) {
      return badRequest(error instanceof Error ? error.message : "Invalid report period.");
    }
  }

  if (url.pathname === "/api/customer-service/queue") {
    const now = new Date();
    const businessRange = await getCurrentBusinessDay(context, now);
    const query = parseCustomerServiceQueueQuery(url);
    const [configRows, candidates, callsCompletedToday] = await Promise.all([
      getSystemConfigByPrefix(context, "customer_service."),
      listCustomerServiceCandidates(context, {
        ...query,
        limit: query.limit ? Math.max(query.limit * 5, 100) : undefined,
        now,
        businessDayToUtc: businessRange.toUtcExclusive
      }),
      countCompletedCustomerServiceCallsToday(context, businessRange)
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

async function readJsonBody(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
}

function handleSalesWorkflowError(error: unknown): Response {
  if (!(error instanceof SalesWorkflowError)) throw error;
  const status =
    error.code === "TASK_NOT_FOUND" || error.code === "VISIT_NOT_FOUND"
      ? 404
      : error.code === "IDEMPOTENCY_CONFLICT" || error.code === "VISIT_STATE_INVALID"
        ? 409
        : 422;
  return jsonResponse(
    { ok: false, error: { code: error.code, message: error.message } },
    { status }
  );
}

async function getBusinessTimezone(context: ReturnType<typeof createDatabaseContext>) {
  const configured = await getSystemConfigValue(context, "system.business_timezone");
  return configured && isValidBusinessTimezone(configured) ? configured : defaultBusinessTimezone;
}

async function getCurrentBusinessDay(context: ReturnType<typeof createDatabaseContext>, now: Date) {
  return getBusinessDateRange("today", now, await getBusinessTimezone(context));
}

function parseActivityPreset(value: string | null): ActivityPeriodPreset {
  return value === "week" || value === "month" || value === "custom" ? value : "today";
}

function parseSalesDueFilter(value: string | null) {
  return value === "overdue" || value === "today" || value === "upcoming" ? value : undefined;
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
