import {
  campaignRate,
  canTransitionCampaign,
  type CampaignAudienceConfig,
  type CampaignAudienceKind,
  type CampaignStatus,
  type CampaignType
} from "@nico-ai-crm/shared";
import type { CountRow, DatabaseContext, PaginatedResult } from "../types";
import { normalizePagination, toPagination } from "../utils";
import type {
  CampaignAudiencePreview,
  CampaignDeliveryRecord,
  CampaignDetail,
  CampaignEvent,
  CampaignListQuery,
  CampaignMember,
  CampaignMetrics,
  CampaignSummary,
  CreateCampaignCommand,
  FollowUpTaskCommand
} from "./types";
import { CampaignWriteError } from "./types";

const summarySelect = `SELECT c.id,c.name,c.description,c.operational_type,c.operational_status,c.provider,c.audience_kind,c.start_date,c.end_date,c.created_at,c.updated_at,
 u.id created_by_id,u.name created_by_name,u.email created_by_email,u.role created_by_role,
 COUNT(cc.id) audience_count,SUM(CASE WHEN cc.sent_at IS NOT NULL THEN 1 ELSE 0 END) sent_count,
 SUM(CASE WHEN cc.delivered_at IS NOT NULL THEN 1 ELSE 0 END) delivered_count,SUM(CASE WHEN cc.opened_at IS NOT NULL THEN 1 ELSE 0 END) opened_count,
 SUM(CASE WHEN cc.clicked_at IS NOT NULL THEN 1 ELSE 0 END) clicked_count,SUM(CASE WHEN cc.converted_at IS NOT NULL THEN 1 ELSE 0 END) converted_count,
 SUM(CASE WHEN cc.failed_at IS NOT NULL THEN 1 ELSE 0 END) failed_count,
 SUM(CASE WHEN cc.converted_at IS NULL AND ((c.follow_up_clicked=1 AND cc.clicked_at IS NOT NULL) OR (c.follow_up_opened=1 AND cc.opened_at IS NOT NULL AND cc.clicked_at IS NULL)) AND datetime(COALESCE(cc.clicked_at,cc.opened_at))<=datetime('now','-'||c.follow_up_delay_days||' days') THEN 1 ELSE 0 END) candidate_count
 FROM campaigns c LEFT JOIN users u ON u.id=c.created_by_user_id LEFT JOIN customer_campaigns cc ON cc.campaign_id=c.id`;
type SummaryRow = Record<string, string | number | null>;

export async function listCampaigns(
  context: DatabaseContext,
  query: CampaignListQuery = {}
): Promise<PaginatedResult<CampaignSummary>> {
  const p = normalizePagination(query);
  const where: string[] = [];
  const params: unknown[] = [];
  if (query.search?.trim()) {
    where.push("(c.name LIKE ? OR c.description LIKE ?)");
    const q = `%${query.search.trim()}%`;
    params.push(q, q);
  }
  if (query.status) {
    where.push("c.operational_status=?");
    params.push(query.status);
  }
  if (query.campaignType) {
    where.push("c.operational_type=?");
    params.push(query.campaignType);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = await context.db
    .prepare(`SELECT COUNT(*) total FROM campaigns c ${w}`)
    .bind(...params)
    .first<CountRow>();
  const rows = await context.db
    .prepare(
      `${summarySelect} ${w} GROUP BY c.id ORDER BY c.created_at DESC,c.id ASC LIMIT ? OFFSET ?`
    )
    .bind(...params, p.pageSize, p.offset)
    .all<SummaryRow>();
  return {
    items: rows.results.map(mapSummary),
    pagination: toPagination(p.page, p.pageSize, total?.total ?? 0)
  };
}

export async function getCampaignDetail(
  context: DatabaseContext,
  id: string
): Promise<CampaignDetail | null> {
  await attributeCampaignConversions(context, id);
  const row = await context.db
    .prepare(`${summarySelect} WHERE c.id=? GROUP BY c.id`)
    .bind(id)
    .first<SummaryRow>();
  if (!row) return null;
  const [config, members, events] = await Promise.all([
    context.db
      .prepare(
        "SELECT audience_config_json,follow_up_clicked,follow_up_opened,follow_up_delay_days FROM campaigns WHERE id=?"
      )
      .bind(id)
      .first<{
        audience_config_json: string;
        follow_up_clicked: number;
        follow_up_opened: number;
        follow_up_delay_days: number;
      }>(),
    listCampaignMembers(context, id),
    listCampaignEvents(context, id)
  ]);
  return {
    ...mapSummary(row),
    audienceConfig: JSON.parse(config?.audience_config_json ?? "{}") as CampaignAudienceConfig,
    followUpClicked: Boolean(config?.follow_up_clicked),
    followUpOpened: Boolean(config?.follow_up_opened),
    followUpDelayDays: config?.follow_up_delay_days ?? 2,
    members,
    events
  };
}

export async function createCampaign(
  context: DatabaseContext,
  c: CreateCampaignCommand
): Promise<CampaignSummary> {
  await context.db
    .prepare(
      `INSERT INTO campaigns (id,name,campaign_type,status,description,start_date,end_date,created_at,updated_at,operational_type,operational_status,created_by_user_id,provider,audience_kind,audience_config_json,follow_up_clicked,follow_up_opened,follow_up_delay_days)
   VALUES (?,?,?,'draft',?,?,?,?,? ,?,'DRAFT',?,?,?, ?,?,?,?)`
    )
    .bind(
      c.id,
      c.name,
      legacyType(c.campaignType),
      c.description,
      c.startDate,
      c.endDate,
      c.now,
      c.now,
      c.campaignType,
      c.actorUserId,
      c.provider,
      c.audienceKind,
      JSON.stringify(c.audienceConfig),
      c.followUpClicked ? 1 : 0,
      c.followUpOpened ? 1 : 0,
      c.followUpDelayDays
    )
    .run();
  return requireCampaign(context, c.id);
}

export async function updateCampaign(
  context: DatabaseContext,
  id: string,
  values: Partial<
    Pick<
      CreateCampaignCommand,
      | "name"
      | "description"
      | "campaignType"
      | "startDate"
      | "endDate"
      | "audienceKind"
      | "audienceConfig"
      | "followUpClicked"
      | "followUpOpened"
      | "followUpDelayDays"
    >
  >,
  now: string
) {
  const current = await requireCampaign(context, id);
  if (!["DRAFT", "READY"].includes(current.status))
    throw new CampaignWriteError(
      "CAMPAIGN_STATE_INVALID",
      "Only draft or ready campaigns can be edited."
    );
  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (n: string, v: unknown) => {
    sets.push(`${n}=?`);
    params.push(v);
  };
  if (values.name !== undefined) add("name", values.name);
  if (values.description !== undefined) add("description", values.description);
  if (values.campaignType !== undefined) {
    add("operational_type", values.campaignType);
    add("campaign_type", legacyType(values.campaignType));
  }
  if (values.startDate !== undefined) add("start_date", values.startDate);
  if (values.endDate !== undefined) add("end_date", values.endDate);
  if (values.audienceKind !== undefined) add("audience_kind", values.audienceKind);
  if (values.audienceConfig !== undefined)
    add("audience_config_json", JSON.stringify(values.audienceConfig));
  if (values.followUpClicked !== undefined)
    add("follow_up_clicked", values.followUpClicked ? 1 : 0);
  if (values.followUpOpened !== undefined) add("follow_up_opened", values.followUpOpened ? 1 : 0);
  if (values.followUpDelayDays !== undefined) add("follow_up_delay_days", values.followUpDelayDays);
  if (!sets.length) return current;
  add("updated_at", now);
  await context.db
    .prepare(`UPDATE campaigns SET ${sets.join(",")} WHERE id=?`)
    .bind(...params, id)
    .run();
  return requireCampaign(context, id);
}

export async function previewCampaignAudience(
  context: DatabaseContext,
  kind: CampaignAudienceKind,
  config: CampaignAudienceConfig,
  limit = 100
): Promise<CampaignAudiencePreview> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (kind === "MANUAL") {
    const ids = [...new Set(config.customerIds ?? [])];
    if (!ids.length) return { customers: [], count: 0 };
    where.push(`c.id IN (${ids.map(() => "?").join(",")})`);
    params.push(...ids);
  }
  if (kind === "SEGMENT") {
    where.push(
      "EXISTS (SELECT 1 FROM customer_segment_memberships sm JOIN customer_segments s ON s.id=sm.segment_id WHERE sm.customer_id=c.id AND s.code=?)"
    );
    params.push(config.segmentCode ?? "");
  }
  if (kind === "FILTERED") {
    if (config.active !== undefined) {
      where.push("c.active=?");
      params.push(config.active ? 1 : 0);
    }
    if (config.b2bStatus) {
      where.push("c.b2b_status=?");
      params.push(config.b2bStatus);
    }
    if (config.assignedSalesRepId) {
      where.push("c.assigned_sales_rep_id=?");
      params.push(config.assignedSalesRepId);
    }
    if (config.city) {
      where.push("c.city=?");
      params.push(config.city);
    }
    if (config.country) {
      where.push("c.country=?");
      params.push(config.country);
    }
    if (config.inactivityDays !== undefined) {
      where.push("COALESCE(cm.days_since_last_order,99999)>=?");
      params.push(config.inactivityDays);
    }
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = await context.db
    .prepare(
      `SELECT COUNT(*) total FROM customers c LEFT JOIN customer_metrics cm ON cm.customer_id=c.id ${w}`
    )
    .bind(...params)
    .first<CountRow>();
  const rows = await context.db
    .prepare(
      `SELECT c.id,c.company_name,c.city,u.id user_id,u.name user_name,u.email user_email,u.role user_role FROM customers c LEFT JOIN customer_metrics cm ON cm.customer_id=c.id LEFT JOIN users u ON u.id=c.assigned_sales_rep_id ${w} ORDER BY c.company_name LIMIT ?`
    )
    .bind(...params, limit)
    .all<Record<string, string | null>>();
  return {
    count: total?.total ?? 0,
    customers: rows.results.map((r) => ({
      id: r.id!,
      companyName: r.company_name!,
      city: r.city,
      assignedSalesRep: r.user_id
        ? { id: r.user_id, name: r.user_name!, email: r.user_email!, role: r.user_role! }
        : null
    }))
  };
}

export async function prepareCampaign(context: DatabaseContext, id: string, now: string) {
  const detail = await getCampaignDetail(context, id);
  if (!detail) throw new CampaignWriteError("CAMPAIGN_NOT_FOUND", "Campaign not found.");
  if (detail.status === "READY") return { campaign: detail, duplicate: true };
  if (detail.status !== "DRAFT")
    throw new CampaignWriteError("CAMPAIGN_STATE_INVALID", "Campaign cannot be prepared.");
  const audience = await previewCampaignAudience(
    context,
    detail.audienceKind,
    detail.audienceConfig,
    10000
  );
  if (!audience.count)
    throw new CampaignWriteError("CAMPAIGN_AUDIENCE_EMPTY", "Campaign has no eligible customers.");
  const statements = audience.customers.map((c) =>
    context.db
      .prepare(
        "INSERT OR IGNORE INTO customer_campaigns (id,campaign_id,customer_id,created_at,updated_at,delivery_status) VALUES (?,?,?,?,?,'PENDING')"
      )
      .bind(`cc-${id}-${c.id}`, id, c.id, now, now)
  );
  statements.push(
    context.db
      .prepare(
        "UPDATE campaigns SET operational_status='READY',status='draft',updated_at=? WHERE id=?"
      )
      .bind(now, id)
  );
  statements.push(
    context.db
      .prepare(
        "INSERT OR IGNORE INTO campaign_events (id,campaign_id,event_type,provider,external_event_id,occurred_at) VALUES (?,?,'PREPARED','CRM',?,?)"
      )
      .bind(`cev-prepare-${id}`, id, `prepare:${id}`, now)
  );
  await context.db.batch(statements);
  return { campaign: await getCampaignDetail(context, id), duplicate: false };
}

export async function getCampaignDeliveryMembers(context: DatabaseContext, id: string) {
  const rows = await context.db
    .prepare(
      "SELECT id membership_id,customer_id FROM customer_campaigns WHERE campaign_id=? ORDER BY id"
    )
    .bind(id)
    .all<{ membership_id: string; customer_id: string }>();
  return rows.results.map((r) => ({ membershipId: r.membership_id, customerId: r.customer_id }));
}
export async function recordCampaignDelivery(
  context: DatabaseContext,
  id: string,
  provider: string,
  outcomes: CampaignDeliveryRecord[],
  now: string
) {
  const campaign = await requireCampaign(context, id);
  if (campaign.status === "ACTIVE")
    return { campaign: await getCampaignDetail(context, id), duplicate: true };
  if (campaign.status !== "READY")
    throw new CampaignWriteError("CAMPAIGN_STATE_INVALID", "Campaign is not ready to start.");
  const statements: D1PreparedStatement[] = [];
  for (const o of outcomes) {
    const status = o.failedAt
      ? "FAILED"
      : o.deliveredAt
        ? "DELIVERED"
        : o.sentAt
          ? "SENT"
          : "PENDING";
    statements.push(
      context.db
        .prepare(
          "UPDATE customer_campaigns SET delivery_status=?,provider_member_id=?,sent_at=?,delivered_at=?,opened_at=?,clicked_at=?,converted_at=?,failed_at=?,failure_reason=?,updated_at=? WHERE id=? AND campaign_id=?"
        )
        .bind(
          status,
          o.externalMemberId,
          o.sentAt,
          o.deliveredAt,
          o.openedAt,
          o.clickedAt,
          o.convertedAt,
          o.failedAt,
          o.failureReason,
          now,
          o.membershipId,
          id
        )
    );
    for (const [type, date] of [
      ["SENT", o.sentAt],
      ["DELIVERED", o.deliveredAt],
      ["OPENED", o.openedAt],
      ["CLICKED", o.clickedAt],
      ["CONVERTED", o.convertedAt],
      ["FAILED", o.failedAt]
    ] as const)
      if (date)
        statements.push(
          context.db
            .prepare(
              "INSERT OR IGNORE INTO campaign_events (id,campaign_id,customer_campaign_id,event_type,provider,external_event_id,occurred_at) VALUES (?,?,?,?,?,?,?)"
            )
            .bind(
              `cev-${type}-${o.membershipId}`,
              id,
              o.membershipId,
              type,
              provider,
              `${type}:${o.membershipId}`,
              date
            )
        );
  }
  statements.push(
    context.db
      .prepare(
        "UPDATE campaigns SET operational_status='ACTIVE',status='active',start_date=COALESCE(start_date,substr(?,1,10)),updated_at=? WHERE id=?"
      )
      .bind(now, now, id)
  );
  await context.db.batch(statements);
  return { campaign: await getCampaignDetail(context, id), duplicate: false };
}

export async function transitionCampaign(
  context: DatabaseContext,
  id: string,
  to: Extract<CampaignStatus, "COMPLETED" | "CANCELLED">,
  now: string
) {
  const c = await requireCampaign(context, id);
  if (c.status === to) return { campaign: await getCampaignDetail(context, id), duplicate: true };
  if (!canTransitionCampaign(c.status, to))
    throw new CampaignWriteError("CAMPAIGN_STATE_INVALID", "Campaign transition is not allowed.");
  await context.db.batch([
    context.db
      .prepare(
        "UPDATE campaigns SET operational_status=?,status=?,end_date=CASE WHEN ?='COMPLETED' THEN COALESCE(end_date,substr(?,1,10)) ELSE end_date END,updated_at=? WHERE id=?"
      )
      .bind(to, to.toLowerCase(), to, now, now, id),
    context.db
      .prepare(
        "INSERT OR IGNORE INTO campaign_events (id,campaign_id,event_type,provider,external_event_id,occurred_at) VALUES (?,?,?,'CRM',?,?)"
      )
      .bind(`cev-${to}-${id}`, id, to, `${to}:${id}`, now)
  ]);
  return { campaign: await getCampaignDetail(context, id), duplicate: false };
}

export async function listFollowUpCandidates(context: DatabaseContext, id: string, now: string) {
  const c = await getCampaignDetail(context, id);
  if (!c) throw new CampaignWriteError("CAMPAIGN_NOT_FOUND", "Campaign not found.");
  const cutoff = new Date(new Date(now).getTime() - c.followUpDelayDays * 86400000).toISOString();
  return c.members.filter(
    (m) =>
      !m.convertedAt &&
      ((c.followUpClicked && m.clickedAt && m.clickedAt <= cutoff) ||
        (c.followUpOpened && !m.clickedAt && m.openedAt && m.openedAt <= cutoff))
  );
}

export async function createCampaignFollowUpTasks(
  context: DatabaseContext,
  c: FollowUpTaskCommand
) {
  const campaign = await requireCampaign(context, c.campaignId);
  const candidates = await listFollowUpCandidates(context, c.campaignId, c.now);
  const user = await context.db
    .prepare("SELECT id FROM users WHERE id=? AND active=1")
    .bind(c.assignedUserId)
    .first<{ id: string }>();
  if (!user)
    throw new CampaignWriteError("ASSIGNEE_INVALID", "Assigned user is missing or inactive.");
  let created = 0;
  for (const member of candidates) {
    const existing = await context.db
      .prepare(
        "SELECT id FROM tasks WHERE source_campaign_id=? AND customer_id=? AND operational_type='CAMPAIGN_FOLLOW_UP'"
      )
      .bind(c.campaignId, member.customerId)
      .first<{ id: string }>();
    if (existing) continue;
    const taskId = `tsk-${c.campaignId}-${member.customerId}`;
    await context.db.batch([
      context.db
        .prepare(
          `INSERT INTO tasks (id,customer_id,assigned_user_id,created_by_user_id,title,description,task_type,priority,status,due_at,created_at,updated_at,operational_type,source_origin,source_campaign_id) VALUES (?,?,?,?,?,?,'follow_up',?,'open',?,?,?,'CAMPAIGN_FOLLOW_UP','CAMPAIGN',?)`
        )
        .bind(
          taskId,
          member.customerId,
          c.assignedUserId,
          c.actorUserId,
          `Follow-up kampane: ${campaign.name}`,
          "Zákazník prejavil záujem bez evidovanej konverzie.",
          c.priority,
          c.dueAt,
          c.now,
          c.now,
          c.campaignId
        ),
      context.db
        .prepare(
          "INSERT INTO task_events (id,task_id,actor_user_id,event_type,new_status,new_due_at,new_assigned_user_id,created_at) VALUES (?, ?, ?, 'CREATED','open',?,?,?)"
        )
        .bind(`evt-${taskId}`, taskId, c.actorUserId, c.dueAt, c.assignedUserId, c.now)
    ]);
    created++;
  }
  return { eligible: candidates.length, created, duplicate: created === 0 };
}

export async function listCustomerCampaignHistory(
  context: DatabaseContext,
  customerId: string
): Promise<
  Array<{
    campaignId: string;
    campaignName: string;
    campaignType: CampaignType;
    status: CampaignStatus;
    sentAt: string | null;
    openedAt: string | null;
    clickedAt: string | null;
    convertedAt: string | null;
  }>
> {
  const rows = await context.db
    .prepare(
      "SELECT c.id campaign_id,c.name,c.operational_type,c.operational_status,cc.sent_at,cc.opened_at,cc.clicked_at,cc.converted_at FROM customer_campaigns cc JOIN campaigns c ON c.id=cc.campaign_id WHERE cc.customer_id=? ORDER BY COALESCE(cc.clicked_at,cc.opened_at,cc.sent_at,cc.created_at) DESC"
    )
    .bind(customerId)
    .all<Record<string, string | null>>();
  return rows.results.map((r) => ({
    campaignId: r.campaign_id!,
    campaignName: r.name!,
    campaignType: r.operational_type as CampaignType,
    status: r.operational_status as CampaignStatus,
    sentAt: r.sent_at,
    openedAt: r.opened_at,
    clickedAt: r.clicked_at,
    convertedAt: r.converted_at
  }));
}

async function listCampaignMembers(
  context: DatabaseContext,
  id: string
): Promise<CampaignMember[]> {
  const rows = await context.db
    .prepare(
      `SELECT cc.*,c.company_name,c.city,u.id user_id,u.name user_name,u.email user_email,u.role user_role FROM customer_campaigns cc JOIN customers c ON c.id=cc.customer_id LEFT JOIN users u ON u.id=c.assigned_sales_rep_id WHERE cc.campaign_id=? ORDER BY c.company_name`
    )
    .bind(id)
    .all<Record<string, string | null>>();
  return rows.results.map((r) => ({
    id: r.id!,
    customerId: r.customer_id!,
    customerName: r.company_name!,
    city: r.city,
    assignedSalesRep: r.user_id
      ? { id: r.user_id, name: r.user_name!, email: r.user_email!, role: r.user_role! }
      : null,
    deliveryStatus: r.delivery_status as CampaignMember["deliveryStatus"],
    sentAt: r.sent_at,
    deliveredAt: r.delivered_at,
    openedAt: r.opened_at,
    clickedAt: r.clicked_at,
    convertedAt: r.converted_at,
    conversionOrderId: r.conversion_order_id,
    failedAt: r.failed_at
  }));
}
async function listCampaignEvents(context: DatabaseContext, id: string): Promise<CampaignEvent[]> {
  const rows = await context.db
    .prepare(
      "SELECT id,customer_campaign_id,event_type,provider,occurred_at FROM campaign_events WHERE campaign_id=? ORDER BY occurred_at DESC,id"
    )
    .bind(id)
    .all<Record<string, string | null>>();
  return rows.results.map((r) => ({
    id: r.id!,
    memberId: r.customer_campaign_id,
    eventType: r.event_type as CampaignEvent["eventType"],
    provider: r.provider!,
    occurredAt: r.occurred_at!
  }));
}
async function attributeCampaignConversions(context: DatabaseContext, id: string) {
  const days = Number(
    (
      await context.db
        .prepare("SELECT value FROM system_config WHERE key='campaign.attribution_window_days'")
        .first<{ value: string }>()
    )?.value ?? 30
  );
  await context.db
    .prepare(
      `UPDATE customer_campaigns SET converted_at=(SELECT MIN(o.order_date) FROM orders o WHERE o.customer_id=customer_campaigns.customer_id AND o.status='completed' AND o.order_date>COALESCE(customer_campaigns.clicked_at,customer_campaigns.opened_at) AND o.order_date<=datetime(COALESCE(customer_campaigns.clicked_at,customer_campaigns.opened_at),'+'||?||' days')),conversion_order_id=(SELECT o.id FROM orders o WHERE o.customer_id=customer_campaigns.customer_id AND o.status='completed' AND o.order_date>COALESCE(customer_campaigns.clicked_at,customer_campaigns.opened_at) AND o.order_date<=datetime(COALESCE(customer_campaigns.clicked_at,customer_campaigns.opened_at),'+'||?||' days') ORDER BY o.order_date LIMIT 1) WHERE campaign_id=? AND converted_at IS NULL AND COALESCE(clicked_at,opened_at) IS NOT NULL AND EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=customer_campaigns.customer_id AND o.status='completed' AND o.order_date>COALESCE(customer_campaigns.clicked_at,customer_campaigns.opened_at) AND o.order_date<=datetime(COALESCE(customer_campaigns.clicked_at,customer_campaigns.opened_at),'+'||?||' days'))`
    )
    .bind(days, days, id, days)
    .run();
}
async function requireCampaign(context: DatabaseContext, id: string) {
  const row = await context.db
    .prepare(`${summarySelect} WHERE c.id=? GROUP BY c.id`)
    .bind(id)
    .first<SummaryRow>();
  if (!row) throw new CampaignWriteError("CAMPAIGN_NOT_FOUND", "Campaign not found.");
  return mapSummary(row);
}
function mapSummary(r: SummaryRow): CampaignSummary {
  const audience = Number(r.audience_count ?? 0),
    sent = Number(r.sent_count ?? 0),
    opened = Number(r.opened_count ?? 0),
    clicked = Number(r.clicked_count ?? 0),
    converted = Number(r.converted_count ?? 0);
  const metrics: CampaignMetrics = {
    audience,
    sent,
    delivered: Number(r.delivered_count ?? 0),
    opened,
    clicked,
    converted,
    failed: Number(r.failed_count ?? 0),
    followUpCandidates: Number(r.candidate_count ?? 0),
    openRate: campaignRate(opened, sent),
    clickRate: campaignRate(clicked, sent),
    conversionRate: campaignRate(converted, sent)
  };
  return {
    id: String(r.id),
    name: String(r.name),
    description: r.description as string | null,
    campaignType: r.operational_type as CampaignType,
    status: r.operational_status as CampaignStatus,
    provider: r.provider as CampaignSummary["provider"],
    audienceKind: r.audience_kind as CampaignAudienceKind,
    startDate: r.start_date as string | null,
    endDate: r.end_date as string | null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    createdBy: r.created_by_id
      ? {
          id: String(r.created_by_id),
          name: String(r.created_by_name),
          email: String(r.created_by_email),
          role: String(r.created_by_role)
        }
      : null,
    metrics
  };
}
function legacyType(t: CampaignType) {
  if (t === "NEWSLETTER") return "newsletter";
  if (t === "REACTIVATION") return "reactivation";
  if (t === "CROSS_SELL") return "cross_sell";
  if (t === "INFORMATIONAL") return "retention";
  if (t === "OTHER") return "other";
  return "sales";
}
