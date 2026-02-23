-- ============================================================
-- Migration 004: Stripe Billing & Usage Tracking
-- Adds Stripe fields to organizations and monthly PO usage tracking
-- ============================================================

-- Add Stripe columns to organizations
ALTER TABLE organizations
  ADD COLUMN stripe_customer_id TEXT UNIQUE,
  ADD COLUMN stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'inactive', 'trialing'));

CREATE INDEX idx_orgs_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX idx_orgs_stripe_sub ON organizations(stripe_subscription_id);


-- Table: po_usage_tracking
-- Tracks monthly PO processing count per org for limit enforcement
CREATE TABLE po_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month DATE NOT NULL,               -- First day of the month (e.g., 2026-02-01)
  pos_processed INTEGER NOT NULL DEFAULT 0,
  limit_at_time INTEGER NOT NULL,    -- The org's monthly_po_limit when this row was created

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, month)
);

CREATE INDEX idx_usage_org_month ON po_usage_tracking(organization_id, month);

-- RLS
ALTER TABLE po_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view usage"
  ON po_usage_tracking FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can manage usage"
  ON po_usage_tracking FOR ALL
  USING (organization_id = public.user_org_id());

CREATE TRIGGER tr_po_usage_updated_at
  BEFORE UPDATE ON po_usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
