import { z } from 'zod';

// ============================================================
// Auth
// ============================================================
export const AuthSetupSchema = z.object({
  orgName: z.string().min(1, 'Organization name is required').max(100),
  fullName: z.string().min(1, 'Full name is required').max(100),
});

// ============================================================
// Products
// ============================================================
export const ProductCreateSchema = z.object({
  internal_sku: z.string().min(1, 'SKU is required').max(50),
  description: z.string().max(500).default(''),
  category: z.string().max(100).default(''),
  brand: z.string().max(100).default(''),
  unit_price: z.number().min(0).default(0),
});

export const ProductBulkCreateSchema = z.array(ProductCreateSchema).min(1).max(1000);

export const ProductUpdateSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
  internal_sku: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  unit_price: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const ProductDeleteSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

// ============================================================
// Vendors
// ============================================================
export const VendorCreateSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor ID is required').max(50),
  vendor_name: z.string().min(1, 'Vendor name is required').max(200),
  email_domains: z.array(z.string().max(100)).default([]),
  keywords: z.array(z.string().max(200)).default([]),
  po_format_type: z.enum(['simple', 'complex']).default('simple'),
  template_data: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Vendor Templates
// ============================================================
export const VendorTemplateCreateSchema = z.object({
  version: z.string().max(20).default('1.0.0'),
  template_data: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean().default(true),
});

export const VendorTemplateUpdateSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  template_data: z.record(z.string(), z.unknown()).optional(),
  version: z.string().max(20).optional(),
  is_active: z.boolean().optional(),
});

// ============================================================
// PO Approval
// ============================================================
const LineItemEditSchema = z.object({
  id: z.string().uuid(),
  vendor_part_number: z.string().optional(),
  manufacturer_part_number: z.string().nullable().optional(),
  description: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit_price: z.number().min(0).optional(),
  extended_price: z.number().min(0).optional(),
  matched_internal_sku: z.string().nullable().optional(),
  match_confidence: z.number().nullable().optional(),
  match_method: z.string().nullable().optional(),
  is_matched: z.boolean().optional(),
});

const NewMappingSchema = z.object({
  vendor_id: z.string().uuid(),
  vendor_part_number: z.string().min(1),
  manufacturer_part_number: z.string().optional(),
  internal_sku: z.string().min(1),
  confidence: z.number().min(0).max(100).default(100),
});

export const POApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']).default('approve'),
  line_items: z.array(LineItemEditSchema).optional(),
  review_notes: z.string().max(2000).optional(),
  new_mappings: z.array(NewMappingSchema).optional(),
});

// ============================================================
// PO Update
// ============================================================
export const POUpdateSchema = z.object({
  status: z.enum(['pending_review', 'approved', 'rejected', 'processed']).optional(),
  total: z.number().min(0).optional(),
  line_items: z.array(LineItemEditSchema).optional(),
});

// ============================================================
// Mappings
// ============================================================
export const MappingCreateSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  vendor_part_number: z.string().min(1, 'Vendor part number is required').max(100),
  manufacturer_part_number: z.string().max(100).nullable().optional(),
  internal_sku: z.string().min(1, 'Internal SKU is required').max(50),
  confidence: z.number().min(0).max(100).default(100),
  match_source: z.enum(['manual', 'extracted', 'verified', 'auto']).default('manual'),
  is_verified: z.boolean().default(false),
});

export const MappingBulkCreateSchema = z.array(MappingCreateSchema).min(1).max(1000);

export const MappingUpdateSchema = z.object({
  id: z.string().uuid('Invalid mapping ID'),
  vendor_part_number: z.string().min(1).max(100).optional(),
  manufacturer_part_number: z.string().max(100).nullable().optional(),
  internal_sku: z.string().min(1).max(50).optional(),
  confidence: z.number().min(0).max(100).optional(),
  match_source: z.enum(['manual', 'extracted', 'verified', 'auto']).optional(),
  is_verified: z.boolean().optional(),
});

// ============================================================
// Match Request
// ============================================================
export const MatchRequestSchema = z.object({
  vendor_part_number: z.string().min(1, 'Vendor part number is required').max(100),
  manufacturer_part_number: z.string().max(100).nullable().optional(),
});

// ============================================================
// Billing Checkout
// ============================================================
export const CheckoutSchema = z.object({
  tier: z.enum(['starter', 'professional', 'enterprise'], {
    message: 'Invalid tier. Must be starter, professional, or enterprise',
  }),
});

// ============================================================
// Search Params Sanitizer
// ============================================================
export function sanitizeSearchParam(search: string | null): string | null {
  if (!search) return null;
  // Remove SQL injection characters and limit length
  return search
    .replace(/[%_'"\\;]/g, '')
    .trim()
    .slice(0, 100) || null;
}
