import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { createHealthResponse, type Env } from "./index";

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
    DB: new TestD1Database(applySalesWorkflowMigration) as unknown as D1Database
  };
}

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
      data: { duplicate: boolean; visit: { id: string; status: string } };
    };
    expect(scheduled.status).toBe(201);
    expect(scheduledBody.data.visit.status).toBe("planned");

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
