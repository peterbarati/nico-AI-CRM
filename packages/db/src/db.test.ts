import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  createDatabaseContext,
  countCompletedCustomerServiceCallsToday,
  getCustomerOverview,
  getManagementKpiData,
  getSystemConfigByPrefix,
  createOperationalTask,
  getTaskDetail,
  listCustomerServiceCandidates,
  listCustomerOrders,
  listCustomers,
  listSegments,
  listOperationalTasks,
  transitionOperationalTask,
  updateOperationalTask,
  TaskWriteError
} from "./index";

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

  constructor() {
    const require = createRequire(import.meta.url);
    const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: DatabaseSyncConstructor };
    this.database = new DatabaseSync(":memory:");
    this.database.exec("PRAGMA foreign_keys = ON;");
    this.database.exec(readFileSync(join(process.cwd(), "migrations/0001_initial.sql"), "utf8"));
    this.database.exec(
      readFileSync(join(process.cwd(), "migrations/0002_interaction_idempotency.sql"), "utf8")
    );
    this.database.exec(
      readFileSync(join(process.cwd(), "migrations/0003_sales_workflow_links.sql"), "utf8")
    );
    this.database.exec(
      readFileSync(join(process.cwd(), "migrations/0004_deterministic_kpi_foundation.sql"), "utf8")
    );
    this.database.exec(
      readFileSync(join(process.cwd(), "migrations/0005_ai_assistant_foundation.sql"), "utf8")
    );
    this.database.exec(
      readFileSync(join(process.cwd(), "migrations/0006_auth_foundation.sql"), "utf8")
    );
    this.database.exec(
      readFileSync(join(process.cwd(), "migrations/0007_user_management.sql"), "utf8")
    );
    this.database.exec(
      readFileSync(join(process.cwd(), "migrations/0008_tasks_operational_module.sql"), "utf8")
    );
  }

  exec(sql: string): void {
    this.database.exec(sql);
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

function createSeededContext() {
  const db = new TestD1Database();
  db.exec(readFileSync(join(process.cwd(), "packages/db/seeds/demo.sql"), "utf8"));
  return createDatabaseContext(db as unknown as D1Database);
}

describe("D1 schema and seed data", () => {
  it("passes SQLite-compatible migration, seed, integrity, and query smoke checks", () => {
    const output = execFileSync("node", ["packages/db/test-utils/sqlite-smoke.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(JSON.parse(output)).toMatchObject({
      tables: 23,
      customers: 20,
      users: 9,
      segments: 9,
      search: ["cus-002"],
      orders: ["ord-002", "ord-001"]
    });
  });
});

describe("operational task repositories", () => {
  const clock = {
    nowUtc: "2026-09-11T12:00:00.000Z",
    businessDayFromUtc: "2026-09-10T22:00:00.000Z",
    businessDayToUtc: "2026-09-11T22:00:00.000Z"
  };

  it("filters, sorts, and paginates the operational queue", async () => {
    const context = createSeededContext();
    const search = await listOperationalTasks(context, {
      ...clock,
      search: "Blue Pine",
      pageSize: 1
    });
    const overdue = await listOperationalTasks(context, { ...clock, due: "overdue" });
    const today = await listOperationalTasks(context, { ...clock, due: "today" });
    const assigned = await listOperationalTasks(context, {
      ...clock,
      assignedUserId: "usr-cs-001",
      priority: "high"
    });
    const team = await listOperationalTasks(context, {
      ...clock,
      assignedRole: "sales_rep"
    });

    expect(search.pagination).toMatchObject({ page: 1, pageSize: 1, total: 1 });
    expect(search.items[0]?.customerName).toBe("Blue Pine Stores");
    expect(overdue.items.every((task) => task.overdue)).toBe(true);
    expect(today.items.map((task) => task.id)).toContain("tsk-004");
    expect(
      assigned.items.every(
        (task) => task.assignedUser.id === "usr-cs-001" && task.priority === "high"
      )
    ).toBe(true);
    expect(team.items.every((task) => task.assignedUser.role === "sales_rep")).toBe(true);
  });

  it("creates, reschedules, reassigns, and audits a manual task", async () => {
    const context = createSeededContext();
    const task = await createOperationalTask(context, {
      id: "tsk-manual-test",
      eventId: "evt-create",
      actorUserId: "usr-manager-001",
      assignedUserId: "usr-cs-001",
      customerId: "cus-001",
      customerLocationId: "loc-001-main",
      title: "Manual test",
      description: null,
      operationalType: "CUSTOMER_SERVICE",
      priority: "normal",
      dueAt: "2026-09-12T08:00:00.000Z",
      createdAt: clock.nowUtc
    });
    expect(task).toMatchObject({ sourceOrigin: "MANUAL", operationalType: "CUSTOMER_SERVICE" });

    const updated = await updateOperationalTask(context, {
      taskId: task.id,
      eventId: "evt-update",
      actorUserId: "usr-manager-001",
      assignedUserId: "usr-cs-002",
      dueAt: "2026-09-13T08:00:00.000Z",
      updatedAt: "2026-09-11T13:00:00.000Z"
    });
    const detail = await getTaskDetail(context, task.id, clock.nowUtc);
    expect(updated.assignedUser.id).toBe("usr-cs-002");
    expect(detail?.events.map((event) => event.eventType)).toEqual(["RESCHEDULED", "CREATED"]);
  });

  it("rejects inactive assignees and invalid state transitions while keeping completion idempotent", async () => {
    const context = createSeededContext();
    await expect(
      createOperationalTask(context, {
        id: "tsk-invalid",
        eventId: "evt-invalid",
        actorUserId: "usr-admin-001",
        assignedUserId: "usr-inactive-001",
        customerId: null,
        customerLocationId: null,
        title: "Invalid",
        description: null,
        operationalType: "OTHER",
        priority: "low",
        dueAt: null,
        createdAt: clock.nowUtc
      })
    ).rejects.toMatchObject({ code: "ASSIGNEE_INVALID" });

    const first = await transitionOperationalTask(context, {
      taskId: "tsk-001",
      eventId: "evt-complete",
      actorUserId: "usr-cs-001",
      status: "completed",
      updatedAt: clock.nowUtc
    });
    const duplicate = await transitionOperationalTask(context, {
      taskId: "tsk-001",
      eventId: "evt-complete-duplicate",
      actorUserId: "usr-cs-001",
      status: "completed",
      updatedAt: clock.nowUtc
    });
    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    await expect(
      transitionOperationalTask(context, {
        taskId: "tsk-001",
        eventId: "evt-cancel",
        actorUserId: "usr-cs-001",
        status: "cancelled",
        updatedAt: clock.nowUtc
      })
    ).rejects.toBeInstanceOf(TaskWriteError);
  });

  it("cancels an open task without setting a completion timestamp", async () => {
    const context = createSeededContext();
    const cancelled = await transitionOperationalTask(context, {
      taskId: "tsk-002",
      eventId: "evt-cancel-open",
      actorUserId: "usr-cs-002",
      status: "cancelled",
      updatedAt: clock.nowUtc
    });
    const detail = await getTaskDetail(context, "tsk-002", clock.nowUtc);

    expect(cancelled).toMatchObject({ duplicate: false, task: { status: "cancelled" } });
    expect(cancelled.task.completedAt).toBeNull();
    expect(detail?.events[0]?.eventType).toBe("CANCELLED");
  });

  it("returns structured source context for calls and visits", async () => {
    const context = createSeededContext();
    await context.db
      .prepare(
        `INSERT INTO tasks (
        id, customer_id, customer_location_id, assigned_user_id, created_by_user_id,
        source_interaction_id, title, task_type, priority, status, created_at, updated_at,
        source_visit_id, operational_type, source_origin
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, 'call', 'normal', 'open', ?, ?, ?, 'FOLLOW_UP_CALL', 'SALES_TO_CS_HANDOFF')`
      )
      .bind(
        "tsk-visit-context",
        "cus-001",
        "loc-001-main",
        "usr-cs-001",
        "usr-sales-001",
        "Visit follow-up",
        clock.nowUtc,
        clock.nowUtc,
        "vis-001"
      )
      .run();
    const call = await getTaskDetail(context, "tsk-001", clock.nowUtc);
    const visit = await getTaskDetail(context, "tsk-visit-context", clock.nowUtc);
    expect(call?.task.sourceContext.interaction).toMatchObject({
      id: "int-001",
      result: "No answer"
    });
    expect(visit?.task.sourceContext.visit).toMatchObject({ id: "vis-001", orderValue: 0 });
  });
});

describe("management KPI repositories", () => {
  const query = {
    attributionWindowDays: 30,
    businessDate: "2026-09-11",
    nowUtc: "2026-09-11T12:00:00.000Z",
    range: {
      fromDate: "2026-09-01",
      toDate: "2026-09-30",
      fromUtc: "2026-08-31T22:00:00.000Z",
      toUtcExclusive: "2026-09-30T22:00:00.000Z",
      timezone: "Europe/Bratislava"
    },
    reactivationInactivityDays: 90
  } as const;

  it("retrieves configured targets and deterministic user actuals", async () => {
    const result = await getManagementKpiData(createSeededContext(), query);
    const customerService = result.users.find((user) => user.userId === "usr-cs-001");
    const sales = result.users.find((user) => user.userId === "usr-sales-003");

    expect(result.definitions).toHaveLength(8);
    expect(result.targets).toHaveLength(8);
    expect(customerService).toMatchObject({ callsCompleted: 1, reactivations: 1 });
    expect(customerService?.attributedTurnover).toBe(450);
    expect(sales).toMatchObject({ reactivations: 1, attributedTurnover: 800 });
    expect(result.users.find((user) => user.userId === "usr-cs-003")?.b2bActivations).toBe(1);
    expect(result.users.find((user) => user.userId === "usr-sales-002")?.b2bActivations).toBe(1);
  });

  it("returns company dashboard aggregates and role filtering", async () => {
    const result = await getManagementKpiData(createSeededContext(), {
      ...query,
      role: "customer_service"
    });

    expect(result.users).toHaveLength(3);
    expect(result.users.every((user) => user.role === "customer_service")).toBe(true);
    expect(result.dashboard).toMatchObject({
      turnover: 2405,
      reactivatedCustomers: 2,
      callsCompleted: 3,
      visitsCompleted: 1
    });
    expect(result.dashboard.b2bPenetrationPercent).toBeGreaterThan(0);
  });

  it("honors the attribution window and returns zeroes for an empty period", async () => {
    const narrowAttribution = await getManagementKpiData(createSeededContext(), {
      ...query,
      attributionWindowDays: 5
    });
    expect(narrowAttribution.dashboard.reactivatedCustomers).toBe(0);

    const empty = await getManagementKpiData(createSeededContext(), {
      ...query,
      range: {
        ...query.range,
        fromDate: "2027-01-01",
        toDate: "2027-01-31",
        fromUtc: "2026-12-31T23:00:00.000Z",
        toUtcExclusive: "2027-01-31T23:00:00.000Z"
      }
    });
    expect(empty.dashboard.turnover).toBe(0);
    expect(empty.users.every((user) => user.attributedTurnover === 0)).toBe(true);
  });
});

describe("customer read repositories", () => {
  it("returns paginated customer lists", async () => {
    const result = await listCustomers(createSeededContext(), { page: 2, pageSize: 5 });

    expect(result.items).toHaveLength(5);
    expect(result.pagination).toMatchObject({
      page: 2,
      pageSize: 5,
      total: 20,
      totalPages: 4
    });
  });

  it("searches customers server-side", async () => {
    const result = await listCustomers(createSeededContext(), { search: "Blue Pine" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("cus-002");
  });

  it("filters customer lists by sales rep, B2B status, and segment", async () => {
    const result = await listCustomers(createSeededContext(), {
      assignedSalesRepId: "usr-sales-002",
      b2bStatus: "registered",
      segmentCode: "DECLINING"
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((customer) => customer.assignedSalesRep?.id === "usr-sales-002")
    ).toBe(true);
    expect(result.items.every((customer) => customer.b2bStatus === "registered")).toBe(true);
    expect(
      result.items.every((customer) =>
        customer.segments.some((segment) => segment.code === "DECLINING")
      )
    ).toBe(true);
  });

  it("returns customer detail aggregation", async () => {
    const overview = await getCustomerOverview(createSeededContext(), "cus-002");

    expect(overview?.customer.companyName).toBe("Blue Pine Stores");
    expect(overview?.customer.turnover90d).toBeGreaterThan(0);
    expect(overview?.customer.segments.map((segment) => segment.code)).toContain("REORDER_DUE");
    expect(overview?.locations.length).toBeGreaterThan(0);
    expect(overview?.segments.map((segment) => segment.code)).toContain("REORDER_DUE");
    expect(overview?.latestOrders[0]?.id).toBe("ord-003");
    expect(overview?.openTasks[0]?.id).toBe("tsk-001");
  });

  it("retrieves paginated customer order history", async () => {
    const result = await listCustomerOrders(createSeededContext(), "cus-001", {
      page: 1,
      pageSize: 1
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("ord-002");
    expect(result.pagination.total).toBe(2);
  });

  it("returns the approved segment definitions", async () => {
    const segments = await listSegments(createSeededContext());

    expect(segments.map((segment) => segment.code)).toEqual([
      "ACTIVE",
      "AT_RISK",
      "B2B_MISSING",
      "CRITICAL",
      "CROSS_SELL",
      "DECLINING",
      "NEWSLETTER_FOLLOW_UP",
      "REACTIVATION",
      "REORDER_DUE"
    ]);
  });
});

describe("customer service read repositories", () => {
  it("returns bounded customer service candidates with queue facts", async () => {
    const result = await listCustomerServiceCandidates(createSeededContext(), {
      limit: 10,
      now: new Date("2026-09-11T12:00:00.000Z")
    });

    const bluePine = result.find((candidate) => candidate.customerId === "cus-002");

    expect(result.length).toBeGreaterThan(0);
    expect(bluePine?.segments.map((segment) => segment.code)).toContain("REORDER_DUE");
    expect(bluePine?.openTaskCount).toBe(1);
    expect(bluePine?.lastInteraction?.interactionType).toBe("CALL");
  });

  it("counts completed customer service calls for today", async () => {
    const result = await countCompletedCustomerServiceCallsToday(createSeededContext(), {
      fromUtc: "2026-09-10T22:00:00.000Z",
      toUtcExclusive: "2026-09-11T22:00:00.000Z"
    });

    expect(result).toBe(1);
  });

  it("loads namespaced customer service configuration", async () => {
    const result = await getSystemConfigByPrefix(createSeededContext(), "customer_service.");

    expect(result.find((entry) => entry.key === "customer_service.daily_call_target")?.value).toBe(
      "8"
    );
    expect(result.find((entry) => entry.key === "customer_service.reorder_grace_days")?.value).toBe(
      "7"
    );
  });
});
