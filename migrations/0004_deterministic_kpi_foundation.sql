ALTER TABLE kpi_definitions ADD COLUMN role TEXT CHECK (role IN ('customer_service', 'sales_rep'));
ALTER TABLE kpi_definitions ADD COLUMN source_key TEXT;

CREATE TABLE IF NOT EXISTS company_kpi_targets (
  id TEXT PRIMARY KEY,
  kpi_definition_id TEXT NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'quarter', 'year')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  target_value REAL NOT NULL CHECK (target_value >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (kpi_definition_id, period_type, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS b2b_activations (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  attributed_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_interaction_id TEXT REFERENCES customer_interactions(id) ON DELETE SET NULL,
  source_visit_id TEXT REFERENCES sales_visits(id) ON DELETE SET NULL,
  activated_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('crm', 'mock_erp', 'import')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (source_interaction_id IS NOT NULL OR source_visit_id IS NOT NULL),
  UNIQUE (customer_id, activated_at)
);

CREATE INDEX IF NOT EXISTS idx_kpi_targets_period_role_user
  ON kpi_targets(period_start, period_end, role, user_id);
CREATE INDEX IF NOT EXISTS idx_company_kpi_targets_period
  ON company_kpi_targets(period_start, period_end, kpi_definition_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_date_customer
  ON orders(status, order_date, customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_user_customer
  ON customer_interactions(created_at, user_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_completed_user_customer
  ON sales_visits(completed_at, sales_rep_id, customer_id)
  WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_tasks_completed_assigned
  ON tasks(completed_at, assigned_user_id)
  WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_b2b_activations_date_user
  ON b2b_activations(activated_at, attributed_user_id);

UPDATE kpi_definitions SET active = 0 WHERE code IN ('CALLS_COMPLETED', 'VISITS_COMPLETED', 'TURNOVER');

INSERT INTO kpi_definitions (id, code, name, description, metric_type, active, created_at, updated_at, role, source_key) VALUES
  ('kpi-cs-turnover', 'CS_TURNOVER', 'Attributed turnover', 'Net order turnover operationally attributed to Customer Service activity.', 'currency', 1, '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z', 'customer_service', 'attributed_turnover'),
  ('kpi-cs-calls', 'CS_CALLS', 'Calls completed', 'Structured Customer Service calls completed in the period.', 'count', 1, '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z', 'customer_service', 'calls_completed'),
  ('kpi-cs-reactivations', 'CS_REACTIVATIONS', 'Reactivated customers', 'Customers with a qualifying order after attributed Customer Service activity.', 'count', 1, '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z', 'customer_service', 'reactivations'),
  ('kpi-cs-b2b', 'CS_B2B', 'B2B activations', 'Structured B2B activations attributed to Customer Service.', 'count', 1, '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z', 'customer_service', 'b2b_activations'),
  ('kpi-sales-turnover', 'SALES_TURNOVER', 'Attributed turnover', 'Net order turnover operationally attributed to Sales activity.', 'currency', 1, '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z', 'sales_rep', 'attributed_turnover'),
  ('kpi-sales-visits', 'SALES_VISITS', 'Visits completed', 'Completed Sales visits in the period.', 'count', 1, '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z', 'sales_rep', 'visits_completed'),
  ('kpi-sales-reactivations', 'SALES_REACTIVATIONS', 'Reactivated customers', 'Customers with a qualifying order after attributed Sales activity.', 'count', 1, '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z', 'sales_rep', 'reactivations'),
  ('kpi-sales-b2b', 'SALES_B2B', 'B2B activations', 'Structured B2B activations attributed to Sales.', 'count', 1, '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z', 'sales_rep', 'b2b_activations');
