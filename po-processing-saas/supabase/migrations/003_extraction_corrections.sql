-- ============================================================
-- Migration 003: Extraction Corrections & Accuracy Metrics
-- Tracks operator corrections to AI extractions for feedback loop
-- ============================================================

-- Table: extraction_corrections
-- Records each individual field correction when operator edits a value during PO review
CREATE TABLE extraction_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Field identification
  field_path TEXT NOT NULL,       -- Full path, e.g., 'line_items[2].quantity'
  field_name TEXT NOT NULL,       -- Just the field, e.g., 'quantity'
  line_number INTEGER,            -- NULL for header fields, integer for line items

  -- Values (stringified for flexibility)
  ai_extracted_value TEXT,        -- What Claude Vision returned
  corrected_value TEXT,           -- What operator changed it to

  -- Context
  extraction_confidence NUMERIC(5,2),  -- AI confidence at time of extraction
  corrected_by UUID NOT NULL REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_corrections_po ON extraction_corrections(purchase_order_id);
CREATE INDEX idx_corrections_org ON extraction_corrections(organization_id);
CREATE INDEX idx_corrections_vendor ON extraction_corrections(vendor_id);
CREATE INDEX idx_corrections_field ON extraction_corrections(field_name, created_at);

-- RLS
ALTER TABLE extraction_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view corrections"
  ON extraction_corrections FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can insert corrections"
  ON extraction_corrections FOR INSERT
  WITH CHECK (organization_id = public.user_org_id());


-- Table: extraction_accuracy_metrics
-- Aggregated accuracy stats per vendor/field/time window for dashboard and threshold tuning
CREATE TABLE extraction_accuracy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

  field_name TEXT NOT NULL,
  time_window TEXT NOT NULL CHECK (time_window IN ('daily', 'weekly', 'monthly', 'all_time')),
  window_start DATE,              -- NULL for all_time
  window_end DATE,                -- NULL for all_time

  total_extractions INTEGER NOT NULL DEFAULT 0,
  correct_extractions INTEGER NOT NULL DEFAULT 0,
  accuracy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,

  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, vendor_id, field_name, time_window, window_start)
);

CREATE INDEX idx_accuracy_org ON extraction_accuracy_metrics(organization_id);
CREATE INDEX idx_accuracy_vendor ON extraction_accuracy_metrics(vendor_id, field_name);

-- RLS
ALTER TABLE extraction_accuracy_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view accuracy metrics"
  ON extraction_accuracy_metrics FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can manage accuracy metrics"
  ON extraction_accuracy_metrics FOR ALL
  USING (organization_id = public.user_org_id());
