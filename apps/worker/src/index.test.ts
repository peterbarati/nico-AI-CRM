import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import application, { createHealthResponse, type Env } from "./index";

interface SqliteStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown | undefined;
  run(...params: unknown[]): unknown;
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
}

interface DatabaseSyncConstructor {
  new (path: string): SqliteDatabase;
}

class TestD1Statement {
  private params: unknown[] = [];

  constructor(
    private readonly database: SqliteDatabase,
    private readonly sql: string
  ) {}

  bind(...params: unknown[]): TestD1Statement {
    this.params = params;
    return this;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return {
      results: this.database.prepare(this.sql).all(...this.params) as T[]
    };
  }

  async first<T>(): Promise<T | null> {
    return (this.database.prepare(this.sql).get(...this.params) as T | undefined) ?? null;
  }

  async run(): Promise<unknown> {
    return this.database.prepare(this.sql).run(...this.params);
  }
}

class TestD1Database {
  private readonly database: SqliteDatabase;

  constructor(applySalesWorkflowMigration = true) {
    const require = createRequire(import.meta.url);
    const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: DatabaseSyncConstructor };
    this.database = new DatabaseSync(":memory:");
    this.database.exec("PRAGMA foreign_keys = ON;");
    this.database.exec(readFileSync(join(process.cwd(), "migrations/0001_initial.sql"), "utf8"));
    this.database.exec(
      readFileSync(join(process.cwd(), "migrations/0002_interaction_idempotency.sql"), "utf8")
    );
    if (applySalesWorkflowMigration) {
      this.database.exec(
        readFileSync(join(process.cwd(), "migrations/0003_sales_workflow_links.sql"), "utf8")
      );
      this.database.exec(
        readFileSync(
          join(process.cwd(), "migrations/0004_deterministic_kpi_foundation.sql"),
          "utf8"
        )
      );
      this.database.exec(
        readFileSync(join(process.cwd(), "migrations/0005_ai_assistant_foundation.sql"), "utf8")
      );
      this.database.exec(
        readFileSync(join(process.cwd(), "migrations/0006_auth_foundation.sql"), "utf8")
      );
    }
    const seed = readFileSync(join(process.cwd(), "packages/db/seeds/demo.sql"), "utf8");
    this.database.exec(
      applySalesWorkflowMigration
        ? seed
        : seed
            .split("-- Deterministic KPI demo facts.")[0]
            .replace(/^UPDATE sales_visits SET source_task_id.*;\r?\n/gm, "")
    );
  }

  prepare(sql: string): TestD1Statement {
    return new TestD1Statement(this.database, sql);
  }

  async batch(statements: TestD1Statement[]): Promise<unknown[]> {
    this.database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function createTestEnv(applySalesWorkflowMigration = true): Env {
  return {
    ASSETS: {
      fetch: () => Promise.resolve(new Response("asset", { status: 200 }))
    },
    AUTH_MODE: "mock",
    DB: new TestD1Database(applySalesWorkflowMigration) as unknown as D1Database
  };
}

const worker = {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (
      url.pathname === "/api/health" ||
      url.pathname.startsWith("/api/auth/") ||
      request.headers.has("x-mock-user-id") ||
      request.headers.has("cookie")
    ) {
      return application.fetch(request, env);
    }
    const actorId =
      request.method === "POST" && /^\/api\/customers\/[^/]+\/interactions$/.test(url.pathname)
        ? "usr-cs-001"
        : request.method === "POST" && url.pathname.startsWith("/api/sales/")
          ? "usr-sales-002"
          : "usr-admin-001";
    const headers = new Headers(request.headers);
    headers.set("x-mock-user-id", actorId);
    return application.fetch(new Request(request, { headers }), env);
  }
};

afterEach(() => {
  vi.useRealTimers();
});

describe("createHealthResponse", () => {
  it("reports the API health in mock mode", () => {
    expect(createHealthResponse()).toMatchObject({
      ok: true,
      service: "nico-ai-crm-api",
      mode: "mock"
    });
  });
});

describe("customer service API", () => {
  it("returns the created handoff even while the next migration is pending", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const response = await postCall(createTestEnv(false), "cus-006", {
      followUpAt: "2026-09-22T10:00:00.000Z",
      idempotencyKey: "pre-migration-readback-001",
      nextAction: "SALES_VISIT",
      priority: "MEDIUM",
      reason: "REACTIVATION",
      result: "RESOLVED",
      salesRepUserId: "usr-sales-003"
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        interaction: { reason: "REACTIVATION", result: "RESOLVED" },
        task: { sourceVisitId: null, taskType: "handoff" }
      }
    });
  });
  it("returns a deterministic ranked queue response", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));

    const response = await worker.fetch(
      new Request("http://localhost/api/customer-service/queue?limit=5"),
      createTestEnv()
    );
    const body = (await response.json()) as {
      ok: true;
      data: {
        items: Array<{
          customerId: string;
          priority: { priorityLevel: string; reasons: Array<{ code: string }> };
        }>;
        summary: { dailyCallTarget: number; callsCompletedToday: number };
      };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.summary).toMatchObject({
      callsCompletedToday: 1,
      dailyCallTarget: 8
    });
    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.items[0]?.customerId).toBe("cus-006");
    expect(body.data.items[0]?.priority.reasons.length).toBeGreaterThan(0);
  });

  it("creates a call, linked follow-up task, and refreshed customer history", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const response = await postCall(env, "cus-007", {
      followUpAt: "2026-09-14T09:00:00.000Z",
      idempotencyKey: "test-follow-up-001",
      nextAction: "FOLLOW_UP_CALL",
      notes: "Customer asked for a callback after reviewing stock.",
      priority: "HIGH",
      reason: "B2B_REGISTRATION",
      result: "CALLBACK_REQUESTED"
    });
    const body = (await response.json()) as {
      ok: true;
      data: {
        interaction: { id: string; reason: string; result: string };
        task: { sourceInteractionId: string; assignedUser: { id: string } };
      };
    };

    expect(response.status).toBe(201);
    expect(body.data.interaction).toMatchObject({
      reason: "B2B_REGISTRATION",
      result: "CALLBACK_REQUESTED"
    });
    expect(body.data.task.sourceInteractionId).toBe(body.data.interaction.id);
    expect(body.data.task.assignedUser.id).toBe("usr-cs-001");

    const historyResponse = await worker.fetch(
      new Request("http://localhost/api/customers/cus-007/interactions?pageSize=10"),
      env
    );
    const history = (await historyResponse.json()) as {
      data: Array<{ id: string; notes: string }>;
    };
    expect(history.data[0]).toMatchObject({
      id: body.data.interaction.id,
      notes: "Customer asked for a callback after reviewing stock."
    });

    const queueResponse = await worker.fetch(
      new Request("http://localhost/api/customer-service/queue?limit=100"),
      env
    );
    const queue = (await queueResponse.json()) as {
      data: {
        items: Array<{ customerId: string; priority: { priorityScore: number } }>;
        summary: { callsCompletedToday: number };
      };
    };
    expect(queue.data.summary.callsCompletedToday).toBe(2);
    expect(
      queue.data.items.find((item) => item.customerId === "cus-007")?.priority.priorityScore
    ).toBeLessThan(25);
  });

  it("creates a Sales handoff linked to its source call", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const response = await postCall(env, "cus-003", {
      followUpAt: "2026-09-16T10:00:00.000Z",
      idempotencyKey: "test-sales-handoff-001",
      nextAction: "SALES_VISIT",
      notes: "Buyer needs an in-person assortment review.",
      priority: "CRITICAL",
      reason: "RETENTION",
      result: "NEEDS_SALES_VISIT",
      salesRepUserId: "usr-sales-002"
    });
    const body = (await response.json()) as {
      data: { interaction: { id: string }; task: { assignedUser: { id: string } } };
    };

    expect(response.status).toBe(201);
    expect(body.data.task.assignedUser.id).toBe("usr-sales-002");

    const salesResponse = await worker.fetch(new Request("http://localhost/api/sales/tasks"), env);
    const sales = (await salesResponse.json()) as {
      data: Array<{
        sourceInteractionId: string;
        sourceReason: string;
        sourceNotes: string;
        requestedBy: { id: string };
      }>;
    };
    expect(sales.data).toContainEqual(
      expect.objectContaining({
        requestedBy: expect.objectContaining({ id: "usr-cs-001" }),
        sourceInteractionId: body.data.interaction.id,
        sourceNotes: "Buyer needs an in-person assortment review.",
        sourceReason: "RETENTION"
      })
    );
  });

  it("rejects invalid call values and invalid Sales Representatives", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const invalidCode = await postCall(env, "cus-003", {
      idempotencyKey: "test-invalid-code",
      nextAction: "NONE",
      reason: "UNCONTROLLED_VALUE",
      result: "RESOLVED"
    });
    expect(invalidCode.status).toBe(400);
    expect((await invalidCode.clone().json()) as object).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        fields: expect.arrayContaining([expect.objectContaining({ field: "reason" })])
      }
    });

    const invalidRep = await postCall(env, "cus-003", {
      followUpAt: "2026-09-16T10:00:00.000Z",
      idempotencyKey: "test-invalid-sales-rep",
      nextAction: "SALES_VISIT",
      reason: "RETENTION",
      result: "NEEDS_SALES_VISIT",
      salesRepUserId: "usr-cs-002"
    });
    const body = (await invalidRep.json()) as { error: { code: string } };
    expect(invalidRep.status).toBe(422);
    expect(body.error.code).toBe("SALES_REP_NOT_FOUND");

    const missingCustomer = await postCall(env, "cus-missing", {
      idempotencyKey: "test-missing-customer",
      nextAction: "NONE",
      reason: "GENERAL",
      result: "RESOLVED"
    });
    expect(missingCustomer.status).toBe(404);
  });

  it("returns a structured 400 response for malformed JSON", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/customers/cus-001/interactions", {
        body: "{not-json",
        headers: { "content-type": "application/json" },
        method: "POST"
      }),
      createTestEnv()
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "BAD_REQUEST", message: "Request body must be valid JSON." }
    });
  });

  it("returns the original workflow for a duplicate submission", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const requestBody = {
      idempotencyKey: "test-idempotency-001",
      nextAction: "NONE",
      notes: "Resolved on first call.",
      reason: "GENERAL",
      result: "RESOLVED"
    };
    const first = await postCall(env, "cus-001", requestBody);
    const second = await postCall(env, "cus-001", requestBody);
    const firstBody = (await first.json()) as {
      data: { duplicate: boolean; interaction: { id: string } };
    };
    const secondBody = (await second.json()) as {
      data: { duplicate: boolean; interaction: { id: string } };
    };

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(firstBody.data.duplicate).toBe(false);
    expect(secondBody.data.duplicate).toBe(true);
    expect(secondBody.data.interaction.id).toBe(firstBody.data.interaction.id);

    const conflictingCustomer = await postCall(env, "cus-002", requestBody);
    expect(conflictingCustomer.status).toBe(409);
  });
});

describe("Sales visit workflow API", () => {
  it("schedules, starts, and completes a visit with a linked Customer Service follow-up", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const scheduleBody = {
      plannedAt: "2026-09-25T09:00:00.000Z",
      customerLocationId: "loc-008-main",
      notes: "Discuss coffee assortment.",
      idempotencyKey: "schedule-visit-test-001"
    };
    const scheduled = await postJson(env, "/api/sales/tasks/tsk-007/visits", scheduleBody);
    const scheduledBody = (await scheduled.json()) as {
      data: {
        duplicate: boolean;
        visit: { id: string; status: string; salesRep: { id: string } };
      };
    };
    expect(scheduled.status).toBe(201);
    expect(scheduledBody.data.visit.status).toBe("planned");
    expect(scheduledBody.data.visit.salesRep.id).toBe("usr-sales-002");

    const duplicate = await postJson(env, "/api/sales/tasks/tsk-007/visits", scheduleBody);
    expect(duplicate.status).toBe(200);
    expect(((await duplicate.json()) as { data: { duplicate: boolean } }).data.duplicate).toBe(
      true
    );

    const visitId = scheduledBody.data.visit.id;
    const started = await postJson(env, `/api/sales/visits/${visitId}/start`, {});
    expect(started.status).toBe(200);

    const completed = await postJson(env, `/api/sales/visits/${visitId}/complete`, {
      result: "INTERESTED",
      notes: "Send the coffee comparison and call next week.",
      nextAction: "CUSTOMER_SERVICE_CALL",
      followUpAt: "2026-09-18T09:00:00.000Z",
      priority: "HIGH",
      idempotencyKey: "complete-visit-test-001"
    });
    const completedBody = (await completed.json()) as {
      data: {
        visit: { status: string; nextAction: string };
        sourceTask: { status: string };
        followUpTask: { sourceVisitId: string; assignedUser: { id: string } };
      };
    };
    expect(completed.status).toBe(200);
    expect(completedBody.data.visit).toMatchObject({
      status: "completed",
      nextAction: "CUSTOMER_SERVICE_CALL"
    });
    expect(completedBody.data.sourceTask.status).toBe("completed");
    expect(completedBody.data.followUpTask).toMatchObject({
      sourceVisitId: visitId,
      assignedUser: { id: "usr-cs-001" }
    });

    const history = await worker.fetch(
      new Request("http://localhost/api/customers/cus-008/visits"),
      env
    );
    expect(((await history.json()) as { data: Array<{ id: string }> }).data[0]?.id).toBe(visitId);
  });

  it("rejects invalid transitions and reports activity by business period", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const completedVisitStart = await postJson(env, "/api/sales/visits/vis-004/start", {});
    expect(completedVisitStart.status).toBe(409);

    const report = await worker.fetch(
      new Request("http://localhost/api/reports/activity?period=today&role=customer_service"),
      env
    );
    const body = (await report.json()) as {
      data: { period: { timezone: string }; metrics: { callsCompleted: number }; users: unknown[] };
    };
    expect(report.status).toBe(200);
    expect(body.data.period.timezone).toBe("Europe/Bratislava");
    expect(body.data.metrics.callsCompleted).toBe(1);
    expect(body.data.users).toHaveLength(3);
  });
});

describe("management KPI API", () => {
  it("returns the monthly dashboard and explainable user KPI breakdown", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const response = await worker.fetch(
      new Request("http://localhost/api/dashboard?period=month"),
      createTestEnv()
    );
    const body = (await response.json()) as {
      data: {
        dashboard: { turnover: number; salesTarget: number };
        users: Array<{ userId: string; kpis: Array<{ kpiCode: string; source: string }> }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.dashboard).toMatchObject({ turnover: 2405, salesTarget: 6000 });
    expect(body.data.users.find((user) => user.userId === "usr-cs-001")?.kpis).toContainEqual(
      expect.objectContaining({
        kpiCode: "CS_REACTIVATIONS",
        source: expect.stringContaining("Attributed order")
      })
    );
  });

  it("supports role and user filters", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const roleResponse = await worker.fetch(
      new Request("http://localhost/api/kpi?period=month&role=sales_rep"),
      env
    );
    const roleBody = (await roleResponse.json()) as { data: { users: Array<{ role: string }> } };
    expect(roleBody.data.users).toHaveLength(3);
    expect(roleBody.data.users.every((user) => user.role === "sales_rep")).toBe(true);

    const userResponse = await worker.fetch(
      new Request("http://localhost/api/kpi/users/usr-sales-003?period=month"),
      env
    );
    expect((await userResponse.json()) as object).toMatchObject({
      ok: true,
      data: { user: { userId: "usr-sales-003", reactivations: 1 } }
    });
  });

  it("validates periods, ranges, roles, and missing users", async () => {
    const env = createTestEnv();
    const invalidPeriod = await worker.fetch(
      new Request("http://localhost/api/dashboard?period=quarter"),
      env
    );
    const invalidRange = await worker.fetch(
      new Request("http://localhost/api/dashboard?period=custom&from=2026-09-10&to=2026-09-01"),
      env
    );
    const invalidRole = await worker.fetch(
      new Request("http://localhost/api/kpi?role=manager"),
      env
    );
    const missingUser = await worker.fetch(
      new Request("http://localhost/api/kpi/users/missing"),
      env
    );

    expect(invalidPeriod.status).toBe(400);
    expect(invalidRange.status).toBe(400);
    expect(invalidRole.status).toBe(400);
    expect(missingUser.status).toBe(404);
  });
});

describe("AI assistant and settings API", () => {
  it("builds grounded mock assistance and reuses a matching cache entry", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const first = await postJson(env, "/api/ai/customer-assistant", {
      customerId: "cus-006",
      purpose: "CALL_PREPARATION"
    });
    const firstBody = (await first.json()) as {
      data: {
        status: string;
        assistance: { priorityExplanation: string };
        deterministic: { priority: { priorityLevel: string } };
        meta: { cached: boolean };
      };
    };
    expect(first.status).toBe(200);
    expect(firstBody.data).toMatchObject({
      status: "READY",
      meta: { cached: false },
      deterministic: { priority: { priorityLevel: "CRITICAL" } }
    });
    expect(firstBody.data.assistance.priorityExplanation).toContain("expected reorder interval");

    const second = await postJson(env, "/api/ai/customer-assistant", {
      customerId: "cus-006",
      purpose: "CALL_PREPARATION"
    });
    expect((await second.json()) as object).toMatchObject({ data: { meta: { cached: true } } });
  });

  it("returns safe disabled and missing OpenAI configuration states", async () => {
    const env = createTestEnv();
    await patchJson(env, "/api/settings", { values: { "ai.enabled": "false" } });
    const disabled = await postJson(env, "/api/ai/customer-assistant", { customerId: "cus-002" });
    expect((await disabled.json()) as object).toMatchObject({
      data: { status: "DISABLED", assistance: null }
    });

    await patchJson(env, "/api/settings", {
      values: { "ai.enabled": "true", "ai.provider": "OPENAI" }
    });
    const unavailable = await postJson(env, "/api/ai/customer-assistant", {
      customerId: "cus-002"
    });
    expect((await unavailable.json()) as object).toMatchObject({
      data: { status: "UNAVAILABLE", assistance: null }
    });
  });

  it("reads, validates, and applies allowlisted settings to live rules and KPI targets", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const settings = await worker.fetch(new Request("http://localhost/api/settings"), env);
    expect((await settings.json()) as object).toMatchObject({
      data: { aiAvailability: { provider: "MOCK", configured: true } }
    });

    const invalidThreshold = await patchJson(env, "/api/settings", {
      values: { "customer_service.at_risk_days": 100 }
    });
    const invalidTimezone = await patchJson(env, "/api/settings", {
      values: { "system.business_timezone": "Invalid/Zone" }
    });
    const arbitrary = await patchJson(env, "/api/settings", {
      values: { "secret.api_key": "nope" }
    });
    expect(invalidThreshold.status).toBe(400);
    expect(invalidTimezone.status).toBe(400);
    expect(arbitrary.status).toBe(400);

    const updated = await patchJson(env, "/api/settings", {
      values: { "customer_service.daily_call_target": 12 }
    });
    expect(updated.status).toBe(200);
    const queue = await worker.fetch(
      new Request("http://localhost/api/customer-service/queue"),
      env
    );
    expect((await queue.json()) as object).toMatchObject({
      data: { summary: { dailyCallTarget: 12 } }
    });

    const targetUpdate = await patchJson(env, "/api/settings", {
      companyTargets: [{ id: "company-sales-sep-2026", targetValue: 7000 }]
    });
    expect(targetUpdate.status).toBe(200);
    const dashboard = await worker.fetch(
      new Request("http://localhost/api/dashboard?period=month"),
      env
    );
    expect((await dashboard.json()) as object).toMatchObject({
      data: { dashboard: { salesTarget: 7000 } }
    });
  });

  it("rejects invalid KPI weights and AI requests", async () => {
    const env = createTestEnv();
    const weights = await patchJson(env, "/api/settings", {
      kpiTargets: [{ id: "kpit-cs-turnover-sep", targetValue: 1500, weight: 0.9 }]
    });
    const missingCustomer = await postJson(env, "/api/ai/customer-assistant", {});
    const unknownCustomer = await postJson(env, "/api/ai/customer-assistant", {
      customerId: "missing"
    });
    expect(weights.status).toBe(400);
    expect(missingCustomer.status).toBe(400);
    expect(unknownCustomer.status).toBe(404);
  });
});

describe("authentication and authorization", () => {
  it("returns shared success contracts for mock auth bootstrap endpoints", async () => {
    const env = createTestEnv();
    const config = await application.fetch(new Request("http://localhost/api/auth/config"), env);
    const users = await application.fetch(new Request("http://localhost/api/auth/mock-users"), env);
    expect(config.status).toBe(200);
    expect(config.headers.get("content-type")).toContain("application/json");
    expect(await config.json()).toEqual({
      ok: true,
      data: { mode: "MOCK", loginUrl: null, logoutUrl: null }
    });
    expect(users.status).toBe(200);
    expect(await users.json()).toMatchObject({
      ok: true,
      data: expect.arrayContaining([
        expect.objectContaining({ role: "admin" }),
        expect.objectContaining({ role: "manager" }),
        expect.objectContaining({ role: "customer_service" }),
        expect.objectContaining({ role: "sales_rep" })
      ])
    });
  });

  it("returns 401 without an identity and fails closed when OIDC is incomplete", async () => {
    const env = createTestEnv();
    const unauthenticated = await application.fetch(
      new Request("http://localhost/api/customers"),
      env
    );
    const misconfigured = await application.fetch(
      new Request("http://localhost/api/customers", {
        headers: { authorization: "Bearer malformed" }
      }),
      { ...env, AUTH_MODE: "oidc" }
    );
    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "Authentication required." }
    });
    expect(misconfigured.status).toBe(503);
    expect(await misconfigured.json()).toMatchObject({
      error: { code: "AUTH_CONFIGURATION_ERROR" }
    });
  });

  it("returns the safe current actor and rejects inactive users", async () => {
    const env = createTestEnv();
    const admin = await application.fetch(actorRequest("/api/auth/me", "usr-admin-001"), env);
    const inactive = await application.fetch(actorRequest("/api/auth/me", "usr-inactive-001"), env);
    expect(await admin.json()).toMatchObject({
      data: {
        id: "usr-admin-001",
        role: "admin",
        permissions: expect.arrayContaining(["SETTINGS_WRITE", "USER_ADMIN"])
      }
    });
    expect(inactive.status).toBe(403);
    expect(await inactive.json()).toMatchObject({ error: { code: "INACTIVE_USER" } });
  });

  it("enforces role permissions for settings, AI, and operational routes", async () => {
    const env = createTestEnv();
    const managerWrite = await application.fetch(
      actorRequest("/api/settings", "usr-manager-001", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: { "customer_service.daily_call_target": 99 } })
      }),
      env
    );
    const salesSettings = await application.fetch(
      actorRequest("/api/settings", "usr-sales-001"),
      env
    );
    const customerServiceAi = await application.fetch(
      actorRequest("/api/ai/customer-assistant", "usr-cs-001", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerId: "cus-006" })
      }),
      env
    );
    const customerServiceSalesQueue = await application.fetch(
      actorRequest("/api/sales/tasks", "usr-cs-001"),
      env
    );
    expect(managerWrite.status).toBe(403);
    expect(salesSettings.status).toBe(403);
    expect(customerServiceAi.status).toBe(200);
    expect(customerServiceSalesQueue.status).toBe(403);
  });

  it("uses authenticated actors for writes and scopes Sales data", async () => {
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const env = createTestEnv();
    const call = await application.fetch(
      actorRequest("/api/customers/cus-006/interactions", "usr-cs-002", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: "auth-call-001",
          reason: "REACTIVATION",
          result: "RESOLVED",
          nextAction: "NONE"
        })
      }),
      env
    );
    const callBody = (await call.json()) as { data: { interaction: { user: { id: string } } } };
    expect(callBody.data.interaction.user.id).toBe("usr-cs-002");

    const scopedList = await application.fetch(
      actorRequest("/api/customers?pageSize=100", "usr-sales-001"),
      env
    );
    const listBody = (await scopedList.json()) as {
      data: Array<{ assignedSalesRep: { id: string } | null }>;
    };
    expect(listBody.data.length).toBeGreaterThan(0);
    expect(listBody.data.every((item) => item.assignedSalesRep?.id === "usr-sales-001")).toBe(true);
    const forbiddenCustomer = await application.fetch(
      actorRequest("/api/customers/cus-004", "usr-sales-001"),
      env
    );
    expect(forbiddenCustomer.status).toBe(403);
  });

  it("supports an explicit mock login cookie and protects user administration", async () => {
    const env = createTestEnv();
    const login = await application.fetch(
      new Request("http://localhost/api/auth/mock-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "usr-manager-001" })
      }),
      env
    );
    const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
    const me = await application.fetch(
      new Request("http://localhost/api/auth/me", { headers: { cookie } }),
      env
    );
    const managerUsers = await application.fetch(
      actorRequest("/api/admin/users", "usr-manager-001"),
      env
    );
    const adminUsers = await application.fetch(
      actorRequest("/api/admin/users", "usr-admin-001"),
      env
    );
    expect(login.status).toBe(200);
    expect(await me.json()).toMatchObject({ data: { id: "usr-manager-001" } });
    expect(managerUsers.status).toBe(403);
    expect(adminUsers.status).toBe(200);
  });
});

function postCall(env: Env, customerId: string, body: unknown): Promise<Response> {
  return worker.fetch(
    new Request(`http://localhost/api/customers/${customerId}/interactions`, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST"
    }),
    env
  );
}

function actorRequest(path: string, userId: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers);
  headers.set("x-mock-user-id", userId);
  return new Request(`http://localhost${path}`, { ...init, headers });
}

function postJson(env: Env, path: string, body: unknown): Promise<Response> {
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST"
    }),
    env
  );
}

function patchJson(env: Env, path: string, body: unknown): Promise<Response> {
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "PATCH"
    }),
    env
  );
}
