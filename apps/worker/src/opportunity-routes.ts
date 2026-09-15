import type { AuthenticatedActor } from "@nico-ai-crm/auth";
import {
  getActiveUser,
  getSalesOpportunity,
  getSalesRoute,
  getSystemConfigByPrefix,
  listOpportunityFacts,
  listSalesOpportunities,
  listSalesRoutes,
  OpportunityWriteError,
  replaceRoutePlan,
  saveGeneratedOpportunity,
  saveGeneratedRoute,
  scheduleRouteStopVisit,
  transitionSalesOpportunity,
  transitionSalesRoute,
  type DatabaseContext,
  type OpportunityItem,
  type SalesRouteDetail
} from "@nico-ai-crm/db";
import {
  defaultOpportunityEngineConfig,
  generateOpportunities,
  type OpportunityEngineConfig
} from "@nico-ai-crm/opportunity-engine";
import {
  defaultRoutePlannerConfig,
  findOpportunisticStops,
  planApproximateRoute,
  reorderRoute,
  type GeoPoint,
  type PlannedRoute,
  type RouteOpportunity,
  type RoutePlannerConfig
} from "@nico-ai-crm/route-planner";
import {
  isOpportunityStatus,
  isOpportunityType,
  isSalesRouteStatus,
  type ApiErrorResponse
} from "@nico-ai-crm/shared";

const headers = { "content-type": "application/json; charset=utf-8" };
const defaultOrigin = { latitude: 48.1486, longitude: 17.1077 };

export async function handleOpportunityRoute(
  request: Request,
  context: DatabaseContext,
  actor: AuthenticatedActor,
  url: URL,
  appEnv?: string
): Promise<Response | null> {
  if (url.pathname === "/api/sales/opportunities" && request.method === "GET") {
    const status = url.searchParams.get("status");
    const opportunityType = url.searchParams.get("type");
    if (status && !isOpportunityStatus(status)) return badRequest("Neplatný stav príležitosti.");
    if (opportunityType && !isOpportunityType(opportunityType))
      return badRequest("Neplatný typ príležitosti.");
    const page = await listSalesOpportunities(context, {
      page: positiveInteger(url.searchParams.get("page")),
      pageSize: positiveInteger(url.searchParams.get("pageSize")),
      salesRepId: scopedSalesRep(actor, url.searchParams.get("salesRepId")),
      opportunityType:
        opportunityType && isOpportunityType(opportunityType) ? opportunityType : undefined,
      status: status && isOpportunityStatus(status) ? status : undefined,
      customerId: url.searchParams.get("customerId") ?? undefined,
      minimumScore: finiteNumber(url.searchParams.get("minimumScore")),
      maximumScore: finiteNumber(url.searchParams.get("maximumScore")),
      hasCoordinates: booleanParam(url.searchParams.get("hasCoordinates"))
    });
    return json({ ok: true, data: page.items, pagination: page.pagination });
  }

  if (url.pathname === "/api/sales/opportunities/generate" && request.method === "POST") {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const salesRepId = actor.role === "sales_rep" ? actor.id : stringValue(body.salesRepId);
    if (!salesRepId) return badRequest("Vyberte obchodného zástupcu.");
    const repError = await validateSalesRep(context, salesRepId);
    if (repError) return repError;
    try {
      const now = new Date();
      const settings = await salesSettings(context);
      const facts = await listOpportunityFacts(context, salesRepId, now.toISOString());
      const candidates = generateOpportunities(facts, opportunityConfig(settings));
      const expiresAt = new Date(
        now.getTime() + settingNumber(settings, "sales.opportunity_expiry_days", 14) * 86_400_000
      ).toISOString();
      const results = [];
      for (const candidate of candidates) {
        results.push(
          await saveGeneratedOpportunity(context, {
            id: crypto.randomUUID(),
            ...candidate,
            reasonCodes: candidate.reasons,
            generatedAt: now.toISOString(),
            expiresAt
          })
        );
      }
      return json(
        {
          ok: true,
          data: {
            items: results.map((result) => result.opportunity),
            created: results.filter((result) => !result.duplicate).length,
            refreshed: results.filter((result) => result.duplicate).length
          }
        },
        { status: 201 }
      );
    } catch (error) {
      return writeError(error);
    }
  }

  const opportunityMatch = url.pathname.match(/^\/api\/sales\/opportunities\/([^/]+)$/);
  if (opportunityMatch && request.method === "GET") {
    const opportunity = await getSalesOpportunity(
      context,
      decodeURIComponent(opportunityMatch[1]!)
    );
    if (!opportunity) return notFound("Príležitosť sa nenašla.");
    const scopeError = validateItemScope(actor, opportunity.salesRep.id);
    return scopeError ?? json({ ok: true, data: opportunity });
  }

  const opportunityAction = url.pathname.match(
    /^\/api\/sales\/opportunities\/([^/]+)\/(accept|dismiss)$/
  );
  if (opportunityAction && request.method === "POST") {
    try {
      const id = decodeURIComponent(opportunityAction[1]!);
      const existing = await getSalesOpportunity(context, id);
      if (!existing) return notFound("Príležitosť sa nenašla.");
      const scopeError = validateItemScope(actor, existing.salesRep.id);
      if (scopeError) return scopeError;
      return json({
        ok: true,
        data: await transitionSalesOpportunity(
          context,
          id,
          opportunityAction[2] === "accept" ? "ACCEPTED" : "DISMISSED",
          new Date().toISOString()
        )
      });
    } catch (error) {
      return writeError(error);
    }
  }

  if (url.pathname === "/api/sales/routes" && request.method === "GET") {
    const status = url.searchParams.get("status");
    if (status && !isSalesRouteStatus(status)) return badRequest("Neplatný stav trasy.");
    const page = await listSalesRoutes(context, {
      page: positiveInteger(url.searchParams.get("page")),
      pageSize: positiveInteger(url.searchParams.get("pageSize")),
      salesRepId: scopedSalesRep(actor, url.searchParams.get("salesRepId")),
      routeDate: url.searchParams.get("routeDate") ?? undefined,
      status: status && isSalesRouteStatus(status) ? status : undefined
    });
    return json({ ok: true, data: page.items, pagination: page.pagination });
  }

  if (url.pathname === "/api/sales/routes/generate" && request.method === "POST") {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const salesRepId = actor.role === "sales_rep" ? actor.id : stringValue(body.salesRepId);
    const routeDate = stringValue(body.routeDate);
    if (!salesRepId || !routeDate || !/^\d{4}-\d{2}-\d{2}$/.test(routeDate))
      return badRequest("Vyberte obchodníka a platný dátum trasy.");
    const repError = await validateSalesRep(context, salesRepId);
    if (repError) return repError;
    try {
      const settings = await salesSettings(context);
      const endpoints = routeEndpoints(settings, appEnv);
      if (endpoints instanceof Response) return endpoints;
      const opportunities = await listSalesOpportunities(context, {
        salesRepId,
        status: "OPEN",
        hasCoordinates: true,
        pageSize: 100
      });
      const plan = makeRoutePlan(opportunities.items, routeDate, settings, endpoints);
      const result = await saveGeneratedRoute(
        context,
        routeCommand(plan, {
          id: crypto.randomUUID(),
          salesRepId,
          routeDate,
          actorId: actor.id,
          settings,
          endpoints
        })
      );
      return json({ ok: true, data: result }, { status: result.replaced ? 200 : 201 });
    } catch (error) {
      return writeError(error);
    }
  }

  const routeMatch = url.pathname.match(/^\/api\/sales\/routes\/([^/]+)$/);
  if (routeMatch && request.method === "GET") {
    const route = await getSalesRoute(context, decodeURIComponent(routeMatch[1]!));
    if (!route) return notFound("Trasa sa nenašla.");
    const scopeError = validateItemScope(actor, route.salesRep.id);
    if (scopeError) return scopeError;
    const settings = await salesSettings(context);
    const candidates = await listSalesOpportunities(context, {
      salesRepId: route.salesRep.id,
      status: "OPEN",
      hasCoordinates: true,
      pageSize: 100
    });
    const planned = {
      stops: route.stops.map((stop) => ({
        ...toRouteOpportunitiesFromStop(stop),
        sequence: stop.sequence,
        plannedArrival: stop.plannedArrival,
        plannedDurationMinutes: stop.plannedDurationMinutes,
        distanceFromPreviousKm: stop.distanceFromPreviousKm,
        travelTimeFromPreviousMinutes: stop.travelTimeFromPreviousMinutes,
        routeUtility: stop.routeUtility
      })),
      plannedDistanceKm: route.plannedDistanceKm,
      plannedTravelMinutes: route.plannedTravelMinutes,
      plannedVisitMinutes: route.plannedVisitMinutes,
      plannedDurationMinutes: route.plannedDurationMinutes,
      estimatedValue: route.estimatedValue
    };
    const suggestions = findOpportunisticStops(
      planned,
      toRouteOpportunities(candidates.items),
      point(route.startLatitude, route.startLongitude),
      point(route.endLatitude, route.endLongitude),
      settingNumber(settings, "sales.route_average_speed_kmh", 50),
      settingNumber(settings, "sales.route_distance_penalty_per_km", 0.15)
    ).map((suggestion) => ({
      ...suggestion,
      opportunity: candidates.items.find((item) => item.id === suggestion.opportunityId)!
    }));
    return json({ ok: true, data: { ...route, nearbyOpportunities: suggestions } });
  }
  if (routeMatch && request.method === "PATCH") {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    if (
      !Array.isArray(body.opportunityIds) ||
      !body.opportunityIds.every((id) => typeof id === "string")
    )
      return badRequest("Zoznam príležitostí trasy je neplatný.");
    try {
      const route = await getSalesRoute(context, decodeURIComponent(routeMatch[1]!));
      if (!route) return notFound("Trasa sa nenašla.");
      const scopeError = validateItemScope(actor, route.salesRep.id);
      if (scopeError) return scopeError;
      const opportunities = await loadRouteOpportunities(
        context,
        body.opportunityIds,
        route.salesRep.id
      );
      if (opportunities instanceof Response) return opportunities;
      const settings = await salesSettings(context);
      const endpoints = {
        start: point(route.startLatitude, route.startLongitude),
        end: point(route.endLatitude, route.endLongitude)
      };
      const plan = reorderRoute(
        toRouteOpportunities(opportunities),
        body.opportunityIds,
        plannerInput(route.routeDate, settings, endpoints)
      );
      return json({
        ok: true,
        data: await replaceRoutePlan(context, route.id, routePlanUpdate(plan, endpoints))
      });
    } catch (error) {
      return writeError(error);
    }
  }

  const routeAction = url.pathname.match(
    /^\/api\/sales\/routes\/([^/]+)\/(accept|start|complete|cancel|recalculate)$/
  );
  if (routeAction && request.method === "POST") {
    try {
      const route = await getSalesRoute(context, decodeURIComponent(routeAction[1]!));
      if (!route) return notFound("Trasa sa nenašla.");
      const scopeError = validateItemScope(actor, route.salesRep.id);
      if (scopeError) return scopeError;
      if (routeAction[2] === "recalculate") {
        const settings = await salesSettings(context);
        const endpoints = {
          start: point(route.startLatitude, route.startLongitude),
          end: point(route.endLatitude, route.endLongitude)
        };
        const items = await loadRouteOpportunities(
          context,
          route.stops.map((stop) => stop.opportunityId),
          route.salesRep.id
        );
        if (items instanceof Response) return items;
        const plan = makeRoutePlan(items, route.routeDate, settings, endpoints);
        return json({
          ok: true,
          data: await replaceRoutePlan(context, route.id, routePlanUpdate(plan, endpoints))
        });
      }
      const status = {
        accept: "ACCEPTED",
        start: "IN_PROGRESS",
        complete: "COMPLETED",
        cancel: "CANCELLED"
      } as const;
      return json({
        ok: true,
        data: await transitionSalesRoute(
          context,
          route.id,
          status[routeAction[2] as keyof typeof status],
          new Date().toISOString()
        )
      });
    } catch (error) {
      return writeError(error);
    }
  }

  const stopVisitMatch = url.pathname.match(
    /^\/api\/sales\/routes\/([^/]+)\/stops\/([^/]+)\/visits$/
  );
  if (stopVisitMatch && request.method === "POST") {
    try {
      const route = await getSalesRoute(context, decodeURIComponent(stopVisitMatch[1]!));
      if (!route) return notFound("Trasa sa nenašla.");
      const scopeError = validateItemScope(actor, route.salesRep.id);
      if (scopeError) return scopeError;
      return json(
        {
          ok: true,
          data: await scheduleRouteStopVisit(
            context,
            route.id,
            decodeURIComponent(stopVisitMatch[2]!),
            crypto.randomUUID(),
            new Date().toISOString()
          )
        },
        { status: 201 }
      );
    } catch (error) {
      return writeError(error);
    }
  }
  return null;
}

async function loadRouteOpportunities(context: DatabaseContext, ids: string[], salesRepId: string) {
  const items: OpportunityItem[] = [];
  for (const id of ids) {
    const item = await getSalesOpportunity(context, id);
    if (
      !item ||
      item.salesRep.id !== salesRepId ||
      !item.hasCoordinates ||
      !["OPEN", "ACCEPTED"].includes(item.status)
    )
      return badRequest("Trasa obsahuje nedostupnú alebo neúplnú príležitosť.");
    items.push(item);
  }
  return items;
}

function makeRoutePlan(
  items: OpportunityItem[],
  routeDate: string,
  settings: Record<string, string>,
  endpoints: { start: GeoPoint; end: GeoPoint }
) {
  return planApproximateRoute({
    opportunities: toRouteOpportunities(items),
    ...plannerInput(routeDate, settings, endpoints)
  });
}
function plannerInput(
  routeDate: string,
  settings: Record<string, string>,
  endpoints: { start: GeoPoint; end: GeoPoint }
) {
  return { ...endpoints, startAt: `${routeDate}T08:00:00.000Z`, config: plannerConfig(settings) };
}
function toRouteOpportunities(items: OpportunityItem[]): RouteOpportunity[] {
  return items
    .filter((item) => item.latitude !== null && item.longitude !== null)
    .map((item) => ({
      opportunityId: item.id,
      customerId: item.customerId,
      locationId: item.locationId,
      latitude: item.latitude!,
      longitude: item.longitude!,
      score: item.score,
      estimatedValue: item.estimatedValue
    }));
}

function toRouteOpportunitiesFromStop(stop: SalesRouteDetail["stops"][number]): RouteOpportunity {
  return {
    opportunityId: stop.opportunityId,
    customerId: stop.customerId,
    locationId: stop.locationId,
    latitude: stop.latitude,
    longitude: stop.longitude,
    score: stop.opportunityScore,
    estimatedValue: stop.estimatedValue
  };
}
function routeCommand(
  plan: PlannedRoute,
  input: {
    id: string;
    salesRepId: string;
    routeDate: string;
    actorId: string;
    settings: Record<string, string>;
    endpoints: { start: GeoPoint; end: GeoPoint };
  }
) {
  return {
    id: input.id,
    salesRepId: input.salesRepId,
    routeDate: input.routeDate,
    provider: "APPROXIMATE",
    createdByUserId: input.actorId,
    ...routePlanUpdate(plan, input.endpoints)
  };
}
function routePlanUpdate(plan: PlannedRoute, endpoints: { start: GeoPoint; end: GeoPoint }) {
  return {
    startLatitude: endpoints.start.latitude,
    startLongitude: endpoints.start.longitude,
    endLatitude: endpoints.end.latitude,
    endLongitude: endpoints.end.longitude,
    plannedDistanceKm: plan.plannedDistanceKm,
    plannedTravelMinutes: plan.plannedTravelMinutes,
    plannedVisitMinutes: plan.plannedVisitMinutes,
    plannedDurationMinutes: plan.plannedDurationMinutes,
    estimatedValue: plan.estimatedValue,
    now: new Date().toISOString(),
    stops: plan.stops.map((stop) => ({
      id: crypto.randomUUID(),
      opportunityId: stop.opportunityId,
      customerId: stop.customerId,
      locationId: stop.locationId,
      sequence: stop.sequence,
      plannedArrival: stop.plannedArrival,
      plannedDurationMinutes: stop.plannedDurationMinutes,
      distanceFromPreviousKm: stop.distanceFromPreviousKm,
      travelTimeFromPreviousMinutes: stop.travelTimeFromPreviousMinutes,
      routeUtility: stop.routeUtility
    }))
  };
}

async function salesSettings(context: DatabaseContext) {
  const [sales, customerService] = await Promise.all([
    getSystemConfigByPrefix(context, "sales."),
    getSystemConfigByPrefix(context, "customer_service.")
  ]);
  return Object.fromEntries([...sales, ...customerService].map((item) => [item.key, item.value]));
}
function opportunityConfig(settings: Record<string, string>): OpportunityEngineConfig {
  return {
    ...defaultOpportunityEngineConfig,
    weights: {
      commercialPotential: settingNumber(settings, "sales.opportunity_weight_commercial", 25),
      reorderLikelihood: settingNumber(settings, "sales.opportunity_weight_reorder", 20),
      reactivation: settingNumber(settings, "sales.opportunity_weight_reactivation", 15),
      turnoverDecline: settingNumber(settings, "sales.opportunity_weight_decline", 10),
      crossSell: settingNumber(settings, "sales.opportunity_weight_cross_sell", 10),
      visitOverdue: settingNumber(settings, "sales.opportunity_weight_visit_overdue", 10),
      taskCampaignUrgency: settingNumber(settings, "sales.opportunity_weight_task_campaign", 10),
      strategicPriority: settingNumber(settings, "sales.opportunity_weight_strategic", 0)
    },
    reactivationDays: settingNumber(settings, "customer_service.reactivation_days", 90),
    reorderGraceDays: settingNumber(settings, "customer_service.reorder_grace_days", 7),
    visitOverdueDays: settingNumber(settings, "sales.opportunity_visit_overdue_days", 60),
    highCommercialValue: settingNumber(settings, "sales.opportunity_high_commercial_value", 2000)
  };
}
function plannerConfig(settings: Record<string, string>): RoutePlannerConfig {
  const daily = settingNumber(settings, "sales.daily_visit_target", 7);
  return {
    ...defaultRoutePlannerConfig,
    dailyVisitTarget: daily,
    maxStops: daily,
    visitDurationMinutes: settingNumber(settings, "sales.default_visit_duration_minutes", 45),
    workdayMinutes: settingNumber(settings, "sales.workday_minutes", 480),
    averageSpeedKmh: settingNumber(settings, "sales.route_average_speed_kmh", 50),
    distancePenaltyPerKm: settingNumber(settings, "sales.route_distance_penalty_per_km", 0.15)
  };
}
function routeEndpoints(
  settings: Record<string, string>,
  appEnv?: string
): { start: GeoPoint; end: GeoPoint } | Response {
  const raw = [
    settings["sales.route_default_start_latitude"],
    settings["sales.route_default_start_longitude"],
    settings["sales.route_default_end_latitude"],
    settings["sales.route_default_end_longitude"]
  ];
  const values = raw.map(Number);
  if (
    raw.every((value) => value !== undefined && value.trim() !== "") &&
    values.every(Number.isFinite)
  )
    return { start: point(values[0]!, values[1]!), end: point(values[2]!, values[3]!) };
  if (appEnv === "production")
    return error(
      503,
      "ROUTE_ORIGIN_REQUIRED",
      "Pred plánovaním trasy nastavte východiskový a cieľový bod."
    );
  return { start: defaultOrigin, end: defaultOrigin };
}
function point(latitude: number, longitude: number): GeoPoint {
  return { latitude, longitude };
}
function settingNumber(settings: Record<string, string>, key: string, fallback: number) {
  const value = Number(settings[key]);
  return Number.isFinite(value) ? value : fallback;
}
function scopedSalesRep(actor: AuthenticatedActor, requested: string | null) {
  return actor.role === "sales_rep" ? actor.id : (requested ?? undefined);
}
function validateItemScope(actor: AuthenticatedActor, salesRepId: string) {
  return actor.role === "sales_rep" && actor.id !== salesRepId
    ? error(403, "FORBIDDEN", "K tejto položke nemáte prístup.")
    : null;
}
async function validateSalesRep(context: DatabaseContext, id: string) {
  const user = await getActiveUser(context, id);
  return !user || user.role !== "sales_rep"
    ? badRequest("Obchodný zástupca nie je aktívny.")
    : null;
}
function positiveInteger(value: string | null) {
  const number = Number(value);
  return value && Number.isInteger(number) && number > 0 ? number : undefined;
}
function finiteNumber(value: string | null) {
  const number = Number(value);
  return value !== null && Number.isFinite(number) ? number : undefined;
}
function booleanParam(value: string | null) {
  return value === "true" ? true : value === "false" ? false : undefined;
}
function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : badRequest("Telo požiadavky musí byť objekt.");
  } catch {
    return badRequest("Telo požiadavky musí byť platný JSON.");
  }
}
function writeError(value: unknown) {
  if (value instanceof OpportunityWriteError)
    return error(value.code.includes("NOT_FOUND") ? 404 : 409, value.code, value.message);
  throw value;
}
function json<T>(body: T, init?: ResponseInit) {
  return new Response(JSON.stringify(body), { ...init, headers: { ...headers, ...init?.headers } });
}
function error(status: number, code: string, message: string) {
  return json<ApiErrorResponse>({ ok: false, error: { code, message } }, { status });
}
function badRequest(message: string) {
  return error(400, "VALIDATION_ERROR", message);
}
function notFound(message: string) {
  return error(404, "NOT_FOUND", message);
}
