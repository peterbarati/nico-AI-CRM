import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCustomerServiceQueue } from "./api";
import { loadCustomerServiceQueue } from "./CustomerServicePage";
import { CustomerServiceErrorState } from "./CustomerServiceErrorState";
import { CustomerServiceQueueTable } from "./CustomerServiceQueueTable";
import { CustomerServiceSummaryCards } from "./CustomerServiceSummaryCards";
import type { CustomerServiceQueueItem, CustomerServiceSummary } from "./types";

const summary: CustomerServiceSummary = {
  callsCompletedToday: 3,
  callsRemaining: 5,
  criticalCustomers: 2,
  dailyCallTarget: 8,
  highPriorityCustomers: 4,
  overdueFollowUps: 1,
  reactivationCandidates: 1
};

const queueItem: CustomerServiceQueueItem = {
  active: true,
  assignedSalesRep: {
    email: "sales@example.test",
    id: "usr-sales-001",
    name: "Peter Field",
    role: "sales_rep"
  },
  averageReorderDays: 30,
  b2bStatus: "registered",
  campaignClickedWithoutConversion: false,
  city: "Zilina",
  companyName: "Blue Pine Stores",
  contactName: "Marek Blue",
  country: "SK",
  customerId: "cus-002",
  daysSinceLastOrder: 90,
  email: "marek@blue-pine.test",
  lastInteraction: {
    createdAt: "2026-09-08T09:00:00.000Z",
    id: "int-001",
    interactionType: "CALL",
    reason: "Reorder reminder",
    result: "No answer"
  },
  lastOrderDate: "2026-06-12",
  openTaskCount: 1,
  overdueTaskCount: 0,
  phone: "+421900100002",
  previousTurnover90d: 0,
  priority: {
    customerId: "cus-002",
    primaryRecommendedAction: "REACTIVATION",
    priorityLevel: "CRITICAL",
    priorityScore: 95,
    reasons: [
      {
        code: "REORDER_OVERDUE",
        message: "Customer is 53 days past expected reorder interval.",
        scoreImpact: 35,
        severity: "CRITICAL",
        value: 53
      }
    ],
    recommendedActions: ["REACTIVATION", "REORDER"],
    shouldContact: true
  },
  salesTrend: "new",
  segments: [
    {
      code: "REORDER_DUE",
      id: "seg-reorder-due",
      name: "Reorder Due",
      reason: "No order after expected reorder interval.",
      score: 81
    }
  ],
  turnover90d: 410
};

afterEach(() => vi.unstubAllGlobals());

describe("customer service frontend rendering", () => {
  it("renders daily target and queue priority information", () => {
    const summaryMarkup = renderToStaticMarkup(<CustomerServiceSummaryCards summary={summary} />);
    const tableMarkup = renderToStaticMarkup(
      <CustomerServiceQueueTable
        items={[queueItem]}
        onLogCall={() => undefined}
        onOpenCustomer={() => undefined}
        onPrepareCall={() => undefined}
      />
    );

    expect(summaryMarkup).toContain("Denný cieľ hovorov");
    expect(summaryMarkup).toContain("3 / 8");
    expect(tableMarkup).toContain("Blue Pine Stores");
    expect(tableMarkup).toContain("Kritická");
    expect(tableMarkup).toContain("Čas na doobjednanie");
    expect(tableMarkup).toContain("Otvoriť profil");
  });

  it("renders the empty queue state", () => {
    const markup = renderToStaticMarkup(
      <CustomerServiceQueueTable
        items={[]}
        onLogCall={() => undefined}
        onOpenCustomer={() => undefined}
        onPrepareCall={() => undefined}
      />
    );

    expect(markup).toContain("Žiadne hovory na vybavenie");
  });

  it("renders the error state", () => {
    const markup = renderToStaticMarkup(<CustomerServiceErrorState message="Queue unavailable" />);

    expect(markup).toContain("Zákaznícky servis nie je dostupný");
    expect(markup).toContain("Queue unavailable");
    expect(markup.match(/Queue unavailable/g)).toHaveLength(1);
  });

  it("loads the authenticated queue through the shared API client", async () => {
    const data = {
      items: [queueItem],
      summary,
      meta: {
        generatedAt: "2026-09-13T10:00:00.000Z",
        limit: 20,
        evaluatedCandidates: 1,
        returned: 1
      }
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchCustomerServiceQueue()).resolves.toEqual(data);
    expect(fetchMock).toHaveBeenCalledWith("/api/customer-service/queue", {
      credentials: "same-origin"
    });
  });

  it("clears loading on success and failure", async () => {
    const data = {
      items: [queueItem],
      summary,
      meta: {
        generatedAt: "2026-09-13T10:00:00.000Z",
        limit: 20,
        evaluatedCandidates: 1,
        returned: 1
      }
    };
    await expect(loadCustomerServiceQueue(async () => data)).resolves.toEqual({
      loading: false,
      data,
      error: null
    });
    await expect(
      loadCustomerServiceQueue(async () => {
        throw new Error("Queue unavailable");
      })
    ).resolves.toEqual({
      loading: false,
      data: null,
      error: "Zoznam zákazníckeho servisu nie je dostupný."
    });
  });
});
