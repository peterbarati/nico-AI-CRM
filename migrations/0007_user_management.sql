CREATE TABLE IF NOT EXISTS user_management_audit (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'activated', 'deactivated')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_management_audit_target_created
  ON user_management_audit(target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_role_active_name
  ON users(role, active, name);

CREATE TRIGGER IF NOT EXISTS protect_last_active_admin
BEFORE UPDATE OF role, active ON users
WHEN OLD.role = 'admin'
  AND OLD.active = 1
  AND (NEW.role <> 'admin' OR NEW.active = 0)
  AND NOT EXISTS (
    SELECT 1 FROM users
    WHERE id <> OLD.id AND role = 'admin' AND active = 1
  )
BEGIN
  SELECT RAISE(ABORT, 'LAST_ADMIN_PROTECTED');
END;
