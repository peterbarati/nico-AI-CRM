PRAGMA defer_foreign_keys = ON;

CREATE TABLE campaigns_provider_migration AS SELECT * FROM campaigns;
CREATE TABLE customer_campaigns_provider_migration AS SELECT * FROM customer_campaigns;
CREATE TABLE campaign_events_provider_migration AS SELECT * FROM campaign_events;
CREATE TABLE task_campaign_links_provider_migration AS
  SELECT id, source_campaign_id FROM tasks WHERE source_campaign_id IS NOT NULL;

DELETE FROM campaign_events;
DELETE FROM customer_campaigns;
UPDATE tasks SET source_campaign_id = NULL WHERE source_campaign_id IS NOT NULL;
DROP TABLE campaigns;

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('newsletter', 'sales', 'retention', 'reactivation', 'cross_sell', 'other')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  operational_type TEXT NOT NULL DEFAULT 'OTHER'
    CHECK (operational_type IN ('NEWSLETTER','PRODUCT_LAUNCH','PROMOTION','REACTIVATION','B2B','CROSS_SELL','INFORMATIONAL','OTHER')),
  operational_status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (operational_status IN ('DRAFT','READY','ACTIVE','COMPLETED','CANCELLED')),
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'MOCK' CHECK (provider IN ('MOCK','ECOMAIL','OMNISEND')),
  external_campaign_id TEXT,
  audience_kind TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (audience_kind IN ('SEGMENT','MANUAL','FILTERED')),
  audience_config_json TEXT NOT NULL DEFAULT '{}',
  follow_up_clicked INTEGER NOT NULL DEFAULT 1 CHECK (follow_up_clicked IN (0,1)),
  follow_up_opened INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_opened IN (0,1)),
  follow_up_delay_days INTEGER NOT NULL DEFAULT 2 CHECK (follow_up_delay_days >= 0)
);

INSERT INTO campaigns
SELECT id,name,campaign_type,status,description,start_date,end_date,created_at,updated_at,
  operational_type,operational_status,created_by_user_id,
  CASE provider WHEN 'BREVO' THEN 'ECOMAIL' WHEN 'MAILCHIMP' THEN 'OMNISEND' ELSE provider END,
  external_campaign_id,audience_kind,audience_config_json,follow_up_clicked,follow_up_opened,
  follow_up_delay_days
FROM campaigns_provider_migration;

INSERT INTO customer_campaigns SELECT * FROM customer_campaigns_provider_migration;

DROP TABLE campaign_events;
CREATE TABLE campaign_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_campaign_id TEXT REFERENCES customer_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('PREPARED','SENT','DELIVERED','OPENED','CLICKED','FAILED','CONVERTED','COMPLETED','CANCELLED')),
  provider TEXT NOT NULL CHECK (provider IN ('CRM','MOCK','ECOMAIL','OMNISEND')),
  external_event_id TEXT,
  occurred_at TEXT NOT NULL,
  metadata_json TEXT,
  UNIQUE(provider, external_event_id)
);

INSERT INTO campaign_events
SELECT id,campaign_id,customer_campaign_id,event_type,
  CASE provider WHEN 'BREVO' THEN 'ECOMAIL' WHEN 'MAILCHIMP' THEN 'OMNISEND' ELSE provider END,
  external_event_id,occurred_at,metadata_json
FROM campaign_events_provider_migration;

UPDATE tasks
SET source_campaign_id = (
  SELECT link.source_campaign_id
  FROM task_campaign_links_provider_migration link
  WHERE link.id = tasks.id
)
WHERE id IN (SELECT id FROM task_campaign_links_provider_migration);

DROP TABLE campaigns_provider_migration;
DROP TABLE customer_campaigns_provider_migration;
DROP TABLE campaign_events_provider_migration;
DROP TABLE task_campaign_links_provider_migration;

CREATE INDEX idx_campaigns_status_date ON campaigns(operational_status,start_date);
CREATE INDEX idx_campaign_events_campaign_date ON campaign_events(campaign_id,occurred_at DESC);

PRAGMA defer_foreign_keys = OFF;
