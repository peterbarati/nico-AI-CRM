import type { SettingsData } from "./types";
import { requestApiData } from "../../lib/api-client";

export async function fetchSettings() {
  return requestApiData<SettingsData>("/api/settings");
}
export async function saveSettings(data: SettingsData) {
  const values = Object.fromEntries(
    Object.values(data.sections)
      .flat()
      .map((setting) => [setting.key, setting.value])
  );
  return requestApiData<SettingsData>("/api/settings", {
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
  });
}
