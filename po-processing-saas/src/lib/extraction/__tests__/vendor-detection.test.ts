import { describe, it, expect } from 'vitest';
import { detectVendor } from '../vendor-detection';

const mockVendors = [
  {
    id: 'v1',
    vendor_id: 'powerweld',
    vendor_name: 'Powerweld Inc.',
    email_domains: ['powerweldinc.com'],
    keywords: ['POWERWELD', 'VALPARAISO'],
    po_format_type: 'simple' as const,
    organization_id: 'org1',
    templates: [{ id: 'tmpl1' }],
    created_at: '',
    updated_at: '',
  },
  {
    id: 'v2',
    vendor_id: 'linde',
    vendor_name: 'Linde Gas & Equipment Inc.',
    email_domains: ['linde.com'],
    keywords: ['Linde Gas', 'LGEPKG'],
    po_format_type: 'complex' as const,
    organization_id: 'org1',
    templates: [],
    created_at: '',
    updated_at: '',
  },
  {
    id: 'v3',
    vendor_id: 'matheson',
    vendor_name: 'Matheson Tri-Gas Inc.',
    email_domains: ['mathesongas.com'],
    keywords: ['MATHESON', 'The Gas Professionals'],
    po_format_type: 'complex' as const,
    organization_id: 'org1',
    templates: [],
    created_at: '',
    updated_at: '',
  },
];

describe('detectVendor', () => {
  it('detects vendor by email domain', () => {
    const result = detectVendor('some pdf text', 'buyer@powerweldinc.com', mockVendors as never[]);
    expect(result.vendor_id).toBe('v1');
    expect(result.confidence).toBe(95);
    expect(result.matched_by).toContain('email_domain');
  });

  it('detects vendor by email domain (case insensitive)', () => {
    const result = detectVendor('', 'order@LINDE.COM', mockVendors as never[]);
    expect(result.vendor_id).toBe('v2');
  });

  it('detects vendor by keyword in text', () => {
    const result = detectVendor('PO from POWERWELD company in VALPARAISO', undefined, mockVendors as never[]);
    expect(result.vendor_id).toBe('v1');
    expect(result.matched_by).toContain('keyword');
  });

  it('detects vendor by name in text', () => {
    const result = detectVendor('Order from Matheson Tri-Gas Inc.', undefined, mockVendors as never[]);
    expect(result.vendor_id).toBe('v3');
  });

  it('returns no match for unknown vendor', () => {
    const result = detectVendor('Random text with no vendor info', undefined, mockVendors as never[]);
    expect(result.vendor_id).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.matched_by).toBe('none');
  });

  it('prefers email match over keyword match', () => {
    const result = detectVendor(
      'POWERWELD order details',
      'order@linde.com',
      mockVendors as never[]
    );
    expect(result.vendor_id).toBe('v2'); // email wins
    expect(result.confidence).toBe(95);
  });

  it('returns template_id when available', () => {
    const result = detectVendor('', 'buyer@powerweldinc.com', mockVendors as never[]);
    expect(result.template_id).toBe('tmpl1');
  });

  it('returns null template_id when vendor has no templates', () => {
    const result = detectVendor('', 'order@linde.com', mockVendors as never[]);
    expect(result.template_id).toBeNull();
  });

  it('handles empty vendors list', () => {
    const result = detectVendor('any text', 'buyer@test.com', []);
    expect(result.vendor_id).toBeNull();
  });
});
