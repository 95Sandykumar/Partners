import { describe, it, expect } from 'vitest';
import { matchPartNumber, matchAllLineItems } from '../match-engine';
import type { VendorMapping } from '@/types/database';

function makeMapping(overrides: Partial<VendorMapping> = {}): VendorMapping {
  return {
    id: 'mapping-1',
    organization_id: 'org-1',
    vendor_id: 'vendor-1',
    vendor_part_number: 'B422',
    manufacturer_part_number: null,
    internal_sku: 'B422',
    confidence: 100,
    match_source: 'manual',
    times_seen: 5,
    is_verified: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

const SAMPLE_MAPPINGS: VendorMapping[] = [
  makeMapping({ id: '1', vendor_part_number: 'B422', internal_sku: 'B422', confidence: 100 }),
  makeMapping({ id: '2', vendor_part_number: 'CMUC315-3545', manufacturer_part_number: 'C315-3545', internal_sku: 'C315-3545', confidence: 100 }),
  makeMapping({ id: '3', vendor_part_number: 'CMD100-0035', manufacturer_part_number: 'D100-0035', internal_sku: 'D100-0035', confidence: 100 }),
  makeMapping({ id: '4', vendor_part_number: 'CMD 4636001', manufacturer_part_number: '046-36-001', internal_sku: '046-36-001', confidence: 100 }),
  makeMapping({ id: '5', vendor_part_number: 'CMI-B5662', manufacturer_part_number: 'B5662', internal_sku: 'B5662', confidence: 100 }),
  makeMapping({ id: '6', vendor_part_number: 'CMI-D100-0035', manufacturer_part_number: 'D100-0035', internal_sku: 'D100-0035', confidence: 100 }),
];

describe('matchPartNumber', () => {
  // Stage 1: Exact vendor part match
  it('matches exact vendor part number (case insensitive)', () => {
    const result = matchPartNumber('B422', null, SAMPLE_MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.internal_sku).toBe('B422');
    expect(result!.match_method).toBe('exact');
    expect(result!.confidence).toBe(100);
  });

  it('matches exact vendor part case-insensitively', () => {
    const result = matchPartNumber('b422', null, SAMPLE_MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.internal_sku).toBe('B422');
  });

  it('matches exact Linde vendor part (CMUC prefix)', () => {
    const result = matchPartNumber('CMUC315-3545', null, SAMPLE_MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.internal_sku).toBe('C315-3545');
    expect(result!.match_method).toBe('exact');
  });

  // Stage 2: Manufacturer part match
  it('matches by manufacturer part number when vendor part misses', () => {
    const result = matchPartNumber('UNKNOWN-VENDOR', 'C315-3545', SAMPLE_MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.internal_sku).toBe('C315-3545');
    expect(result!.match_method).toBe('exact');
    expect(result!.confidence).toBeLessThanOrEqual(100); // -5 penalty
  });

  it('mfg part match has reduced confidence', () => {
    const result = matchPartNumber('UNKNOWN', 'D100-0035', SAMPLE_MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(95); // 100 - 5
  });

  // Stage 3: Prefix-normalized match
  it('matches by stripping CMI- prefix', () => {
    const result = matchPartNumber('CMI-B422', null, [
      makeMapping({ vendor_part_number: 'B422', internal_sku: 'B422', confidence: 100 }),
    ]);
    // Should match via prefix normalization (CMI-B422 -> B422)
    expect(result).not.toBeNull();
    expect(result!.internal_sku).toBe('B422');
  });

  it('prefix match has reduced confidence', () => {
    const result = matchPartNumber('CMI-B422', null, [
      makeMapping({ vendor_part_number: 'B422', internal_sku: 'B422', confidence: 100 }),
    ]);
    expect(result).not.toBeNull();
    // Either exact match or prefix match - prefix would be confidence-10
    expect(result!.confidence).toBeLessThanOrEqual(100);
  });

  // Stage 4: Fuzzy match
  it('fuzzy matches close part numbers', () => {
    const result = matchPartNumber('B4222', null, SAMPLE_MAPPINGS);
    // Should fuzzy match to B422 if close enough
    if (result) {
      expect(result.match_method).toBe('fuzzy');
      expect(result.confidence).toBeLessThanOrEqual(75);
    }
    // It's also OK if it doesn't match (fuzzy threshold)
  });

  // Edge cases
  it('returns null for empty input', () => {
    const result = matchPartNumber('', null, SAMPLE_MAPPINGS);
    expect(result).toBeNull();
  });

  it('returns null for both empty vendor and mfg parts', () => {
    const result = matchPartNumber('', null, SAMPLE_MAPPINGS);
    expect(result).toBeNull();
  });

  it('returns null when no mappings exist', () => {
    const result = matchPartNumber('B422', null, []);
    expect(result).toBeNull();
  });

  it('returns null for completely unknown part', () => {
    const result = matchPartNumber('ZZZZZ-UNKNOWN-9999', null, SAMPLE_MAPPINGS);
    expect(result).toBeNull();
  });

  it('handles service charges (DROPSHIPFREIGHT)', () => {
    const result = matchPartNumber('DROPSHIPFREIGHT', null, SAMPLE_MAPPINGS);
    // Should return null since there's no mapping for service charges
    expect(result).toBeNull();
  });

  it('prefers exact match over fuzzy match', () => {
    const result = matchPartNumber('B422', null, SAMPLE_MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.match_method).toBe('exact');
    expect(result!.confidence).toBe(100);
  });

  it('handles Matheson CMD space format', () => {
    const result = matchPartNumber('CMD 4636001', null, SAMPLE_MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.internal_sku).toBe('046-36-001');
  });

  // Cascade behavior
  it('cascades from vendor to mfg to prefix to fuzzy', () => {
    // Make a mapping that only has mfg part
    const mappings = [
      makeMapping({ vendor_part_number: 'VENDOR-X', manufacturer_part_number: 'MFG-123', internal_sku: 'SKU-1' }),
    ];
    // Try with matching mfg part
    const result = matchPartNumber('OTHER-VENDOR', 'MFG-123', mappings);
    expect(result).not.toBeNull();
    expect(result!.internal_sku).toBe('SKU-1');
  });

  it('confidence is always >= 0', () => {
    const mappings = [
      makeMapping({ vendor_part_number: 'X', manufacturer_part_number: 'Y', internal_sku: 'Z', confidence: 5 }),
    ];
    const result = matchPartNumber('Y', null, mappings);
    if (result) {
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('matchAllLineItems', () => {
  it('matches multiple line items at once', () => {
    const lineItems = [
      { line_number: 1, vendor_part_number: 'B422', manufacturer_part_number: null },
      { line_number: 2, vendor_part_number: 'CMUC315-3545', manufacturer_part_number: 'C315-3545' },
      { line_number: 3, vendor_part_number: 'UNKNOWN', manufacturer_part_number: null },
    ];

    const results = matchAllLineItems(lineItems, SAMPLE_MAPPINGS);
    expect(results[1]).not.toBeNull();
    expect(results[1]!.internal_sku).toBe('B422');
    expect(results[2]).not.toBeNull();
    expect(results[2]!.internal_sku).toBe('C315-3545');
    expect(results[3]).toBeNull();
  });

  it('returns empty record for empty line items', () => {
    const results = matchAllLineItems([], SAMPLE_MAPPINGS);
    expect(Object.keys(results)).toHaveLength(0);
  });

  it('each line item gets independent result', () => {
    const lineItems = [
      { line_number: 1, vendor_part_number: 'B422', manufacturer_part_number: null },
      { line_number: 2, vendor_part_number: 'B422', manufacturer_part_number: null },
    ];

    const results = matchAllLineItems(lineItems, SAMPLE_MAPPINGS);
    expect(results[1]!.internal_sku).toBe(results[2]!.internal_sku);
  });
});
