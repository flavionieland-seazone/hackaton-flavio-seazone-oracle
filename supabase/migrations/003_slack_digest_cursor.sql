-- Tracking table for Slack digest cron: stores the last processed message timestamp per channel
CREATE TABLE IF NOT EXISTS oracle_slack_digest_cursor (
  channel_id TEXT PRIMARY KEY,
  last_ts TEXT NOT NULL,
  last_run_at TIMESTAMPTZ DEFAULT now(),
  messages_processed INTEGER DEFAULT 0
);
