import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildCustomerSearchParams, defaultCustomerFilters } from "./api";
import { CustomerDetailHeader } from "./CustomerDetailHeader";
import { CustomerMetricsCards } from "./CustomerMetricsCards";
import { CustomerTable } from "./CustomerTable";
import { SegmentBadges } from "./SegmentBadges";
import type { CustomerListItem, CustomerOverview } from "./types";

const customer: CustomerListItem = {
  active: true,
  assignedSalesRep: {
    email: "sales@example.com",
    id: "usr-sales-002",
    name: "Eva Sales",
    role: "sales_rep"
  },
  b2bStatus: "registered",
  city: "Bratislava",
  companyName: "Blue Pine Stores",
  contactName: "Jana Buyer",
  country: "SK",
  daysSinceLastOrder: 17,
  email: "jana@example.com",
  externalId: "erp-001",
  id: "cus-001",
  lastInteraction: {
    createdAt: "2026-08-20T10:00:00.000Z",
    id: "int-001",
    interactionType: "CALL",
    reason: "Reorder",
    result: "Requested offer"
  },
  lastOrderDate: "2026-08-22",
  openTaskCount: 2,
  phone: "+421 900 000 000",
  previousTurnover90d: 8500,
  salesTrend: "up",
  segments: [
    {
      code: "REORDER_DUE",
      id: "seg-001",
      name: "Reorder due",
      reason: "Usual reorder interval elapsed",
      score: 0.82
    }
  ],
  turnover365d: 42000,
  turnover90d: 12000,
  updatedAt: "2026-09-01T10:00:00.000Z"
};

const overview: CustomerOverview = {
  customer,
  latestInteractions: [],
  latestOrders: [],
  locations: [],
  metrics: {
    averageOrderValue: 1400,
    averageReorderDays: 28,
    customerId: customer.id,
    daysSinceLastOrder: 17,
    firstOrderDate: "2025-03-02",
    lastOrderDate: "2026-08-22",
    lifetimeOrderCount: 22,
    lifetimeTurnover: 96000,
    orderCount30d: 1,
    orderCount90d: 8,
    orderCount365d: 22,
    previousTurnover90d: 8500,
    turnover30d: 1400,
    turnover90d: 12000,
    turnover365d: 42000,
    updatedAt: "2026-09-01T10:00:00.000Z"
  },
  openTasks: [],
  segments: [
    {
      ...customer.segments[0],
      active: true,
      assignedAt: "2026-08-01",
      description: "Customer should be contacted for reorder.",
      expiresAt: null,
      system: true
    }
  ]
};

describe("customer frontend helpers", () => {
  it("builds server-side customer list filter parameters", () => {
    const params = buildCustomerSearchParams({
      ...defaultCustomerFilters,
      active: "true",
      assignedSalesRepId: "usr-sales-002",
      b2bStatus: "registered",
      page: 3,
      search: "Blue Pine",
      segmentCode: "REORDER_DUE",
      sort: "turnover_90d"
    });

    expect(params.get("search")).toBe("Blue Pine");
    expect(params.get("active")).toBe("true");
    expect(params.get("assignedSalesRepId")).toBe("usr-sales-002");
    expect(params.get("b2bStatus")).toBe("registered");
    expect(params.get("segmentCode")).toBe("REORDER_DUE");
    expect(params.get("page")).toBe("3");
    expect(params.get("sort")).toBe("turnover_90d");
  });
});

describe("customer frontend rendering", () => {
  it("renders customer rows with commercial CRM status", () => {
    const markup = renderToStaticMarkup(
      <CustomerTable customers={[customer]} onOpenCustomer={() => undefined} />
    );

    expect(markup).toContain("Jana Buyer");
    expect(markup).toContain("Eva Sales");
    expect(markup).toContain("REORDER_DUE");
    expect(markup).toContain("Up");
  });

  it("renders segment badges and empty state", () => {
    expect(renderToStaticMarkup(<SegmentBadges segments={customer.segments} />)).toContain(
      "REORDER_DUE"
    );
    expect(renderToStaticMarkup(<SegmentBadges segments={[]} />)).toContain("No active segments");
  });

  it("renders customer detail header and commercial metrics", () => {
    const header = renderToStaticMarkup(
      <CustomerDetailHeader onBack={() => undefined} overview={overview} />
    );
    const metrics = renderToStaticMarkup(
      <CustomerMetricsCards metrics={overview.metrics} salesTrend={overview.customer.salesTrend} />
    );

    expect(header).toContain("Blue Pine");
    expect(header).toContain("Log call");
    expect(metrics).toContain("Turnover 90d");
    expect(metrics).toContain("Sales trend");
    expect(metrics).toContain("Lifetime turnover");
  });
});
