import type { DatabaseContext } from "../types";
import type { CompanyTargetSetting, ConfigSetting, KpiSettingRow } from "./types";

export async function listSystemSettings(context: DatabaseContext): Promise<ConfigSetting[]> {
  const result = await context.db
    .prepare(`SELECT key, value, value_type, description FROM system_config ORDER BY key`)
    .all<{ key: string; value: string; value_type: string; description: string | null }>();
  return result.results.map((row) => ({
    key: row.key,
    value: row.value,
    valueType: row.value_type,
    description: row.description
  }));
}

export async function updateSystemSettings(
  context: DatabaseContext,
  values: Record<string, string>,
  updatedAt: string
): Promise<void> {
  const statements = Object.entries(values).map(([key, value]) =>
    context.db
      .prepare("UPDATE system_config SET value = ?, updated_at = ? WHERE key = ?")
      .bind(value, updatedAt, key)
  );
  if (statements.length) await context.db.batch(statements);
}

export async function listKpiSettings(
  context: DatabaseContext
): Promise<{ targets: KpiSettingRow[]; companyTargets: CompanyTargetSetting[] }> {
  const [targets, companyTargets] = await Promise.all([
    context.db
      .prepare(
        `SELECT t.id, d.code, d.name, d.role, t.target_value, COALESCE(t.weight, 0) AS weight, t.period_start, t.period_end, t.user_id FROM kpi_targets t JOIN kpi_definitions d ON d.id = t.kpi_definition_id WHERE d.active = 1 ORDER BY d.role, d.code, t.user_id`
      )
      .all<{
        id: string;
        code: string;
        name: string;
        role: string;
        target_value: number;
        weight: number;
        period_start: string;
        period_end: string;
        user_id: string | null;
      }>(),
    context.db
      .prepare(
        `SELECT c.id, d.name, c.target_value, c.period_start, c.period_end FROM company_kpi_targets c JOIN kpi_definitions d ON d.id = c.kpi_definition_id ORDER BY c.period_start DESC`
      )
      .all<{
        id: string;
        name: string;
        target_value: number;
        period_start: string;
        period_end: string;
      }>()
  ]);
  return {
    targets: targets.results.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      role: row.role,
      targetValue: row.target_value,
      weight: row.weight,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      userId: row.user_id
    })),
    companyTargets: companyTargets.results.map((row) => ({
      id: row.id,
      name: row.name,
      targetValue: row.target_value,
      periodStart: row.period_start,
      periodEnd: row.period_end
    }))
  };
}

export async function updateKpiSettings(
  context: DatabaseContext,
  targets: Array<{ id: string; targetValue: number; weight: number }>,
  companyTargets: Array<{ id: string; targetValue: number }>,
  updatedAt: string
): Promise<void> {
  const statements = [
    ...targets.map((target) =>
      context.db
        .prepare("UPDATE kpi_targets SET target_value = ?, weight = ?, updated_at = ? WHERE id = ?")
        .bind(target.targetValue, target.weight, updatedAt, target.id)
    ),
    ...companyTargets.map((target) =>
      context.db
        .prepare("UPDATE company_kpi_targets SET target_value = ?, updated_at = ? WHERE id = ?")
        .bind(target.targetValue, updatedAt, target.id)
    )
  ];
  if (statements.length) await context.db.batch(statements);
}
