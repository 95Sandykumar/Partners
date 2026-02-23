import { describe, it, expect } from 'vitest';
import {
  AuthSetupSchema,
  ProductCreateSchema,
  ProductBulkCreateSchema,
  ProductUpdateSchema,
  VendorCreateSchema,
  VendorTemplateCreateSchema,
  POApprovalSchema,
  POUpdateSchema,
  MappingCreateSchema,
  MappingBulkCreateSchema,
  MatchRequestSchema,
  CheckoutSchema,
  sanitizeSearchParam,
} from '../schemas';

describe('AuthSetupSchema', () => {
  it('validates valid setup input', () => {
    const result = AuthSetupSchema.safeParse({ orgName: 'Acme Corp', fullName: 'John Doe' });
    expect(result.success).toBe(true);
  });

  it('rejects empty org name', () => {
    const result = AuthSetupSchema.safeParse({ orgName: '', fullName: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects missing full name', () => {
    const result = AuthSetupSchema.safeParse({ orgName: 'Acme' });
    expect(result.success).toBe(false);
  });
});

describe('ProductCreateSchema', () => {
  it('validates valid product', () => {
    const result = ProductCreateSchema.safeParse({ internal_sku: 'B422', description: 'Test', unit_price: 45 });
    expect(result.success).toBe(true);
  });

  it('rejects empty SKU', () => {
    const result = ProductCreateSchema.safeParse({ internal_sku: '' });
    expect(result.success).toBe(false);
  });

  it('defaults optional fields', () => {
    const result = ProductCreateSchema.safeParse({ internal_sku: 'TEST' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('');
      expect(result.data.unit_price).toBe(0);
    }
  });

  it('rejects negative price', () => {
    const result = ProductCreateSchema.safeParse({ internal_sku: 'X', unit_price: -1 });
    expect(result.success).toBe(false);
  });
});

describe('ProductBulkCreateSchema', () => {
  it('validates array of products', () => {
    const result = ProductBulkCreateSchema.safeParse([
      { internal_sku: 'A' },
      { internal_sku: 'B' },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = ProductBulkCreateSchema.safeParse([]);
    expect(result.success).toBe(false);
  });
});

describe('ProductUpdateSchema', () => {
  it('requires valid UUID id', () => {
    const result = ProductUpdateSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('validates with valid UUID', () => {
    const result = ProductUpdateSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });
});

describe('VendorCreateSchema', () => {
  it('validates valid vendor', () => {
    const result = VendorCreateSchema.safeParse({
      vendor_id: 'acme',
      vendor_name: 'Acme Corp',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing vendor_id', () => {
    const result = VendorCreateSchema.safeParse({ vendor_name: 'Test' });
    expect(result.success).toBe(false);
  });

  it('defaults email_domains and keywords', () => {
    const result = VendorCreateSchema.safeParse({ vendor_id: 'x', vendor_name: 'X' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email_domains).toEqual([]);
      expect(result.data.keywords).toEqual([]);
    }
  });
});

describe('VendorTemplateCreateSchema', () => {
  it('validates with defaults', () => {
    const result = VendorTemplateCreateSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe('1.0.0');
      expect(result.data.is_active).toBe(true);
    }
  });
});

describe('POApprovalSchema', () => {
  it('validates approve action', () => {
    const result = POApprovalSchema.safeParse({ action: 'approve' });
    expect(result.success).toBe(true);
  });

  it('validates reject action', () => {
    const result = POApprovalSchema.safeParse({ action: 'reject' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid action', () => {
    const result = POApprovalSchema.safeParse({ action: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('defaults action to approve', () => {
    const result = POApprovalSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('approve');
    }
  });
});

describe('POUpdateSchema', () => {
  it('validates status update', () => {
    const result = POUpdateSchema.safeParse({ status: 'approved' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = POUpdateSchema.safeParse({ status: 'invalid_status' });
    expect(result.success).toBe(false);
  });
});

describe('MappingCreateSchema', () => {
  it('validates valid mapping', () => {
    const result = MappingCreateSchema.safeParse({
      vendor_id: '550e8400-e29b-41d4-a716-446655440000',
      vendor_part_number: 'B422',
      internal_sku: 'B422',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing vendor_part_number', () => {
    const result = MappingCreateSchema.safeParse({
      vendor_id: '550e8400-e29b-41d4-a716-446655440000',
      internal_sku: 'B422',
    });
    expect(result.success).toBe(false);
  });
});

describe('MappingBulkCreateSchema', () => {
  it('rejects empty array', () => {
    const result = MappingBulkCreateSchema.safeParse([]);
    expect(result.success).toBe(false);
  });
});

describe('MatchRequestSchema', () => {
  it('validates with vendor part', () => {
    const result = MatchRequestSchema.safeParse({ vendor_part_number: 'B422' });
    expect(result.success).toBe(true);
  });

  it('rejects empty vendor part', () => {
    const result = MatchRequestSchema.safeParse({ vendor_part_number: '' });
    expect(result.success).toBe(false);
  });
});

describe('CheckoutSchema', () => {
  it('validates valid tiers', () => {
    expect(CheckoutSchema.safeParse({ tier: 'starter' }).success).toBe(true);
    expect(CheckoutSchema.safeParse({ tier: 'professional' }).success).toBe(true);
    expect(CheckoutSchema.safeParse({ tier: 'enterprise' }).success).toBe(true);
  });

  it('rejects free tier', () => {
    expect(CheckoutSchema.safeParse({ tier: 'free' }).success).toBe(false);
  });

  it('rejects invalid tier', () => {
    expect(CheckoutSchema.safeParse({ tier: 'gold' }).success).toBe(false);
  });
});

describe('sanitizeSearchParam', () => {
  it('returns null for null input', () => {
    expect(sanitizeSearchParam(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(sanitizeSearchParam('')).toBeNull();
  });

  it('removes SQL injection characters', () => {
    expect(sanitizeSearchParam("test'; DROP TABLE--")).toBe('test DROP TABLE--');
  });

  it('removes percent and underscore', () => {
    expect(sanitizeSearchParam('test%_value')).toBe('testvalue');
  });

  it('trims whitespace', () => {
    expect(sanitizeSearchParam('  test  ')).toBe('test');
  });

  it('truncates to 100 characters', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeSearchParam(long)!.length).toBe(100);
  });
});
