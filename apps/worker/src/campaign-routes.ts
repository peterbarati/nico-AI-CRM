import {
  CampaignProviderUnavailableError,
  createCampaignProvider
} from "@nico-ai-crm/campaign-provider";
import type { AuthenticatedActor } from "@nico-ai-crm/auth";
import {
  CampaignWriteError,
  createCampaign,
  createCampaignFollowUpTasks,
  getActiveUser,
  getCampaignDeliveryMembers,
  getCampaignDetail,
  getSystemConfigValue,
  isCustomerAssignedToUser,
  listCampaigns,
  listCustomerCampaignHistory,
  listFollowUpCandidates,
  prepareCampaign,
  previewCampaignAudience,
  recordCampaignDelivery,
  transitionCampaign,
  updateCampaign,
  type DatabaseContext
} from "@nico-ai-crm/db";
import {
  isCampaignAudienceKind,
  isCampaignProviderCode,
  isCampaignStatus,
  isCampaignType,
  isTaskPriority,
  type ApiErrorResponse,
  type CampaignAudienceConfig,
  type CampaignAudienceKind,
  type CampaignType,
  type TaskPriority
} from "@nico-ai-crm/shared";

const headers = { "content-type": "application/json; charset=utf-8" };

export async function handleCampaignRoute(
  request: Request,
  context: DatabaseContext,
  actor: AuthenticatedActor,
  url: URL,
  appEnv?: string
): Promise<Response | null> {
  if (url.pathname === "/api/campaigns" && request.method === "GET") {
    const status = url.searchParams.get("status"),
      campaignType = url.searchParams.get("campaignType");
    if (status && !isCampaignStatus(status)) return invalid("status", "Invalid campaign status.");
    if (campaignType && !isCampaignType(campaignType))
      return invalid("campaignType", "Invalid campaign type.");
    const result = await listCampaigns(context, {
      page: positive(url.searchParams.get("page")),
      pageSize: positive(url.searchParams.get("pageSize")),
      search: url.searchParams.get("search") ?? undefined,
      status: status && isCampaignStatus(status) ? status : undefined,
      campaignType: campaignType && isCampaignType(campaignType) ? campaignType : undefined
    });
    return json({ ok: true, data: result.items, pagination: result.pagination });
  }
  if (url.pathname === "/api/campaigns/audience-preview" && request.method === "POST") {
    const body = await bodyOf(request);
    if (body instanceof Response) return body;
    const audience = parseAudience(body);
    if (audience instanceof Response) return audience;
    return json({
      ok: true,
      data: await previewCampaignAudience(context, audience.kind, audience.config)
    });
  }
  if (url.pathname === "/api/campaigns" && request.method === "POST") {
    const body = await bodyOf(request);
    if (body instanceof Response) return body;
    const defaults = await getCampaignDefaults(context);
    const parsed = parseCampaign(body, defaults);
    if (parsed instanceof Response) return parsed;
    const configured = (await getSystemConfigValue(context, "campaign.provider")) ?? "MOCK";
    if (!isCampaignProviderCode(configured))
      return error(500, "CAMPAIGN_PROVIDER_INVALID", "Campaign provider configuration is invalid.");
    try {
      return json(
        {
          ok: true,
          data: await createCampaign(context, {
            ...parsed,
            id: crypto.randomUUID(),
            actorUserId: actor.id,
            provider: configured,
            now: new Date().toISOString()
          })
        },
        { status: 201 }
      );
    } catch (reason) {
      return campaignError(reason);
    }
  }
  const customerHistory = url.pathname.match(/^\/api\/customers\/([^/]+)\/campaigns$/);
  if (customerHistory && request.method === "GET") {
    const customerId = decodeURIComponent(customerHistory[1]);
    if (
      actor.role === "sales_rep" &&
      !(await isCustomerAssignedToUser(context, customerId, actor.id))
    )
      return error(403, "FORBIDDEN", "You do not have access to this customer.");
    return json({
      ok: true,
      data: await listCustomerCampaignHistory(context, customerId)
    });
  }
  const detail = url.pathname.match(/^\/api\/campaigns\/([^/]+)$/);
  if (detail && request.method === "GET") {
    const value = await getCampaignDetail(context, decodeURIComponent(detail[1]));
    return value
      ? json({ ok: true, data: value })
      : error(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
  }
  if (detail && request.method === "PATCH") {
    const body = await bodyOf(request);
    if (body instanceof Response) return body;
    const parsed = parseCampaignUpdate(body);
    if (parsed instanceof Response) return parsed;
    try {
      return json({
        ok: true,
        data: await updateCampaign(
          context,
          decodeURIComponent(detail[1]),
          parsed,
          new Date().toISOString()
        )
      });
    } catch (reason) {
      return campaignError(reason);
    }
  }
  const action = url.pathname.match(/^\/api\/campaigns\/([^/]+)\/(prepare|start|complete|cancel)$/);
  if (action && request.method === "POST")
    try {
      const id = decodeURIComponent(action[1]),
        now = new Date().toISOString();
      if (action[2] === "prepare")
        return json({ ok: true, data: await prepareCampaign(context, id, now) });
      if (action[2] === "start") {
        const campaign = await getCampaignDetail(context, id);
        if (!campaign) return error(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
        if (campaign.status === "ACTIVE")
          return json({ ok: true, data: { campaign, duplicate: true } });
        if (campaign.status !== "READY")
          return error(409, "CAMPAIGN_STATE_INVALID", "Only a ready campaign can be started.");
        if (campaign.provider === "MOCK" && appEnv === "production")
          return error(
            503,
            "CAMPAIGN_PROVIDER_UNAVAILABLE",
            "Mock campaign execution is disabled in production."
          );
        const provider = createCampaignProvider(campaign.provider);
        const outcomes = await provider.send({
          campaignId: id,
          members: await getCampaignDeliveryMembers(context, id),
          occurredAt: now
        });
        return json({
          ok: true,
          data: await recordCampaignDelivery(context, id, provider.code, outcomes, now)
        });
      }
      return json({
        ok: true,
        data: await transitionCampaign(
          context,
          id,
          action[2] === "complete" ? "COMPLETED" : "CANCELLED",
          now
        )
      });
    } catch (reason) {
      return campaignError(reason);
    }
  const candidates = url.pathname.match(/^\/api\/campaigns\/([^/]+)\/follow-up-candidates$/);
  if (candidates && request.method === "GET")
    try {
      return json({
        ok: true,
        data: await listFollowUpCandidates(
          context,
          decodeURIComponent(candidates[1]),
          new Date().toISOString()
        )
      });
    } catch (reason) {
      return campaignError(reason);
    }
  const follow = url.pathname.match(/^\/api\/campaigns\/([^/]+)\/follow-up-tasks$/);
  if (follow && request.method === "POST") {
    if (!["admin", "manager", "customer_service"].includes(actor.role))
      return error(403, "FORBIDDEN", "Campaign follow-up tasks are not available for this role.");
    const body = await bodyOf(request);
    if (body instanceof Response) return body;
    const assignedUserId = typeof body.assignedUserId === "string" ? body.assignedUserId : "";
    const priority = isTaskPriority(body.priority) ? body.priority : ("normal" as TaskPriority);
    if (!assignedUserId) return invalid("assignedUserId", "Assigned user is required.");
    const user = await getActiveUser(context, assignedUserId);
    if (!user || user.role !== "customer_service")
      return invalid("assignedUserId", "An active Customer Service user is required.");
    if (actor.role === "customer_service" && actor.id !== assignedUserId)
      return error(403, "FORBIDDEN", "Customer Service can create campaign tasks only for itself.");
    const dueAt =
      typeof body.dueAt === "string" && Number.isFinite(new Date(body.dueAt).getTime())
        ? new Date(body.dueAt).toISOString()
        : null;
    try {
      return json({
        ok: true,
        data: await createCampaignFollowUpTasks(context, {
          campaignId: decodeURIComponent(follow[1]),
          actorUserId: actor.id,
          assignedUserId,
          dueAt,
          priority,
          now: new Date().toISOString()
        })
      });
    } catch (reason) {
      return campaignError(reason);
    }
  }
  if (url.pathname === "/api/campaigns" || url.pathname.startsWith("/api/campaigns/"))
    return error(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  return null;
}

function parseCampaign(
  body: Record<string, unknown>,
  defaults: { followUpDelayDays: number; followUpClicked: boolean; followUpOpened: boolean }
) {
  if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 160)
    return invalid("name", "Campaign name is required.");
  if (!isCampaignType(body.campaignType)) return invalid("campaignType", "Invalid campaign type.");
  const audience = parseAudience(body);
  if (audience instanceof Response) return audience;
  const delay = Number(body.followUpDelayDays ?? defaults.followUpDelayDays);
  if (!Number.isInteger(delay) || delay < 0 || delay > 365)
    return invalid("followUpDelayDays", "Invalid follow-up delay.");
  const start = dateOnly(body.startDate),
    end = dateOnly(body.endDate);
  if (start instanceof Response || end instanceof Response)
    return invalid("dates", "Invalid campaign date.");
  if (start && end && start > end)
    return invalid("endDate", "End date must not precede start date.");
  return {
    name: body.name.trim(),
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null,
    campaignType: body.campaignType as CampaignType,
    startDate: start,
    endDate: end,
    audienceKind: audience.kind,
    audienceConfig: audience.config,
    followUpClicked:
      body.followUpClicked === undefined ? defaults.followUpClicked : body.followUpClicked === true,
    followUpOpened:
      body.followUpOpened === undefined ? defaults.followUpOpened : body.followUpOpened === true,
    followUpDelayDays: delay
  };
}
async function getCampaignDefaults(context: DatabaseContext) {
  const [delay, clicked, opened] = await Promise.all([
    getSystemConfigValue(context, "campaign.follow_up.delay_days"),
    getSystemConfigValue(context, "campaign.follow_up.clicked_no_conversion"),
    getSystemConfigValue(context, "campaign.follow_up.opened_no_conversion")
  ]);
  const parsedDelay = Number(delay);
  return {
    followUpDelayDays: Number.isInteger(parsedDelay) && parsedDelay >= 0 ? parsedDelay : 2,
    followUpClicked: clicked !== "false",
    followUpOpened: opened === "true"
  };
}
function parseCampaignUpdate(body: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim())
      return invalid("name", "Campaign name is required.");
    result.name = body.name.trim();
  }
  if ("description" in body)
    result.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  if ("campaignType" in body) {
    if (!isCampaignType(body.campaignType))
      return invalid("campaignType", "Invalid campaign type.");
    result.campaignType = body.campaignType;
  }
  return result;
}
function parseAudience(
  body: Record<string, unknown>
): { kind: CampaignAudienceKind; config: CampaignAudienceConfig } | Response {
  if (!isCampaignAudienceKind(body.audienceKind))
    return invalid("audienceKind", "Invalid audience source.");
  const config =
    typeof body.audienceConfig === "object" &&
    body.audienceConfig &&
    !Array.isArray(body.audienceConfig)
      ? (body.audienceConfig as CampaignAudienceConfig)
      : {};
  if (body.audienceKind === "SEGMENT" && !config.segmentCode)
    return invalid("segmentCode", "Segment is required.");
  if (
    body.audienceKind === "MANUAL" &&
    (!Array.isArray(config.customerIds) || !config.customerIds.length)
  )
    return invalid("customerIds", "Select at least one customer.");
  return { kind: body.audienceKind, config };
}
function dateOnly(value: unknown): string | null | Response {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return invalid("date", "Invalid date.");
  return value;
}
async function bodyOf(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const value = await request.json();
    return typeof value === "object" && value && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : invalid("body", "Request body must be an object.");
  } catch {
    return error(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }
}
function positive(v: string | null) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}
function campaignError(reason: unknown) {
  if (reason instanceof CampaignProviderUnavailableError)
    return error(503, "CAMPAIGN_PROVIDER_UNAVAILABLE", reason.message);
  if (!(reason instanceof CampaignWriteError)) throw reason;
  return error(
    reason.code === "CAMPAIGN_NOT_FOUND"
      ? 404
      : reason.code === "CAMPAIGN_STATE_INVALID"
        ? 409
        : 400,
    reason.code,
    reason.message
  );
}
function invalid(field: string, message: string) {
  return json<ApiErrorResponse>(
    {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        fields: [{ field, message }]
      }
    },
    { status: 400 }
  );
}
function error(status: number, code: string, message: string) {
  return json<ApiErrorResponse>({ ok: false, error: { code, message } }, { status });
}
function json<T>(body: T, init?: ResponseInit) {
  return new Response(JSON.stringify(body), { ...init, headers: { ...headers, ...init?.headers } });
}
