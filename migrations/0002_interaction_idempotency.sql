ALTER TABLE customer_interactions ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_interactions_idempotency_key
  ON customer_interactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_source_interaction
  ON tasks(source_interaction_id);
