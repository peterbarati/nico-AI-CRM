import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { createHealthResponse, type Env } from "./index";

interface SqliteStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown | undefined;
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
}

class TestD1Database {
  private readonly database: SqliteDatabase;

  constructor() {
    const require = createRequire(import.meta.url);
    const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: DatabaseSyncConstructor };
    this.database = new DatabaseSync(":memory:");
    this.database.exec("PRAGMA foreign_keys = ON;");
    this.database.exec(readFileSync(join(process.cwd(), "migrations/0001_initial.sql"), "utf8"));
    this.database.exec(readFileSync(join(process.cwd(), "packages/db/seeds/demo.sql"), "utf8"));
  }

  prepare(sql: string): TestD1Statement {
    return new TestD1Statement(this.database, sql);
  }
}

function createTestEnv(): Env {
  return {
    ASSETS: {
      fetch: () => Promise.resolve(new Response("asset", { status: 200 }))
    },
    DB: new TestD1Database() as unknown as D1Database
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
});
