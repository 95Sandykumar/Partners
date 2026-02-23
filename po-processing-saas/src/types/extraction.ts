export interface ExtractionMetadata {
  vendor_detected: string;
  template_used: string | null;
  pages_processed: number;
  overall_confidence: number;
  extraction_timestamp: string;
}

export interface ExtractionHeader {
  po_number: string;
  po_date: string;
  vendor_name: string;
  vendor_address: string | null;
  ship_to_name: string | null;
  ship_to_address: string | null;
  payment_terms: string | null;
  currency: string;
}

export interface ExtractionLineItem {
  line_number: number;
  vendor_part_number: string;
  manufacturer_part_number: string | null;
  description: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  extended_price: number;
  confidence: number;
  extraction_notes: string | null;
}

export interface ExtractionTotals {
  subtotal: number | null;
  tax: number | null;
  shipping: number | null;
  total: number;
}

export interface ExtractionResult {
  extraction_metadata: ExtractionMetadata;
  header: ExtractionHeader;
  line_items: ExtractionLineItem[];
  totals: ExtractionTotals;
  extraction_issues: string[];
}

export interface VendorDetectionResult {
  vendor_id: string | null;
  vendor_name: string | null;
  confidence: number;
  matched_by: string;
  template_id: string | null;
}

export interface MatchResult {
  internal_sku: string;
  confidence: number;
  match_method: 'exact' | 'prefix' | 'fuzzy' | 'manual';
  matched_vendor_part: string;
  matched_mfg_part: string | null;
}

export interface ValidationIssue {
  line_number: number | null;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PipelineResult {
  success: boolean;
  purchase_order_id: string;
  extraction: ExtractionResult;
  vendor_detection: VendorDetectionResult;
  matches: Record<number, MatchResult | null>;
  validation_issues: ValidationIssue[];
  overall_confidence: number;
  auto_approved: boolean;
  processing_time_ms: number;
}
