import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";

const root = join(import.meta.dirname, "../../..");
const migrationSql = ["0001_initial.sql", "0002_interaction_idempotency.sql"]
  .map((file) => readFileSync(join(root, "migrations", file), "utf8"))
  .join("\n");
const seedSql = readFileSync(join(root, "packages/db/seeds/demo.sql"), "utf8");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(migrationSql);
db.exec(seedSql);
db.exec(seedSql);

const tables = db
  .prepare(
    `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name ASC
  `
  )
  .all()
  .map((row) => row.name);

assert.deepEqual(tables, [
  "campaigns",
  "customer_campaigns",
  "customer_interactions",
  "customer_locations",
  "customer_metrics",
  "customer_segment_memberships",
  "customer_segments",
  "customers",
  "kpi_definitions",
  "kpi_targets",
  "order_items",
  "orders",
  "products",
  "sales_visits",
  "sync_runs",
  "system_config",
  "tasks",
  "users"
]);

assert.equal(db.prepare("SELECT COUNT(*) AS total FROM customers").get().total, 20);
assert.equal(db.prepare("SELECT COUNT(*) AS total FROM users").get().total, 8);
assert.equal(db.prepare("SELECT COUNT(*) AS total FROM customer_segments").get().total, 9);

assert.throws(() => {
  db.exec(`
    INSERT INTO customers (
      id, external_id, company_name, country, b2b_status, active, source, created_at, updated_at
    ) VALUES (
      'cus-duplicate', 'erp-cus-001', 'Duplicate External ID', 'SK', 'unknown', 1, 'mock_erp',
      '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
    )
  `);
});

assert.throws(() => {
  db.exec(`
    INSERT INTO orders (
      id, customer_id, order_number, order_date, net_amount, gross_amount, currency, status, source, created_at, updated_at
    ) VALUES (
      'ord-invalid', 'cus-missing', 'ORD-INVALID', '2026-09-01', 1, 1.2, 'EUR', 'completed', 'mock_erp',
      '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
    )
  `);
});

assert.throws(() => {
  db.exec(`
    INSERT INTO customer_campaigns (
      id, campaign_id, customer_id, created_at, updated_at
    ) VALUES (
      'cuc-duplicate', 'cmp-002', 'cus-009', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
    )
  `);
});

const page = db
  .prepare(
    `
    SELECT id
    FROM customers
    ORDER BY company_name ASC, id ASC
    LIMIT 5 OFFSET 5
  `
  )
  .all()
  .map((row) => row.id);

const search = db
  .prepare(
    `
    SELECT id
    FROM customers
    WHERE company_name LIKE ?
  `
  )
  .all("%Blue Pine%")
  .map((row) => row.id);

const detail = db
  .prepare(
    `
    SELECT c.company_name, s.code
    FROM customers c
    JOIN customer_segment_memberships m ON m.customer_id = c.id
    JOIN customer_segments s ON s.id = m.segment_id
    WHERE c.id = ?
  `
  )
  .all("cus-002");

const orders = db
  .prepare(
    `
    SELECT id
    FROM orders
    WHERE customer_id = ?
    ORDER BY order_date DESC
  `
  )
  .all("cus-001")
  .map((row) => row.id);

assert.equal(page.length, 5);
assert.deepEqual(search, ["cus-002"]);
assert.deepEqual(
  detail.map((row) => ({ company_name: row.company_name, code: row.code })),
  [{ company_name: "Blue Pine Stores", code: "REORDER_DUE" }]
);
assert.deepEqual(orders, ["ord-002", "ord-001"]);

console.log(
  JSON.stringify({
    tables: tables.length,
    customers: 20,
    users: 8,
    segments: 9,
    page,
    search,
    orders
  })
);
