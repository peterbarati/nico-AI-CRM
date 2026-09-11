import type { DatabaseContext } from "../types";
import type {
  CachedAssistantRun,
  CustomerAssistantSupplement,
  RecordAssistantRunInput
} from "./types";

export async function getCustomerAssistantSupplement(
  context: DatabaseContext,
  customerId: string,
  nowUtc: string
): Promise<CustomerAssistantSupplement> {
  const [visit, campaign, products, overdue] = await Promise.all([
    context.db
      .prepare(
        `SELECT status, result, COALESCE(completed_at, started_at, planned_at) AS occurred_at FROM sales_visits WHERE customer_id = ? ORDER BY COALESCE(completed_at, started_at, planned_at, created_at) DESC LIMIT 1`
      )
      .bind(customerId)
      .first<{ status: string; result: string | null; occurred_at: string | null }>(),
    context.db
      .prepare(
        `SELECT sent_at, opened_at, clicked_at, converted_at FROM customer_campaigns WHERE customer_id = ? ORDER BY COALESCE(clicked_at, opened_at, sent_at, created_at) DESC LIMIT 1`
      )
      .bind(customerId)
      .first<{
        sent_at: string | null;
        opened_at: string | null;
        clicked_at: string | null;
        converted_at: string | null;
      }>(),
    context.db
      .prepare(
        `SELECT DISTINCT oi.product_name, p.category FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN products p ON p.id = oi.product_id WHERE o.customer_id = ? AND o.status = 'completed' ORDER BY o.order_date DESC, oi.product_name LIMIT 20`
      )
      .bind(customerId)
      .all<{ product_name: string; category: string | null }>(),
    context.db
      .prepare(
        `SELECT id FROM tasks WHERE customer_id = ? AND status IN ('open', 'in_progress') AND due_at IS NOT NULL AND due_at < ?`
      )
      .bind(customerId, nowUtc)
      .all<{ id: string }>()
  ]);
  return {
    latestVisit: visit
      ? { status: visit.status, result: visit.result, occurredAt: visit.occurred_at }
      : null,
    campaign: campaign
      ? {
          sent: Boolean(campaign.sent_at),
          opened: Boolean(campaign.opened_at),
          clicked: Boolean(campaign.clicked_at),
          converted: Boolean(campaign.converted_at)
        }
      : null,
    purchasedProducts: [...new Set(products.results.map((row) => row.product_name))],
    purchasedCategories: [
      ...new Set(
        products.results
          .map((row) => row.category)
          .filter((value): value is string => Boolean(value))
      )
    ],
    overdueTaskIds: overdue.results.map((row) => row.id)
  };
}

export async function getCachedAssistantRun(
  context: DatabaseContext,
  customerId: string,
  purpose: string,
  fingerprint: string,
  nowUtc: string
): Promise<CachedAssistantRun | null> {
  const row = await context.db
    .prepare(
      `SELECT id, response_json, provider, model, created_at FROM ai_assistant_runs WHERE customer_id = ? AND purpose = ? AND context_fingerprint = ? AND status = 'success' AND response_json IS NOT NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1`
    )
    .bind(customerId, purpose, fingerprint, nowUtc)
    .first<{
      id: string;
      response_json: string;
      provider: string;
      model: string;
      created_at: string;
    }>();
  return row
    ? {
        id: row.id,
        responseJson: row.response_json,
        provider: row.provider,
        model: row.model,
        createdAt: row.created_at
      }
    : null;
}

export async function recordAssistantRun(
  context: DatabaseContext,
  input: RecordAssistantRunInput
): Promise<void> {
  await context.db
    .prepare(
      `INSERT INTO ai_assistant_runs (id, actor_user_id, customer_id, purpose, provider, model, prompt_version, context_fingerprint, status, response_json, error_code, latency_ms, input_tokens, output_tokens, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.id,
      input.actorUserId,
      input.customerId,
      input.purpose,
      input.provider,
      input.model,
      input.promptVersion,
      input.contextFingerprint,
      input.status,
      input.responseJson,
      input.errorCode,
      input.latencyMs,
      input.inputTokens ?? null,
      input.outputTokens ?? null,
      input.createdAt,
      input.expiresAt
    )
    .run();
}
