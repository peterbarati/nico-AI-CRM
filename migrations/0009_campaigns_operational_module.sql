ALTER TABLE campaigns ADD COLUMN operational_type TEXT NOT NULL DEFAULT 'OTHER'
  CHECK (operational_type IN ('NEWSLETTER','PRODUCT_LAUNCH','PROMOTION','REACTIVATION','B2B','CROSS_SELL','INFORMATIONAL','OTHER'));
ALTER TABLE campaigns ADD COLUMN operational_status TEXT NOT NULL DEFAULT 'DRAFT'
  CHECK (operational_status IN ('DRAFT','READY','ACTIVE','COMPLETED','CANCELLED'));
ALTER TABLE campaigns ADD COLUMN created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN provider TEXT NOT NULL DEFAULT 'MOCK'
  CHECK (provider IN ('MOCK','BREVO','MAILCHIMP'));
ALTER TABLE campaigns ADD COLUMN external_campaign_id TEXT;
ALTER TABLE campaigns ADD COLUMN audience_kind TEXT NOT NULL DEFAULT 'MANUAL'
  CHECK (audience_kind IN ('SEGMENT','MANUAL','FILTERED'));
ALTER TABLE campaigns ADD COLUMN audience_config_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN follow_up_clicked INTEGER NOT NULL DEFAULT 1 CHECK (follow_up_clicked IN (0,1));
ALTER TABLE campaigns ADD COLUMN follow_up_opened INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_opened IN (0,1));
ALTER TABLE campaigns ADD COLUMN follow_up_delay_days INTEGER NOT NULL DEFAULT 2 CHECK (follow_up_delay_days >= 0);

UPDATE campaigns SET operational_type = CASE campaign_type
  WHEN 'newsletter' THEN 'NEWSLETTER' WHEN 'sales' THEN 'PROMOTION' WHEN 'retention' THEN 'INFORMATIONAL'
  WHEN 'reactivation' THEN 'REACTIVATION' WHEN 'cross_sell' THEN 'CROSS_SELL' ELSE 'OTHER' END;
UPDATE campaigns SET operational_status = UPPER(status);

ALTER TABLE customer_campaigns ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'PENDING'
  CHECK (delivery_status IN ('PENDING','SENT','DELIVERED','FAILED'));
ALTER TABLE customer_campaigns ADD COLUMN delivered_at TEXT;
ALTER TABLE customer_campaigns ADD COLUMN failed_at TEXT;
ALTER TABLE customer_campaigns ADD COLUMN failure_reason TEXT;
ALTER TABLE customer_campaigns ADD COLUMN provider_member_id TEXT;
UPDATE customer_campaigns SET delivery_status = CASE WHEN sent_at IS NOT NULL THEN 'DELIVERED' ELSE 'PENDING' END,
  delivered_at = sent_at WHERE sent_at IS NOT NULL;

ALTER TABLE tasks ADD COLUMN source_campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE TABLE campaign_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_campaign_id TEXT REFERENCES customer_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('PREPARED','SENT','DELIVERED','OPENED','CLICKED','FAILED','CONVERTED','COMPLETED','CANCELLED')),
  provider TEXT NOT NULL CHECK (provider IN ('CRM','MOCK','BREVO','MAILCHIMP')),
  external_event_id TEXT,
  occurred_at TEXT NOT NULL,
  metadata_json TEXT,
  UNIQUE(provider, external_event_id)
);

INSERT OR IGNORE INTO system_config (key,value,value_type,description,updated_at) VALUES
  ('campaign.provider','MOCK','string','Campaign delivery provider.','2026-09-14T00:00:00.000Z'),
  ('campaign.follow_up.delay_days','2','number','Default campaign follow-up delay.','2026-09-14T00:00:00.000Z'),
  ('campaign.follow_up.clicked_no_conversion','true','boolean','Follow clicked members without conversion.','2026-09-14T00:00:00.000Z'),
  ('campaign.follow_up.opened_no_conversion','false','boolean','Follow opened members without click or conversion.','2026-09-14T00:00:00.000Z'),
  ('campaign.attribution_window_days','30','number','Operational conversion attribution window.','2026-09-14T00:00:00.000Z');

CREATE INDEX idx_campaigns_status_date ON campaigns(operational_status,start_date);
CREATE INDEX idx_campaign_membership_campaign_activity ON customer_campaigns(campaign_id,clicked_at,opened_at,converted_at);
CREATE INDEX idx_campaign_events_campaign_date ON campaign_events(campaign_id,occurred_at DESC);
CREATE INDEX idx_tasks_source_campaign ON tasks(source_campaign_id,customer_id);
CREATE UNIQUE INDEX idx_campaign_follow_up_task_unique ON tasks(source_campaign_id,customer_id)
  WHERE source_campaign_id IS NOT NULL AND operational_type = 'CAMPAIGN_FOLLOW_UP';
