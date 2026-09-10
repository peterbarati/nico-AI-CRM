import { describe, expect, it } from "vitest";
import { MockERPProvider, MoneyS4Provider } from "./index";

describe("MockERPProvider", () => {
  it("returns deterministic demo customers without external connections", async () => {
    const provider = new MockERPProvider();

    await expect(provider.getCustomers()).resolves.toEqual({
      ok: true,
      data: [
        {
          externalId: "demo-customer-1",
          displayName: "NICO Demo Customer",
          email: "demo@example.com",
          phone: "+421900000000",
          companyRegistrationNumber: "12345678",
          taxRegistrationNumber: "SK1234567890",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
  });

  it("supports future incremental customer synchronization", async () => {
    const provider = new MockERPProvider();

    await expect(
      provider.getCustomersUpdatedSince(new Date("2026-01-02T00:00:00.000Z"))
    ).resolves.toEqual({
      ok: true,
      data: []
    });
  });

  it("returns a customer by stable external ID", async () => {
    const provider = new MockERPProvider();

    await expect(provider.getCustomerByExternalId("demo-customer-1")).resolves.toMatchObject({
      ok: true,
      data: {
        externalId: "demo-customer-1"
      }
    });
  });
});

describe("MoneyS4Provider", () => {
  it("is a Phase 2 placeholder with no real connection behavior", async () => {
    const provider = new MoneyS4Provider();

    await expect(provider.getCustomers()).resolves.toEqual({
      ok: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Money S4 ERP provider belongs to Phase 2 and has no connection logic yet."
      }
    });
  });
});
