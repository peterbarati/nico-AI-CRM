ALTER TABLE sales_visits ADD COLUMN source_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE sales_visits ADD COLUMN create_idempotency_key TEXT;
ALTER TABLE sales_visits ADD COLUMN completion_idempotency_key TEXT;
ALTER TABLE sales_visits ADD COLUMN next_action TEXT;
ALTER TABLE sales_visits ADD COLUMN follow_up_at TEXT;

ALTER TABLE tasks ADD COLUMN source_visit_id TEXT REFERENCES sales_visits(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_source_task
  ON sales_visits(source_task_id)
  WHERE source_task_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_create_idempotency
  ON sales_visits(create_idempotency_key)
  WHERE create_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_completion_idempotency
  ON sales_visits(completion_idempotency_key)
  WHERE completion_idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_source_visit ON tasks(source_visit_id);
