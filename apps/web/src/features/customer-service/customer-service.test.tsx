import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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

    expect(summaryMarkup).toContain("Today&#x27;s call target");
    expect(summaryMarkup).toContain("3 / 8");
    expect(tableMarkup).toContain("Blue Pine Stores");
    expect(tableMarkup).toContain("Critical");
    expect(tableMarkup).toContain("REORDER_DUE");
    expect(tableMarkup).toContain("Open profile");
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

    expect(markup).toContain("No calls queued");
  });

  it("renders the error state", () => {
    const markup = renderToStaticMarkup(<CustomerServiceErrorState message="Queue unavailable" />);

    expect(markup).toContain("Customer Service API error");
    expect(markup).toContain("Queue unavailable");
  });
});
