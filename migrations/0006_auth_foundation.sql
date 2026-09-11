ALTER TABLE users ADD COLUMN auth_provider TEXT;
ALTER TABLE users ADD COLUMN auth_subject TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_identity
  ON users(auth_provider, auth_subject)
  WHERE auth_provider IS NOT NULL AND auth_subject IS NOT NULL;

ALTER TABLE ai_assistant_runs
  ADD COLUMN actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_assistant_runs_actor_created
  ON ai_assistant_runs(actor_user_id, created_at DESC);
