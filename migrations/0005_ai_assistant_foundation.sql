CREATE TABLE IF NOT EXISTS ai_assistant_runs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  context_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  response_json TEXT,
  error_code TEXT,
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_cache
  ON ai_assistant_runs(customer_id, purpose, context_fingerprint, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_runs_created
  ON ai_assistant_runs(created_at DESC);
