ALTER TABLE customer_locations ADD COLUMN geocoded_at TEXT;
ALTER TABLE customer_locations ADD COLUMN geocode_source TEXT;

CREATE TABLE sales_opportunities (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES customer_locations(id) ON DELETE CASCADE,
  sales_rep_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('REORDER','REACTIVATION','RETENTION','CROSS_SELL','B2B_REGISTRATION','CAMPAIGN_FOLLOW_UP','TASK_FOLLOW_UP','OVERDUE_VISIT','STRATEGIC','OTHER')),
  score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
  estimated_value REAL CHECK (estimated_value IS NULL OR estimated_value >= 0),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACCEPTED','DISMISSED','CONVERTED','EXPIRED')),
  primary_reason_code TEXT NOT NULL,
  reason_codes_json TEXT NOT NULL DEFAULT '[]',
  facts_json TEXT NOT NULL DEFAULT '{}',
  source_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  source_campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  generated_at TEXT NOT NULL,
  expires_at TEXT,
  accepted_at TEXT,
  dismissed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_sales_opportunity_active_unique
  ON sales_opportunities(customer_id,location_id,sales_rep_id,opportunity_type)
  WHERE status IN ('OPEN','ACCEPTED');
CREATE INDEX idx_sales_opportunities_rep_status_score
  ON sales_opportunities(sales_rep_id,status,score DESC,generated_at DESC);
CREATE INDEX idx_sales_opportunities_customer
  ON sales_opportunities(customer_id,status,updated_at DESC);
CREATE INDEX idx_sales_opportunities_sources
  ON sales_opportunities(source_task_id,source_campaign_id);

CREATE TABLE sales_routes (
  id TEXT PRIMARY KEY,
  sales_rep_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  route_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RECOMMENDED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED')),
  provider TEXT NOT NULL DEFAULT 'APPROXIMATE',
  start_latitude REAL NOT NULL CHECK (start_latitude BETWEEN -90 AND 90),
  start_longitude REAL NOT NULL CHECK (start_longitude BETWEEN -180 AND 180),
  end_latitude REAL NOT NULL CHECK (end_latitude BETWEEN -90 AND 90),
  end_longitude REAL NOT NULL CHECK (end_longitude BETWEEN -180 AND 180),
  planned_distance_km REAL NOT NULL DEFAULT 0 CHECK (planned_distance_km >= 0),
  planned_travel_minutes INTEGER NOT NULL DEFAULT 0 CHECK (planned_travel_minutes >= 0),
  planned_visit_minutes INTEGER NOT NULL DEFAULT 0 CHECK (planned_visit_minutes >= 0),
  planned_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (planned_duration_minutes >= 0),
  estimated_value REAL NOT NULL DEFAULT 0 CHECK (estimated_value >= 0),
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_sales_route_active_day
  ON sales_routes(sales_rep_id,route_date)
  WHERE status IN ('DRAFT','RECOMMENDED','ACCEPTED','IN_PROGRESS');
CREATE INDEX idx_sales_routes_rep_date ON sales_routes(sales_rep_id,route_date DESC,status);

CREATE TABLE sales_route_stops (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES sales_routes(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES sales_opportunities(id) ON DELETE RESTRICT,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  location_id TEXT NOT NULL REFERENCES customer_locations(id) ON DELETE RESTRICT,
  sales_visit_id TEXT REFERENCES sales_visits(id) ON DELETE SET NULL,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  planned_arrival TEXT NOT NULL,
  planned_duration_minutes INTEGER NOT NULL CHECK (planned_duration_minutes > 0),
  distance_from_previous_km REAL NOT NULL CHECK (distance_from_previous_km >= 0),
  travel_time_from_previous_minutes INTEGER NOT NULL CHECK (travel_time_from_previous_minutes >= 0),
  route_utility REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','REMOVED','VISIT_PLANNED','COMPLETED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(route_id,opportunity_id),
  UNIQUE(route_id,sequence)
);

CREATE INDEX idx_sales_route_stops_route_sequence
  ON sales_route_stops(route_id,status,sequence);
CREATE INDEX idx_sales_route_stops_visit ON sales_route_stops(sales_visit_id);

INSERT OR IGNORE INTO system_config (key,value,value_type,description,updated_at) VALUES
  ('sales.daily_visit_target','7','number','Target visits per Sales Representative per day.','2026-09-15T00:00:00.000Z'),
  ('sales.default_visit_duration_minutes','45','number','Default planned duration of one Sales visit.','2026-09-15T00:00:00.000Z'),
  ('sales.workday_minutes','480','number','Maximum planned route workday duration.','2026-09-15T00:00:00.000Z'),
  ('sales.route_average_speed_kmh','50','number','Approximate route speed used without a live routing provider.','2026-09-15T00:00:00.000Z'),
  ('sales.route_distance_penalty_per_km','0.15','number','Geographic penalty used only for route utility.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_expiry_days','14','number','Freshness window for generated Sales opportunities.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_visit_overdue_days','60','number','Days since the last completed visit considered overdue.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_high_commercial_value','2000','number','Lifetime turnover used to normalize commercial potential.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_weight_commercial','25','number','Opportunity score weight for commercial potential.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_weight_reorder','20','number','Opportunity score weight for reorder propensity.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_weight_reactivation','15','number','Opportunity score weight for reactivation.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_weight_decline','10','number','Opportunity score weight for turnover decline.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_weight_cross_sell','10','number','Opportunity score weight for cross-sell.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_weight_visit_overdue','10','number','Opportunity score weight for an overdue visit.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_weight_task_campaign','10','number','Opportunity score weight for task or campaign urgency.','2026-09-15T00:00:00.000Z'),
  ('sales.opportunity_weight_strategic','0','number','Optional opportunity score weight for strategic priority.','2026-09-15T00:00:00.000Z'),
  ('sales.route_default_start_latitude','','string','Configured route origin latitude; required in production.','2026-09-15T00:00:00.000Z'),
  ('sales.route_default_start_longitude','','string','Configured route origin longitude; required in production.','2026-09-15T00:00:00.000Z'),
  ('sales.route_default_end_latitude','','string','Configured route destination latitude; required in production.','2026-09-15T00:00:00.000Z'),
  ('sales.route_default_end_longitude','','string','Configured route destination longitude; required in production.','2026-09-15T00:00:00.000Z');
