import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateCreateCallRequest } from "@nico-ai-crm/shared";
import { SalesQueueTable } from "../sales/SalesQueueTable";
import { createCustomerCall } from "./interaction-api";
import { LogCallForm } from "./LogCallForm";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("call workflow frontend", () => {
  it("renders the reusable controlled call form", () => {
    const markup = renderToStaticMarkup(
      <LogCallForm
        customerId="cus-002"
        customerName="Blue Pine Stores"
        onCancel={() => undefined}
        onSuccess={() => undefined}
        suggestedReason="REORDER"
      />
    );

    expect(markup).toContain("Zapísať hovor");
    expect(markup).toContain("Blue Pine Stores");
    expect(markup).toContain("Dôvod hovoru");
    expect(markup).toContain("Výsledok hovoru");
    expect(markup).toContain("Ďalší krok");
    expect(markup).toContain("Uložiť hovor");
    expect(markup).toContain('value="REORDER"');
    expect(markup).toContain("Doplnenie zásob");
  });

  it("uses the shared rules for follow-up validation", () => {
    const result = validateCreateCallRequest(
      {
        idempotencyKey: "frontend-test-001",
        nextAction: "FOLLOW_UP_CALL",
        reason: "GENERAL",
        result: "CALLBACK_REQUESTED"
      },
      new Date("2026-09-11T12:00:00.000Z")
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toContainEqual(expect.objectContaining({ field: "followUpAt" }));
    }
  });

  it("surfaces API errors and returns successful write state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "INVALID_ASSIGNEE", message: "Selected user is invalid." }
          }),
          { status: 422, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: { duplicate: false, interaction: { id: "int-new" }, task: null }
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const request = {
      idempotencyKey: "frontend-test-002",
      nextAction: "NONE" as const,
      reason: "GENERAL" as const,
      result: "RESOLVED" as const
    };
    await expect(createCustomerCall("cus-002", request)).rejects.toThrow(
      "Selected user is invalid."
    );
    await expect(createCustomerCall("cus-002", request)).resolves.toMatchObject({
      duplicate: false,
      interaction: { id: "int-new" },
      task: null
    });
  });

  it("accepts idempotent 200 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: { duplicate: true, interaction: { id: "int-existing" }, task: null }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    await expect(
      createCustomerCall("cus-002", {
        idempotencyKey: "frontend-idempotent-001",
        nextAction: "NONE",
        reason: "GENERAL",
        result: "RESOLVED"
      })
    ).resolves.toMatchObject({ duplicate: true, interaction: { id: "int-existing" } });
  });

  it.each([
    [400, "Invalid call values."],
    [404, "Customer not found."],
    [409, "Idempotency key conflict."]
  ])("surfaces structured %i API errors", async (status, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: { code: "TEST_ERROR", message } }), {
          status,
          headers: { "content-type": "application/json" }
        })
      )
    );

    await expect(
      createCustomerCall("cus-002", {
        idempotencyKey: "frontend-error-test-001",
        nextAction: "NONE",
        reason: "GENERAL",
        result: "RESOLVED"
      })
    ).rejects.toThrow(message);
  });

  it("reports non-JSON and malformed success responses predictably", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Worker crashed", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", fetchMock);
    const request = {
      idempotencyKey: "frontend-response-test-001",
      nextAction: "NONE" as const,
      reason: "GENERAL" as const,
      result: "RESOLVED" as const
    };

    await expect(createCustomerCall("cus-002", request)).rejects.toThrow(
      "The CRM service is temporarily unavailable."
    );
    await expect(createCustomerCall("cus-002", request)).rejects.toThrow(
      "The CRM service returned an invalid response."
    );
  });

  it("renders the Sales queue with source call context", () => {
    const markup = renderToStaticMarkup(
      <SalesQueueTable
        items={[
          {
            assignedUser: {
              id: "usr-sales-002",
              name: "Lucia Route",
              email: "lucia@example.test",
              role: "sales_rep"
            },
            context: "Customer Service handoff.",
            createdAt: "2026-09-11T12:00:00.000Z",
            customerCity: "Trnava",
            customerId: "cus-003",
            customerName: "Cedar Office Supply",
            dueAt: "2026-09-16T10:00:00.000Z",
            id: "tsk-new",
            priority: "urgent",
            requestedBy: {
              id: "usr-cs-001",
              name: "Clara Support",
              email: "clara@example.test",
              role: "customer_service"
            },
            sourceInteractionId: "int-new",
            sourceNextAction: "SALES_VISIT",
            sourceNotes: "Buyer needs an assortment review.",
            sourceReason: "RETENTION",
            sourceResult: "NEEDS_SALES_VISIT",
            status: "open",
            taskType: "handoff",
            title: "Sales visit handoff",
            visit: null
          }
        ]}
        onOpenTask={() => undefined}
      />
    );

    expect(markup).toContain("Cedar Office Supply");
    expect(markup).toContain("Buyer needs an assortment review.");
    expect(markup).toContain("Požiadavku zadal používateľ Clara Support");
    expect(markup).toContain("Otvoriť úlohu");
  });
});
