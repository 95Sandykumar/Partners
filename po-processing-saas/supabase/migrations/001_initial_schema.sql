-- PO Processing SaaS - Initial Schema
-- Multi-tenant with RLS on every table

-- Enable UUID generation
-- gen_random_uuid() is built-in to PostgreSQL 13+, no extension needed

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  monthly_po_limit INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(organization_id);

-- ============================================================
-- 3. VENDORS
-- ============================================================
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  email_domains TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  po_format_type TEXT DEFAULT 'simple',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, vendor_id)
);

CREATE INDEX idx_vendors_org ON vendors(organization_id);

-- ============================================================
-- 4. VENDOR TEMPLATES
-- ============================================================
CREATE TABLE vendor_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT '1.0.0',
  template_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_templates_vendor ON vendor_templates(vendor_id);

-- ============================================================
-- 5. PRODUCTS
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  internal_sku TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  unit_price NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, internal_sku)
);

CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_sku ON products(organization_id, internal_sku);

-- Full-text search on products
ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(internal_sku, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '') || ' ' || coalesce(brand, ''))
  ) STORED;

CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- ============================================================
-- 6. VENDOR MAPPINGS
-- ============================================================
CREATE TABLE vendor_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_part_number TEXT NOT NULL,
  manufacturer_part_number TEXT,
  internal_sku TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
  match_source TEXT NOT NULL DEFAULT 'manual' CHECK (match_source IN ('manual', 'extracted', 'verified', 'auto')),
  times_seen INTEGER NOT NULL DEFAULT 1,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, vendor_id, vendor_part_number)
);

CREATE INDEX idx_vendor_mappings_org ON vendor_mappings(organization_id);
CREATE INDEX idx_vendor_mappings_vendor ON vendor_mappings(vendor_id);
CREATE INDEX idx_vendor_mappings_lookup ON vendor_mappings(organization_id, vendor_part_number);

-- ============================================================
-- 7. PURCHASE ORDERS
-- ============================================================
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  po_number TEXT NOT NULL,
  po_date DATE,
  total NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'processed')),
  extraction_confidence NUMERIC(5,2),
  pdf_storage_path TEXT NOT NULL,
  raw_extraction JSONB,
  created_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_po_org ON purchase_orders(organization_id);
CREATE INDEX idx_po_status ON purchase_orders(organization_id, status);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_number ON purchase_orders(organization_id, po_number);

-- ============================================================
-- 8. PO LINE ITEMS
-- ============================================================
CREATE TABLE po_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  vendor_part_number TEXT NOT NULL DEFAULT '',
  manufacturer_part_number TEXT,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_of_measure TEXT DEFAULT 'EA',
  unit_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  extended_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  matched_internal_sku TEXT,
  match_confidence NUMERIC(5,2),
  match_method TEXT CHECK (match_method IS NULL OR match_method IN ('exact', 'prefix', 'fuzzy', 'manual')),
  is_matched BOOLEAN NOT NULL DEFAULT false,
  extraction_confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  extraction_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_line_items_po ON po_line_items(purchase_order_id);

-- ============================================================
-- 9. REVIEW QUEUE
-- ============================================================
CREATE TABLE review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  reason TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed')),
  assigned_to UUID REFERENCES auth.users(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_queue_org ON review_queue(organization_id, status);
CREATE INDEX idx_review_queue_priority ON review_queue(organization_id, priority DESC);

-- ============================================================
-- 10. EXTRACTION LOGS
-- ============================================================
CREATE TABLE extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  extraction_confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  processing_time_ms INTEGER NOT NULL DEFAULT 0,
  api_cost NUMERIC(8,4),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extraction_logs_org ON extraction_logs(organization_id);
CREATE INDEX idx_extraction_logs_po ON extraction_logs(purchase_order_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Organizations: users can see their own org
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = public.user_org_id());

CREATE POLICY "Admins can update own organization"
  ON organizations FOR UPDATE
  USING (id = public.user_org_id())
  WITH CHECK (id = public.user_org_id());

-- Users: can see users in their org
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Vendors: org-scoped
CREATE POLICY "Org members can view vendors"
  ON vendors FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can insert vendors"
  ON vendors FOR INSERT
  WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Org members can update vendors"
  ON vendors FOR UPDATE
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can delete vendors"
  ON vendors FOR DELETE
  USING (organization_id = public.user_org_id());

-- Vendor Templates: through vendor org
CREATE POLICY "Org members can view vendor templates"
  ON vendor_templates FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE organization_id = public.user_org_id()));

CREATE POLICY "Org members can manage vendor templates"
  ON vendor_templates FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE organization_id = public.user_org_id()));

-- Products: org-scoped
CREATE POLICY "Org members can view products"
  ON products FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can insert products"
  ON products FOR INSERT
  WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Org members can update products"
  ON products FOR UPDATE
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can delete products"
  ON products FOR DELETE
  USING (organization_id = public.user_org_id());

-- Vendor Mappings: org-scoped
CREATE POLICY "Org members can view mappings"
  ON vendor_mappings FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can insert mappings"
  ON vendor_mappings FOR INSERT
  WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Org members can update mappings"
  ON vendor_mappings FOR UPDATE
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can delete mappings"
  ON vendor_mappings FOR DELETE
  USING (organization_id = public.user_org_id());

-- Purchase Orders: org-scoped
CREATE POLICY "Org members can view POs"
  ON purchase_orders FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can insert POs"
  ON purchase_orders FOR INSERT
  WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Org members can update POs"
  ON purchase_orders FOR UPDATE
  USING (organization_id = public.user_org_id());

-- PO Line Items: through PO org
CREATE POLICY "Org members can view line items"
  ON po_line_items FOR SELECT
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE organization_id = public.user_org_id()));

CREATE POLICY "Org members can manage line items"
  ON po_line_items FOR ALL
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE organization_id = public.user_org_id()));

-- Review Queue: org-scoped
CREATE POLICY "Org members can view review queue"
  ON review_queue FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can manage review queue"
  ON review_queue FOR ALL
  USING (organization_id = public.user_org_id());

-- Extraction Logs: org-scoped
CREATE POLICY "Org members can view extraction logs"
  ON extraction_logs FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can insert extraction logs"
  ON extraction_logs FOR INSERT
  WITH CHECK (organization_id = public.user_org_id());

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_vendor_mappings_updated_at BEFORE UPDATE ON vendor_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_po_line_items_updated_at BEFORE UPDATE ON po_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_review_queue_updated_at BEFORE UPDATE ON review_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STORAGE BUCKET (handled via Supabase Dashboard or separate migration)
-- Storage bucket 'po-pdfs' and RLS policies are created in 003_storage.sql
-- ============================================================
