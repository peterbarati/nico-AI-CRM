import {
  listKpiSettings,
  listSystemSettings,
  updateKpiSettings,
  updateSystemSettings,
  type DatabaseContext
} from "@nico-ai-crm/db";
import { isValidBusinessTimezone, type ValidationIssue } from "@nico-ai-crm/shared";

const editableKeys = new Set([
  "customer_service.daily_call_target",
  "customer_service.reorder_grace_days",
  "customer_service.at_risk_days",
  "customer_service.critical_days",
  "customer_service.reactivation_days",
  "customer_service.recent_interaction_suppression_days",
  "customer_service.weight_reorder_slightly_overdue",
  "customer_service.weight_reorder_significantly_overdue",
  "customer_service.weight_reorder_severely_overdue",
  "customer_service.weight_decline_20",
  "customer_service.weight_decline_30",
  "customer_service.weight_decline_50",
  "customer_service.weight_inactivity_at_risk",
  "customer_service.weight_inactivity_critical",
  "customer_service.weight_inactivity_reactivation",
  "customer_service.weight_b2b_missing",
  "customer_service.weight_campaign_interest",
  "customer_service.weight_open_follow_up_task",
  "customer_service.weight_overdue_follow_up_task",
  "customer_service.weight_cross_sell",
  "customer_service.weight_recent_interaction_reduction",
  "system.business_timezone",
  "business.company_name",
  "business.default_currency",
  "business.default_reporting_period",
  "kpi.attribution_window_days",
  "kpi.reactivation_inactivity_days",
  "ai.enabled",
  "ai.provider",
  "ai.model",
  "ai.max_output_tokens",
  "ai.timeout_ms",
  "ai.cache_ttl_minutes"
]);

export async function getSettingsData(context: DatabaseContext, openAIConfigured: boolean) {
  const [settings, kpi] = await Promise.all([
    listSystemSettings(context),
    listKpiSettings(context)
  ]);
  const pick = (prefixes: string[]) =>
    settings.filter(
      (setting) =>
        prefixes.some((prefix) => setting.key.startsWith(prefix)) && editableKeys.has(setting.key)
    );
  const provider = settings.find((setting) => setting.key === "ai.provider")?.value ?? "MOCK";
  return {
    sections: {
      customerService: pick(["customer_service."]),
      sales: [],
      kpi: pick(["kpi."]),
      business: pick(["system.business_", "business."]),
      ai: pick(["ai."])
    },
    kpi,
    aiAvailability: {
      provider,
      configured: provider === "MOCK" || openAIConfigured,
      secretStoredInEnvironment: openAIConfigured
    }
  };
}

export async function validateAndUpdateSettings(
  context: DatabaseContext,
  body: unknown,
  now: string
): Promise<{ issues: ValidationIssue[] }> {
  if (!isRecord(body))
    return { issues: [{ field: "body", message: "Settings payload must be an object." }] };
  const current = await getSettingsData(context, false);
  const valuesInput = isRecord(body.values) ? body.values : {};
  const values: Record<string, string> = {};
  const issues: ValidationIssue[] = [];
  for (const [key, raw] of Object.entries(valuesInput)) {
    if (!editableKeys.has(key)) {
      issues.push({ field: key, message: "Setting is not editable." });
      continue;
    }
    const value = String(raw).trim();
    if (!validateSettingValue(key, value))
      issues.push({ field: key, message: "Setting value is invalid." });
    else values[key] = value;
  }
  const allCurrent = Object.fromEntries(
    Object.values(current.sections)
      .flat()
      .map((setting) => [setting.key, setting.value])
  );
  const merged = { ...allCurrent, ...values };
  const atRisk = Number(merged["customer_service.at_risk_days"]);
  const critical = Number(merged["customer_service.critical_days"]);
  const reactivation = Number(merged["customer_service.reactivation_days"]);
  if (critical < atRisk)
    issues.push({
      field: "customer_service.critical_days",
      message: "Critical days must be at least at-risk days."
    });
  if (reactivation < critical)
    issues.push({
      field: "customer_service.reactivation_days",
      message: "Reactivation days must be at least critical days."
    });

  const targets = parseTargets(body.kpiTargets, current.kpi.targets, issues);
  const companyTargets = parseCompanyTargets(
    body.companyTargets,
    current.kpi.companyTargets,
    issues
  );
  const mergedTargets = current.kpi.targets.map((target) => ({
    ...target,
    ...(targets.find((item) => item.id === target.id) ?? {})
  }));
  for (const role of ["customer_service", "sales_rep"]) {
    const weights = mergedTargets
      .filter((target) => target.role === role && target.userId === null)
      .reduce((sum, target) => sum + target.weight, 0);
    if (Math.abs(weights - 1) > 0.001)
      issues.push({ field: `kpiTargets.${role}`, message: "Role KPI weights must total 1." });
  }
  if (issues.length) return { issues };
  await Promise.all([
    updateSystemSettings(context, values, now),
    updateKpiSettings(context, targets, companyTargets, now)
  ]);
  return { issues: [] };
}

function validateSettingValue(key: string, value: string): boolean {
  if (key === "system.business_timezone") return isValidBusinessTimezone(value);
  if (key === "ai.enabled") return value === "true" || value === "false";
  if (key === "ai.provider") return value === "MOCK" || value === "OPENAI";
  if (key === "business.default_reporting_period") return ["day", "week", "month"].includes(value);
  if (key === "business.default_currency") return /^[A-Z]{3}$/.test(value);
  if (key === "ai.model" || key === "business.company_name")
    return value.length > 0 && value.length <= 100;
  const number = Number(value);
  if (!Number.isFinite(number)) return false;
  if (key === "ai.timeout_ms") return number >= 1000 && number <= 60000;
  if (key === "ai.max_output_tokens")
    return Number.isInteger(number) && number >= 100 && number <= 4000;
  if (key === "ai.cache_ttl_minutes")
    return Number.isInteger(number) && number >= 1 && number <= 1440;
  if (key.includes("weight_recent_interaction_reduction")) return number >= -100 && number <= 0;
  return number > 0 && number <= 100000;
}

function parseTargets(value: unknown, current: Array<{ id: string }>, issues: ValidationIssue[]) {
  if (value === undefined) return [] as Array<{ id: string; targetValue: number; weight: number }>;
  if (!Array.isArray(value)) {
    issues.push({ field: "kpiTargets", message: "KPI targets must be an array." });
    return [];
  }
  return value.flatMap((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !current.some((target) => target.id === item.id) ||
      !isNonNegative(item.targetValue) ||
      !isWeight(item.weight)
    ) {
      issues.push({ field: `kpiTargets.${index}`, message: "KPI target is invalid." });
      return [];
    }
    return [{ id: item.id, targetValue: Number(item.targetValue), weight: Number(item.weight) }];
  });
}

function parseCompanyTargets(
  value: unknown,
  current: Array<{ id: string }>,
  issues: ValidationIssue[]
) {
  if (value === undefined) return [] as Array<{ id: string; targetValue: number }>;
  if (!Array.isArray(value)) {
    issues.push({ field: "companyTargets", message: "Company targets must be an array." });
    return [];
  }
  return value.flatMap((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !current.some((target) => target.id === item.id) ||
      !isNonNegative(item.targetValue)
    ) {
      issues.push({ field: `companyTargets.${index}`, message: "Company target is invalid." });
      return [];
    }
    return [{ id: item.id, targetValue: Number(item.targetValue) }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonNegative(value: unknown) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}
function isWeight(value: unknown) {
  return Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1;
}
