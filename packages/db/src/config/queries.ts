import type { DatabaseContext } from "../types";
import type { SystemConfigEntry, SystemConfigRow } from "./types";

export async function getSystemConfigValue(
  context: DatabaseContext,
  key: string
): Promise<string | null> {
  const row = await context.db
    .prepare("SELECT value FROM system_config WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();

  return row?.value ?? null;
}

export async function getSystemConfigByPrefix(
  context: DatabaseContext,
  prefix: string
): Promise<SystemConfigEntry[]> {
  const result = await context.db
    .prepare(
      `
      SELECT key, value, value_type
      FROM system_config
      WHERE key LIKE ?
      ORDER BY key ASC
    `
    )
    .bind(`${prefix}%`)
    .all<SystemConfigRow>();

  return result.results.map((row) => ({
    key: row.key,
    value: row.value,
    valueType: row.value_type
  }));
}
