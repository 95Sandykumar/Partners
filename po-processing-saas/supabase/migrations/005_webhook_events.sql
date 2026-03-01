-- Track processed Stripe webhook events for idempotency

CREATE TABLE webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup: delete events older than 7 days (Stripe retry window is 3 days)
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed_at);
