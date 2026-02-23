export type OrganizationTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type UserRole = 'admin' | 'operator' | 'viewer';
export type POStatus = 'pending_review' | 'approved' | 'rejected' | 'processed';
export type ReviewStatus = 'pending' | 'in_review' | 'completed';
export type MatchSource = 'manual' | 'extracted' | 'verified' | 'auto';
export type MatchMethod = 'exact' | 'prefix' | 'fuzzy' | 'manual';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'inactive' | 'trialing';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: OrganizationTier;
  monthly_po_limit: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  organization_id: string;
  vendor_id: string;
  vendor_name: string;
  email_domains: string[];
  keywords: string[];
  po_format_type: string;
  created_at: string;
  updated_at: string;
}

export interface VendorTemplate {
  id: string;
  vendor_id: string;
  version: string;
  template_data: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  internal_sku: string;
  description: string;
  category: string;
  brand: string;
  unit_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorMapping {
  id: string;
  organization_id: string;
  vendor_id: string;
  vendor_part_number: string;
  manufacturer_part_number: string | null;
  internal_sku: string;
  confidence: number;
  match_source: MatchSource;
  times_seen: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  vendor_id: string | null;
  po_number: string;
  po_date: string | null;
  total: number | null;
  status: POStatus;
  extraction_confidence: number | null;
  pdf_storage_path: string;
  raw_extraction: Record<string, unknown> | null;
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  vendor?: Vendor;
  line_items?: POLineItem[];
  review_queue_item?: ReviewQueueItem;
}

export interface POLineItem {
  id: string;
  purchase_order_id: string;
  line_number: number;
  vendor_part_number: string;
  manufacturer_part_number: string | null;
  description: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  extended_price: number;
  matched_internal_sku: string | null;
  match_confidence: number | null;
  match_method: MatchMethod | null;
  is_matched: boolean;
  extraction_confidence: number;
  extraction_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewQueueItem {
  id: string;
  purchase_order_id: string;
  organization_id: string;
  priority: number;
  reason: string[];
  status: ReviewStatus;
  assigned_to: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  purchase_order?: PurchaseOrder;
}

export interface ExtractionLog {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  vendor_id: string | null;
  extraction_confidence: number;
  line_count: number;
  matched_count: number;
  processing_time_ms: number;
  api_cost: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface ExtractionCorrection {
  id: string;
  purchase_order_id: string;
  vendor_id: string | null;
  organization_id: string;
  field_path: string;
  field_name: string;
  line_number: number | null;
  ai_extracted_value: string | null;
  corrected_value: string | null;
  extraction_confidence: number | null;
  corrected_by: string;
  created_at: string;
}

export interface ExtractionAccuracyMetric {
  id: string;
  organization_id: string;
  vendor_id: string | null;
  field_name: string;
  time_window: 'daily' | 'weekly' | 'monthly' | 'all_time';
  window_start: string | null;
  window_end: string | null;
  total_extractions: number;
  correct_extractions: number;
  accuracy_rate: number;
  last_updated: string;
  created_at: string;
}

export interface POUsageTracking {
  id: string;
  organization_id: string;
  month: string;
  pos_processed: number;
  limit_at_time: number;
  created_at: string;
  updated_at: string;
}
