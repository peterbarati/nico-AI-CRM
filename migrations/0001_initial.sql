PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'customer_service', 'sales_rep')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  company_name TEXT NOT NULL,
  company_registration_number TEXT,
  tax_id TEXT,
  vat_id TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT NOT NULL,
  assigned_sales_rep_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  b2b_status TEXT NOT NULL DEFAULT 'unknown' CHECK (b2b_status IN ('unknown', 'registered', 'missing', 'not_applicable')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'mock_erp', 'import')),
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_locations (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('retail_pos', 'warehouse', 'billing', 'delivery', 'headquarters', 'other')),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_location_id TEXT REFERENCES customer_locations(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  order_date TEXT NOT NULL,
  net_amount REAL NOT NULL CHECK (net_amount >= 0),
  gross_amount REAL NOT NULL CHECK (gross_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'mock_erp', 'import')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  external_product_id TEXT,
  sku TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  total_price REAL NOT NULL CHECK (total_price >= 0)
);

CREATE TABLE IF NOT EXISTS customer_interactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_location_id TEXT REFERENCES customer_locations(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('CALL', 'EMAIL', 'NOTE', 'MEETING', 'CUSTOMER_SERVICE', 'OTHER')),
  reason TEXT,
  result TEXT,
  notes TEXT,
  next_action TEXT,
  follow_up_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_visits (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_location_id TEXT REFERENCES customer_locations(id) ON DELETE SET NULL,
  sales_rep_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  planned_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  result TEXT,
  notes TEXT,
  order_value REAL CHECK (order_value IS NULL OR order_value >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  customer_location_id TEXT REFERENCES customer_locations(id) ON DELETE SET NULL,
  assigned_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source_interaction_id TEXT REFERENCES customer_interactions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('call', 'email', 'visit', 'follow_up', 'handoff', 'other')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  due_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('newsletter', 'sales', 'retention', 'reactivation', 'cross_sell', 'other')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_campaigns (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sent_at TEXT,
  opened_at TEXT,
  clicked_at TEXT,
  converted_at TEXT,
  conversion_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (campaign_id, customer_id)
);

CREATE TABLE IF NOT EXISTS customer_segments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  system INTEGER NOT NULL DEFAULT 0 CHECK (system IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_segment_memberships (
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  reason TEXT,
  score REAL,
  assigned_at TEXT NOT NULL,
  expires_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (customer_id, segment_id)
);

CREATE TABLE IF NOT EXISTS customer_metrics (
  customer_id TEXT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  last_order_date TEXT,
  first_order_date TEXT,
  turnover_30d REAL NOT NULL DEFAULT 0,
  turnover_90d REAL NOT NULL DEFAULT 0,
  turnover_365d REAL NOT NULL DEFAULT 0,
  previous_turnover_90d REAL NOT NULL DEFAULT 0,
  average_order_value REAL,
  average_reorder_days REAL,
  days_since_last_order INTEGER,
  order_count_30d INTEGER NOT NULL DEFAULT 0,
  order_count_90d INTEGER NOT NULL DEFAULT 0,
  order_count_365d INTEGER NOT NULL DEFAULT 0,
  lifetime_order_count INTEGER NOT NULL DEFAULT 0,
  lifetime_turnover REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kpi_targets (
  id TEXT PRIMARY KEY,
  kpi_definition_id TEXT NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'manager', 'customer_service', 'sales_rep')),
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'quarter', 'year')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  target_value REAL NOT NULL,
  weight REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (user_id IS NOT NULL OR role IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  cursor TEXT,
  checkpoint TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, active);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(active);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_sales_rep ON customers(assigned_sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_customers_b2b_status ON customers(b2b_status);
CREATE INDEX IF NOT EXISTS idx_customer_locations_customer ON customer_locations(customer_id, active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, active);
CREATE INDEX IF NOT EXISTS idx_orders_customer_date ON orders(customer_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_interactions_customer_created ON customer_interactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user_created ON customer_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_customer_planned ON sales_visits(customer_id, planned_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_sales_rep_status ON sales_visits(sales_rep_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_due ON tasks(assigned_user_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_status ON tasks(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_membership_customer ON customer_campaigns(customer_id);
CREATE INDEX IF NOT EXISTS idx_segment_membership_segment ON customer_segment_memberships(segment_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_provider_entity ON sync_runs(provider, entity_type, started_at DESC);
