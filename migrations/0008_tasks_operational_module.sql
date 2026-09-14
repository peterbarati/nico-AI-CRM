ALTER TABLE tasks ADD COLUMN operational_type TEXT NOT NULL DEFAULT 'OTHER'
  CHECK (operational_type IN (
    'FOLLOW_UP_CALL', 'SALES_VISIT', 'CUSTOMER_SERVICE', 'B2B_REGISTRATION',
    'REACTIVATION', 'REORDER', 'CAMPAIGN_FOLLOW_UP', 'ADMIN', 'OTHER'
  ));

ALTER TABLE tasks ADD COLUMN source_origin TEXT NOT NULL DEFAULT 'OTHER'
  CHECK (source_origin IN (
    'MANUAL', 'CALL', 'SALES_VISIT', 'CS_TO_SALES_HANDOFF',
    'SALES_TO_CS_HANDOFF', 'CAMPAIGN', 'OTHER'
  ));

UPDATE tasks
SET operational_type = CASE task_type
  WHEN 'call' THEN 'FOLLOW_UP_CALL'
  WHEN 'visit' THEN 'SALES_VISIT'
  WHEN 'follow_up' THEN 'CUSTOMER_SERVICE'
  WHEN 'handoff' THEN 'SALES_VISIT'
  WHEN 'email' THEN 'CAMPAIGN_FOLLOW_UP'
  ELSE 'OTHER'
END;

UPDATE tasks
SET source_origin = CASE
  WHEN source_visit_id IS NOT NULL THEN 'SALES_TO_CS_HANDOFF'
  WHEN source_interaction_id IS NOT NULL AND task_type = 'handoff' THEN 'CS_TO_SALES_HANDOFF'
  WHEN source_interaction_id IS NOT NULL THEN 'CALL'
  ELSE 'MANUAL'
END;

CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CREATED', 'STARTED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'REASSIGNED', 'UPDATED'
  )),
  previous_status TEXT,
  new_status TEXT,
  previous_due_at TEXT,
  new_due_at TEXT,
  previous_assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  new_assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_operational_type ON tasks(operational_type);
CREATE INDEX IF NOT EXISTS idx_tasks_source_origin ON tasks(source_origin);
CREATE INDEX IF NOT EXISTS idx_task_events_task_created ON task_events(task_id, created_at DESC);
