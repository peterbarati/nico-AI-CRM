import type { SettingsData } from "./types";

async function parse(response: Response): Promise<SettingsData> {
  const body = (await response.json()) as {
    ok?: boolean;
    data?: SettingsData;
    error?: { message?: string; fields?: Array<{ message: string }> };
  };
  if (!response.ok || !body.data)
    throw new Error(
      body.error?.fields?.[0]?.message ?? body.error?.message ?? "Settings request failed."
    );
  return body.data;
}
export async function fetchSettings() {
  return parse(await fetch("/api/settings"));
}
export async function saveSettings(data: SettingsData) {
  const values = Object.fromEntries(
    Object.values(data.sections)
      .flat()
      .map((setting) => [setting.key, setting.value])
  );
  return parse(
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        values,
        kpiTargets: data.kpi.targets.map(({ id, targetValue, weight }) => ({
          id,
          targetValue,
          weight
        })),
        companyTargets: data.kpi.companyTargets.map(({ id, targetValue }) => ({ id, targetValue }))
      })
    })
  );
}
