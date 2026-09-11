import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  createDatabaseContext,
  countCompletedCustomerServiceCallsToday,
  getCustomerOverview,
  getSystemConfigByPrefix,
  listCustomerServiceCandidates,
  listCustomerOrders,
  listCustomers,
  listSegments
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
      tables: 18,
      customers: 20,
      users: 8,
      segments: 9,
      search: ["cus-002"],
      orders: ["ord-002", "ord-001"]
    });
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
    const result = await countCompletedCustomerServiceCallsToday(
      createSeededContext(),
      new Date("2026-09-11T12:00:00.000Z")
    );

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
