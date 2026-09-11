import {
  MockAIProvider,
  OpenAIProvider,
  customerCommercialAssistantPromptVersion,
  validateCustomerAssistantOutput,
  type AIProvider,
  type AssistantPurpose,
  type CustomerAssistantContext
} from "@nico-ai-crm/ai-assistant";
import type { AuthenticatedActor, Permission } from "@nico-ai-crm/auth";
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
  getCachedAssistantRun,
  getCustomerAssistantSupplement,
  isCustomerAssignedToUser,
  listAuthUsers,
  getManagementKpiData,
  recordAssistantRun,
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
  type KpiDefinitionRecord,
  type KpiTargetRecord,
  type ManagementKpiData,
  type PerformanceRole,
  type PaginationInput,
  type SortDirection
} from "@nico-ai-crm/db";
import {
  calculateKpiResult,
  calculatePeriodProgressPercent,
  calculateWeightedSummary,
  prorateTarget,
  type KpiResult
} from "@nico-ai-crm/kpi-engine";
import {
  getBusinessDate,
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
import {
  AuthRequestError,
  authenticateActor,
  requirePermission,
  requireSameOriginForMockCookie
} from "./auth";
import { authErrorResponse, handlePublicAuthRoute, safeActorResponse } from "./auth-routes";
import { getSettingsData, validateAndUpdateSettings } from "./settings";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV?: string;
  AUTH_MODE?: string;
  AUTH_ISSUER?: string;
  AUTH_AUDIENCE?: string;
  AUTH_JWKS_URL?: string;
  AUTH_LOGIN_URL?: string;
  AUTH_LOGOUT_URL?: string;
  OPENAI_API_KEY?: string;
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

function getRequiredPermission(request: Request, pathname: string): Permission | null {
  if (request.method === "POST" && /^\/api\/customers\/[^/]+\/interactions$/.test(pathname)) {
    return "CUSTOMER_INTERACTIONS_WRITE";
  }
  if (request.method === "POST" && pathname.startsWith("/api/sales/")) {
    return "SALES_VISIT_WRITE";
  }
  if (request.method === "POST" && pathname === "/api/ai/customer-assistant") {
    return "AI_ASSISTANT_USE";
  }
  if (request.method === "PATCH" && pathname === "/api/settings") return "SETTINGS_WRITE";
  if (request.method !== "GET") return null;
  if (pathname === "/api/settings") return "SETTINGS_READ";
  if (pathname === "/api/customer-service/queue") return "CUSTOMER_SERVICE_QUEUE_READ";
  if (pathname.startsWith("/api/sales/")) return "SALES_QUEUE_READ";
  if (pathname === "/api/dashboard") return "DASHBOARD_READ";
  if (pathname === "/api/reports/activity") return "REPORTS_READ";
  if (pathname === "/api/kpi" || pathname.startsWith("/api/kpi/")) return "KPI_READ";
  if (pathname === "/api/tasks") return "TASKS_READ";
  if (pathname === "/api/users") return "USER_REFERENCES_READ";
  if (pathname === "/api/admin/users") return "USER_ADMIN";
  if (
    pathname === "/api/customers" ||
    pathname.startsWith("/api/customers/") ||
    pathname === "/api/segments"
  ) {
    return "CUSTOMERS_READ";
  }
  return null;
}

async function requireCustomerScope(
  context: ReturnType<typeof createDatabaseContext>,
  actor: AuthenticatedActor,
  customerId: string
) {
  if (actor.role !== "sales_rep") return;
  if (!(await isCustomerAssignedToUser(context, customerId, actor.id))) {
    throw new AuthRequestError(403, "FORBIDDEN", "You do not have access to this customer.");
  }
}

async function getDefaultCustomerServiceUserId(
  context: ReturnType<typeof createDatabaseContext>
): Promise<string> {
  const users = await listActiveUsersByRole(context, "customer_service");
  if (!users[0]) throw new Error("No active Customer Service user is available for handoff.");
  return users[0].id;
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

  const publicAuthResponse = await handlePublicAuthRoute(request, env, context, url);
  if (publicAuthResponse) return publicAuthResponse;

  let actor: AuthenticatedActor;
  try {
    actor = await authenticateActor(request, env, context);
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return safeActorResponse(actor);
    }
    const permission = getRequiredPermission(request, url.pathname);
    if (permission) requirePermission(actor, permission);
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      requireSameOriginForMockCookie(request);
    }
  } catch (error) {
    if (error instanceof AuthRequestError) return authErrorResponse(error);
    throw error;
  }

  if (url.pathname === "/api/ai/customer-assistant" && request.method === "POST") {
    return handleCustomerAssistant(request, env, context, actor);
  }

  if (url.pathname === "/api/settings" && request.method === "PATCH") {
    const body = await readJsonBody(request);
    if (body instanceof Response) return body;
    const result = await validateAndUpdateSettings(context, body, new Date().toISOString());
    if (result.issues.length) return validationError(result.issues, 400);
    return ok(await getSettingsData(context, Boolean(env.OPENAI_API_KEY)));
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
        actorUserId: actor.id,
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
        actorUserId: actor.id,
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
        actor.id,
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
        actorUserId: actor.id,
        completedAt: now.toISOString(),
        customerServiceUserId: await getDefaultCustomerServiceUserId(context),
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
    const query = parseCustomerListQuery(url);
    const result = await listCustomers(context, {
      ...query,
      assignedSalesRepId: actor.role === "sales_rep" ? actor.id : query.assignedSalesRepId
    });
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
    const users = await listActiveUsersByRole(context, role);
    return ok(actor.role === "sales_rep" ? users.filter((user) => user.id === actor.id) : users);
  }

  if (url.pathname === "/api/admin/users") {
    return ok(
      (await listAuthUsers(context)).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        authProvider: user.authProvider,
        identityMapped: Boolean(user.authProvider && user.authSubject)
      }))
    );
  }

  if (url.pathname === "/api/settings") {
    return ok(await getSettingsData(context, Boolean(env.OPENAI_API_KEY)));
  }

  if (url.pathname === "/api/sales/tasks") {
    const now = new Date();
    const businessRange = await getCurrentBusinessDay(context, now);
    const result = await listSalesTasks(context, {
      ...parsePagination(url),
      assignedUserId:
        actor.role === "sales_rep"
          ? actor.id
          : (url.searchParams.get("assignedUserId") ?? undefined),
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
    if (actor.role === "sales_rep" && task.assignedUser.id !== actor.id) {
      return errorResponse(403, "FORBIDDEN", "You do not have access to this Sales task.");
    }
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

  if (url.pathname === "/api/dashboard" || url.pathname === "/api/kpi") {
    return handleManagementRequest(context, url, url.pathname === "/api/dashboard");
  }

  const userKpiRoute = url.pathname.match(/^\/api\/kpi\/users\/([^/]+)$/);
  if (userKpiRoute) {
    url.searchParams.set("userId", decodeURIComponent(userKpiRoute[1]));
    return handleManagementRequest(context, url, false, true);
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
    try {
      await requireCustomerScope(context, actor, customerId);
    } catch (error) {
      if (error instanceof AuthRequestError) return authErrorResponse(error);
      throw error;
    }

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

async function handleCustomerAssistant(
  request: Request,
  env: Env,
  context: ReturnType<typeof createDatabaseContext>,
  actor: AuthenticatedActor
): Promise<Response> {
  const body = await readJsonBody(request);
  if (body instanceof Response) return body;
  if (
    !body ||
    typeof body !== "object" ||
    !("customerId" in body) ||
    typeof body.customerId !== "string" ||
    !body.customerId.trim()
  ) {
    return validationError([{ field: "customerId", message: "Customer ID is required." }], 400);
  }
  const purposeValue = "purpose" in body ? body.purpose : "CALL_PREPARATION";
  if (
    purposeValue !== "CALL_PREPARATION" &&
    purposeValue !== "CUSTOMER_OVERVIEW" &&
    purposeValue !== "SALES_VISIT_PREPARATION"
  ) {
    return validationError([{ field: "purpose", message: "Assistant purpose is invalid." }], 400);
  }
  const customerId = body.customerId.trim();
  try {
    await requireCustomerScope(context, actor, customerId);
  } catch (error) {
    if (error instanceof AuthRequestError) return authErrorResponse(error);
    throw error;
  }
  const purpose = purposeValue as AssistantPurpose;
  const now = new Date();
  const [overview, supplement, configRows, aiRows] = await Promise.all([
    getCustomerOverview(context, customerId),
    getCustomerAssistantSupplement(context, customerId, now.toISOString()),
    getSystemConfigByPrefix(context, "customer_service."),
    getSystemConfigByPrefix(context, "ai.")
  ]);
  if (!overview) return notFound("Customer not found.");
  const rules = applyCustomerServiceConfigRows(defaultCustomerServiceRulesConfig, configRows);
  const priority = evaluateCustomerServicePriority(
    {
      active: overview.customer.active,
      averageReorderDays: overview.metrics?.averageReorderDays ?? null,
      b2bStatus: overview.customer.b2bStatus,
      campaignClickedWithoutConversion:
        supplement.campaign?.clicked === true && supplement.campaign.converted === false,
      customerId,
      daysSinceLastOrder: overview.metrics?.daysSinceLastOrder ?? null,
      lastInteractionAt: overview.latestInteractions[0]?.createdAt ?? null,
      openTaskCount: overview.openTasks.length,
      overdueTaskCount: supplement.overdueTaskIds.length,
      previousTurnover90d: overview.metrics?.previousTurnover90d ?? 0,
      segmentCodes: overview.segments.map((segment) => segment.code),
      turnover90d: overview.metrics?.turnover90d ?? 0
    },
    rules,
    now
  );
  const deterministic = { priority, commercial: overview.metrics, segments: overview.segments };
  const config = parseAIConfig(aiRows);
  if (!config.enabled)
    return ok({
      status: "DISABLED",
      assistance: null,
      deterministic,
      message: "AI assistance is disabled. Deterministic CRM guidance remains available."
    });
  if (config.provider === "OPENAI" && !env.OPENAI_API_KEY) {
    return ok({
      status: "UNAVAILABLE",
      assistance: null,
      deterministic,
      message: "OpenAI is selected but its environment secret is not configured."
    });
  }
  const assistantContext = buildAssistantContext(overview, supplement, priority, purpose);
  const fingerprint = await fingerprintContext({
    context: assistantContext,
    provider: config.provider,
    model: config.model,
    promptVersion: customerCommercialAssistantPromptVersion
  });
  const cached = await getCachedAssistantRun(
    context,
    customerId,
    purpose,
    fingerprint,
    now.toISOString()
  );
  if (cached) {
    try {
      return ok({
        status: "READY",
        assistance: validateCustomerAssistantOutput(JSON.parse(cached.responseJson)),
        deterministic,
        meta: {
          cached: true,
          provider: cached.provider,
          model: cached.model,
          promptVersion: customerCommercialAssistantPromptVersion,
          createdAt: cached.createdAt
        }
      });
    } catch {
      // Ignore invalid historical cache entries and regenerate safely.
    }
  }
  const provider: AIProvider =
    config.provider === "OPENAI"
      ? new OpenAIProvider(env.OPENAI_API_KEY as string)
      : new MockAIProvider();
  const started = Date.now();
  try {
    const result = await provider.generateCustomerAssistance(assistantContext, config);
    const createdAt = new Date().toISOString();
    await safeRecordAssistantRun(context, {
      id: crypto.randomUUID(),
      actorUserId: actor.id,
      customerId,
      purpose,
      provider: result.provider,
      model: result.model,
      promptVersion: customerCommercialAssistantPromptVersion,
      contextFingerprint: fingerprint,
      status: "success",
      responseJson: JSON.stringify(result.output),
      errorCode: null,
      latencyMs: Date.now() - started,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      createdAt,
      expiresAt: new Date(Date.now() + config.cacheTtlMinutes * 60_000).toISOString()
    });
    return ok({
      status: "READY",
      assistance: result.output,
      deterministic,
      meta: {
        cached: false,
        provider: result.provider,
        model: result.model,
        promptVersion: customerCommercialAssistantPromptVersion,
        createdAt
      }
    });
  } catch (error) {
    const code =
      error instanceof DOMException && error.name === "AbortError"
        ? "AI_TIMEOUT"
        : error instanceof Error && error.message.includes("invalid")
          ? "AI_INVALID_RESPONSE"
          : "AI_PROVIDER_ERROR";
    await safeRecordAssistantRun(context, {
      id: crypto.randomUUID(),
      actorUserId: actor.id,
      customerId,
      purpose,
      provider: config.provider,
      model: config.model,
      promptVersion: customerCommercialAssistantPromptVersion,
      contextFingerprint: fingerprint,
      status: "failure",
      responseJson: null,
      errorCode: code,
      latencyMs: Date.now() - started,
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString()
    });
    return ok({
      status: "UNAVAILABLE",
      assistance: null,
      deterministic,
      message:
        code === "AI_TIMEOUT"
          ? "AI assistance timed out. Deterministic CRM guidance remains available."
          : "AI assistance is temporarily unavailable. Deterministic CRM guidance remains available."
    });
  }
}

async function safeRecordAssistantRun(
  context: ReturnType<typeof createDatabaseContext>,
  input: Parameters<typeof recordAssistantRun>[1]
) {
  try {
    await recordAssistantRun(context, input);
  } catch (error) {
    console.error("AI audit metadata could not be stored.", error);
  }
}

function buildAssistantContext(
  overview: NonNullable<Awaited<ReturnType<typeof getCustomerOverview>>>,
  supplement: Awaited<ReturnType<typeof getCustomerAssistantSupplement>>,
  priority: ReturnType<typeof evaluateCustomerServicePriority>,
  purpose: AssistantPurpose
): CustomerAssistantContext {
  const metrics = overview.metrics;
  return {
    contextVersion: "customer-commercial-context-v1",
    purpose,
    customer: {
      customerId: overview.customer.id,
      companyName: overview.customer.companyName,
      city: overview.customer.city,
      assignedSalesRepName: overview.customer.assignedSalesRep?.name ?? null,
      b2bStatus: overview.customer.b2bStatus
    },
    commercial: {
      lastOrderDate: metrics?.lastOrderDate ?? null,
      daysSinceLastOrder: metrics?.daysSinceLastOrder ?? null,
      averageReorderDays: metrics?.averageReorderDays ?? null,
      turnover30d: metrics?.turnover30d ?? 0,
      turnover90d: metrics?.turnover90d ?? 0,
      previousTurnover90d: metrics?.previousTurnover90d ?? 0,
      turnover365d: metrics?.turnover365d ?? 0,
      salesTrend: overview.customer.salesTrend,
      averageOrderValue: metrics?.averageOrderValue ?? null,
      lifetimeTurnover: metrics?.lifetimeTurnover ?? 0,
      currency: overview.latestOrders[0]?.currency ?? "EUR"
    },
    priority: {
      score: priority.priorityScore,
      level: priority.priorityLevel,
      reasons: priority.reasons.map((reason) => ({
        code: reason.code,
        message: reason.message,
        value: reason.value
      })),
      deterministicActions: priority.recommendedActions
    },
    segments: overview.segments.map((segment) => ({ code: segment.code, reason: segment.reason })),
    recentInteractions: overview.latestInteractions.map((interaction) => ({
      type: interaction.interactionType,
      reason: interaction.reason,
      result: interaction.result,
      occurredAt: interaction.createdAt
    })),
    latestVisit: supplement.latestVisit,
    latestOrders: overview.latestOrders.map((order) => ({
      orderDate: order.orderDate,
      netAmount: order.netAmount,
      currency: order.currency,
      status: order.status
    })),
    openTasks: overview.openTasks.map((task) => ({
      title: task.title,
      priority: task.priority,
      dueAt: task.dueAt,
      overdue: supplement.overdueTaskIds.includes(task.id)
    })),
    campaign: supplement.campaign,
    purchasedProducts: supplement.purchasedProducts,
    purchasedCategories: supplement.purchasedCategories,
    crossSellSignals: overview.segments
      .filter((segment) => segment.code === "CROSS_SELL")
      .map((segment) => segment.reason ?? segment.code)
  };
}

function parseAIConfig(rows: Array<{ key: string; value: string }>) {
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    enabled: values["ai.enabled"] !== "false",
    provider: values["ai.provider"] === "OPENAI" ? ("OPENAI" as const) : ("MOCK" as const),
    model: values["ai.model"] || "mock-commercial-v1",
    maxOutputTokens: Math.max(100, Math.min(4000, Number(values["ai.max_output_tokens"]) || 700)),
    timeoutMs: Math.max(1000, Math.min(60000, Number(values["ai.timeout_ms"]) || 15000)),
    cacheTtlMinutes: Math.max(1, Math.min(1440, Number(values["ai.cache_ttl_minutes"]) || 15))
  };
}

async function fingerprintContext(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value))
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

async function handleManagementRequest(
  context: ReturnType<typeof createDatabaseContext>,
  url: URL,
  includeDashboard: boolean,
  requireUser = false
): Promise<Response> {
  const role = parsePerformanceRole(url.searchParams.get("role"));
  if (role instanceof Response) return role;
  const preset = parseKpiPeriod(url.searchParams.get("period"));
  if (preset instanceof Response) return preset;
  const now = new Date();
  const timezone = await getBusinessTimezone(context);
  let range;
  try {
    range = getManagementDateRange(preset, now, timezone, url);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid KPI period.");
  }
  const [attributionDaysValue, reactivationDaysValue] = await Promise.all([
    getSystemConfigValue(context, "kpi.attribution_window_days"),
    getSystemConfigValue(context, "kpi.reactivation_inactivity_days")
  ]);
  const attributionWindowDays = positiveConfig(attributionDaysValue, 30);
  const reactivationInactivityDays = positiveConfig(reactivationDaysValue, 90);
  const data = await getManagementKpiData(context, {
    range,
    businessDate: getBusinessDate(now, timezone),
    nowUtc: now.toISOString(),
    role,
    userId: url.searchParams.get("userId") ?? undefined,
    attributionWindowDays,
    reactivationInactivityDays
  });
  if (requireUser && data.users.length === 0) return notFound("KPI user not found.");
  const result = buildManagementResult(data, range, getBusinessDate(now, timezone), {
    attributionWindowDays,
    reactivationInactivityDays
  });
  if (requireUser) return ok({ period: result.period, user: result.users[0] });
  return ok(
    includeDashboard ? result : { period: result.period, roles: result.roles, users: result.users }
  );
}

function buildManagementResult(
  data: ManagementKpiData,
  range: ReturnType<typeof getBusinessDateRange>,
  businessDate: string,
  config: { attributionWindowDays: number; reactivationInactivityDays: number }
) {
  const progress = calculatePeriodProgressPercent(range.fromDate, range.toDate, businessDate);
  const users = data.users.map((user) => {
    const definitions = data.definitions.filter((definition) => definition.role === user.role);
    const kpis = definitions.map((definition) =>
      makeKpiResult(definition, data.targets, user, range, progress)
    );
    return { ...user, kpis, overall: calculateWeightedSummary(kpis, progress) };
  });
  const roles = (["customer_service", "sales_rep"] as const)
    .map((role) => {
      const roleUsers = users.filter((user) => user.role === role);
      if (roleUsers.length === 0) return null;
      const kpis = data.definitions
        .filter((definition) => definition.role === role)
        .map((definition) => {
          const userResults = roleUsers
            .map((user) => user.kpis.find((kpi) => kpi.kpiCode === definition.code))
            .filter((kpi): kpi is KpiResult => Boolean(kpi));
          return calculateKpiResult({
            actual: userResults.reduce((sum, kpi) => sum + kpi.actual, 0),
            kpiCode: definition.code,
            metricType: definition.metricType,
            name: definition.name,
            periodEnd: range.toDate,
            periodProgressPercent: progress,
            periodStart: range.fromDate,
            source: userResults[0]?.source ?? definition.sourceKey,
            target: userResults.reduce((sum, kpi) => sum + kpi.target, 0),
            weight: userResults[0]?.weight ?? 0
          });
        });
      return { role, kpis, overall: calculateWeightedSummary(kpis, progress) };
    })
    .filter((role) => role !== null);
  const salesDefinition = data.definitions.find(
    (definition) => definition.code === "SALES_TURNOVER"
  );
  const companyTarget = data.companyTargets.find(
    (target) => target.kpiDefinitionId === salesDefinition?.id
  );
  const salesTarget = companyTarget
    ? prorateTarget(
        companyTarget.targetValue,
        companyTarget.periodStart,
        companyTarget.periodEnd,
        range.fromDate,
        range.toDate
      )
    : 0;
  return {
    period: { ...range, progressPercent: progress },
    dashboard: {
      ...data.dashboard,
      salesTarget,
      salesAchievementPercent:
        salesTarget > 0 ? Math.round((data.dashboard.turnover / salesTarget) * 10000) / 100 : 0,
      turnoverSource: "normalized_crm_orders" as const
    },
    roles,
    users,
    meta: {
      attributionWindowDays: config.attributionWindowDays,
      reactivationInactivityDays: config.reactivationInactivityDays,
      reactivationDefinition: "prior_order_inactivity_then_attributed_activity_then_order"
    }
  };
}

function makeKpiResult(
  definition: KpiDefinitionRecord,
  targets: KpiTargetRecord[],
  user: ManagementKpiData["users"][number],
  range: ReturnType<typeof getBusinessDateRange>,
  progress: number
): KpiResult {
  const target =
    targets.find(
      (candidate) => candidate.kpiDefinitionId === definition.id && candidate.userId === user.userId
    ) ??
    targets.find(
      (candidate) =>
        candidate.kpiDefinitionId === definition.id &&
        candidate.userId === null &&
        candidate.role === user.role
    );
  return calculateKpiResult({
    actual: actualFor(definition.sourceKey, user),
    kpiCode: definition.code,
    metricType: definition.metricType,
    name: definition.name,
    periodEnd: range.toDate,
    periodProgressPercent: progress,
    periodStart: range.fromDate,
    source: sourceDescription(definition.sourceKey),
    target: target
      ? prorateTarget(
          target.targetValue,
          target.periodStart,
          target.periodEnd,
          range.fromDate,
          range.toDate
        )
      : 0,
    weight: target?.weight ?? 0
  });
}

function actualFor(
  sourceKey: KpiDefinitionRecord["sourceKey"],
  user: ManagementKpiData["users"][number]
) {
  switch (sourceKey) {
    case "attributed_turnover":
      return user.attributedTurnover;
    case "calls_completed":
      return user.callsCompleted;
    case "visits_completed":
      return user.visitsCompleted;
    case "reactivations":
      return user.reactivations;
    case "b2b_activations":
      return user.b2bActivations;
  }
}

function sourceDescription(sourceKey: KpiDefinitionRecord["sourceKey"]): string {
  const sources = {
    attributed_turnover:
      "Completed normalized CRM orders attributed to the latest qualifying CRM activity",
    calls_completed: "customer_interactions where interaction_type = CALL",
    visits_completed: "sales_visits where status = completed",
    reactivations: "Attributed order after configured prior inactivity",
    b2b_activations: "Structured b2b_activations records"
  };
  return sources[sourceKey];
}

function parsePerformanceRole(value: string | null): PerformanceRole | undefined | Response {
  if (!value) return undefined;
  if (value === "customer_service" || value === "sales_rep") return value;
  return badRequest("Supported KPI roles are customer_service and sales_rep.");
}

function parseKpiPeriod(value: string | null): ActivityPeriodPreset | Response {
  if (!value) return "month";
  if (["day", "week", "month", "previous_month", "custom"].includes(value)) {
    return value as ActivityPeriodPreset;
  }
  return badRequest("Supported KPI periods are day, week, month, previous_month, and custom.");
}

function getManagementDateRange(
  preset: ActivityPeriodPreset,
  now: Date,
  timezone: string,
  url: URL
) {
  const base = getBusinessDateRange(
    preset,
    now,
    timezone,
    url.searchParams.get("from") ?? undefined,
    url.searchParams.get("to") ?? undefined
  );
  if (preset !== "month" && preset !== "week") return base;
  const start = new Date(`${base.fromDate}T00:00:00.000Z`);
  const end =
    preset === "week"
      ? new Date(start.getTime() + 6 * 86_400_000)
      : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return getBusinessDateRange(
    "custom",
    now,
    timezone,
    base.fromDate,
    end.toISOString().slice(0, 10)
  );
}

function positiveConfig(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
