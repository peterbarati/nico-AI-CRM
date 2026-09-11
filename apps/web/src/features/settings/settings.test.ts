import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSettings, saveSettings } from "./api";
import type { SettingsData } from "./types";

const settings: SettingsData = {
  sections: {
    customerService: [
      {
        key: "customer_service.daily_target",
        value: "12",
        valueType: "number",
        description: "Daily call target"
      }
    ],
    sales: [],
    kpi: [],
    business: [],
    ai: []
  },
  kpi: {
    targets: [
      {
        id: "target-1",
        code: "calls_completed",
        name: "Calls completed",
        role: "CUSTOMER_SERVICE",
        targetValue: 12,
        weight: 1,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        userId: null
      }
    ],
    companyTargets: []
  },
  aiAvailability: {
    provider: "MOCK",
    configured: true,
    secretStoredInEnvironment: false
  }
};

afterEach(() => vi.unstubAllGlobals());

describe("business settings API", () => {
  it("loads settings and sends only editable values and target fields", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: settings }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: settings }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", fetcher);

    await expect(fetchSettings()).resolves.toEqual(settings);
    await expect(saveSettings(settings)).resolves.toEqual(settings);
    expect(fetcher).toHaveBeenLastCalledWith(
      "/api/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          values: { "customer_service.daily_target": "12" },
          kpiTargets: [{ id: "target-1", targetValue: 12, weight: 1 }],
          companyTargets: []
        })
      })
    );
  });

  it("surfaces structured validation messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Validation failed.",
              fields: [{ field: "values.timezone", message: "Timezone is invalid." }]
            }
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        )
      )
    );

    await expect(fetchSettings()).rejects.toThrow("Timezone is invalid.");
  });
});
