-- Index for fast Slack thread conversation lookup
CREATE INDEX IF NOT EXISTS idx_oracle_conv_slack_thread
  ON oracle_conversations(slack_channel, slack_thread_ts)
  WHERE source = 'slack';
