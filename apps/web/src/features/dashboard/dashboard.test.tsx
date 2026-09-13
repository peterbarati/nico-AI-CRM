import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchManagementDashboard } from "./api";
import { DashboardContent, loadDashboard } from "./ManagementDashboardPage";
import { ManagementDashboardView } from "./ManagementDashboardView";
import type { ManagementDashboard } from "./types";

const report: ManagementDashboard = {
  period: {
    fromDate: "2026-09-01",
    toDate: "2026-09-30",
    fromUtc: "",
    toUtcExclusive: "",
    timezone: "Europe/Bratislava",
    progressPercent: 36.67
  },
  dashboard: {
    turnover: 2405,
    salesTarget: 6000,
    salesAchievementPercent: 40.08,
    turnoverSource: "normalized_crm_orders",
    activeCustomers: 19,
    atRiskCustomers: 3,
    criticalCustomers: 4,
    reactivationCandidates: 2,
    reactivatedCustomers: 2,
    callsCompleted: 3,
    visitsCompleted: 1,
    b2bRegisteredCustomers: 12,
    b2bPenetrationPercent: 63.16,
    overdueTasks: 1,
    csToSalesHandoffs: 1,
    salesToCsHandoffs: 1
  },
  roles: [],
  users: [
    {
      userId: "usr-cs-001",
      userName: "Clara Support",
      role: "customer_service",
      attributedTurnover: 450,
      callsCompleted: 2,
      visitsCompleted: 0,
      completedTasks: 1,
      reactivations: 1,
      b2bActivations: 0,
      overall: { achievementPercent: 72, status: "ON_TRACK", totalWeight: 1 },
      kpis: [
        {
          kpiCode: "CS_CALLS",
          name: "Calls completed",
          metricType: "count",
          target: 10,
          actual: 2,
          achievementPercent: 20,
          weight: 0.15,
          weightedAchievementPercent: 3,
          status: "BEHIND",
          source: "customer_interactions where interaction_type = CALL",
          periodStart: "2026-09-01",
          periodEnd: "2026-09-30"
        }
      ]
    }
  ],
  meta: { attributionWindowDays: 30, reactivationDefinition: "deterministic" }
};

afterEach(() => vi.unstubAllGlobals());

describe("management dashboard frontend", () => {
  it("renders compact management metrics and explainable KPI rows", () => {
    const markup = renderToStaticMarkup(<ManagementDashboardView report={report} />);
    expect(markup).toContain("Firemný obrat");
    expect(markup).toContain("Plán vs. skutočnosť");
    expect(markup).toContain("Clara Support");
    expect(markup).toContain("CS_CALLS");
    expect(markup).toContain("Interakcie zákazníkov typu hovor");
    expect(markup).not.toContain("bonus");
  });

  it("parses dashboard success and API errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: report }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "BAD_REQUEST", message: "Invalid period." }
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchManagementDashboard({ period: "month", from: "", to: "", role: "", userId: "" })
    ).resolves.toMatchObject({ dashboard: { turnover: 2405 } });
    await expect(
      fetchManagementDashboard({ period: "custom", from: "bad", to: "bad", role: "", userId: "" })
    ).rejects.toThrow("Invalid period.");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "same-origin" });
  });

  it("finishes loading and renders one terminal state on success or failure", async () => {
    const filters = { period: "month", from: "", to: "", role: "", userId: "" } as const;
    await expect(loadDashboard(filters, async () => report)).resolves.toEqual({
      loading: false,
      report,
      error: null
    });
    const failed = await loadDashboard(filters, async () => {
      throw new Error("Dashboard unavailable.");
    });
    expect(failed).toEqual({
      loading: false,
      report: null,
      error: "Prehľad momentálne nie je dostupný."
    });
    const markup = renderToStaticMarkup(<DashboardContent {...failed} />);
    expect(markup.match(/Prehľad momentálne nie je dostupný\./g)).toHaveLength(1);
    expect(markup).not.toContain("Načítava sa prehľad");
  });
});
