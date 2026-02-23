import { POLineItem, PurchaseOrder, ReviewQueueItem, Vendor } from './database';

export interface POWithDetails extends Omit<PurchaseOrder, 'vendor' | 'review_queue_item' | 'line_items'> {
  vendor: Vendor | null;
  line_items: POLineItem[];
  review_queue_item: ReviewQueueItem | null;
}

export interface POReviewData {
  po: POWithDetails;
  pdfUrl: string;
}

export interface LineItemEdit {
  id: string;
  vendor_part_number?: string;
  manufacturer_part_number?: string | null;
  description?: string;
  quantity?: number;
  unit_price?: number;
  extended_price?: number;
  matched_internal_sku?: string | null;
  match_confidence?: number | null;
  match_method?: string | null;
  is_matched?: boolean;
}

export interface POApprovalPayload {
  line_items: LineItemEdit[];
  review_notes?: string;
  new_mappings?: NewMappingPayload[];
}

export interface NewMappingPayload {
  vendor_id: string;
  vendor_part_number: string;
  manufacturer_part_number?: string;
  internal_sku: string;
  confidence: number;
}

export interface DashboardStats {
  pos_today: number;
  pending_reviews: number;
  avg_confidence: number;
  match_rate: number;
  total_pos: number;
  total_vendors: number;
}

export interface UploadResult {
  purchase_order_id: string;
  po_number: string;
  vendor_detected: string | null;
  extraction_confidence: number;
  line_count: number;
  matched_count: number;
  auto_approved: boolean;
  status: string;
}
