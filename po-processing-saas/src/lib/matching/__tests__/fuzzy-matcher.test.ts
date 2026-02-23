import { describe, it, expect } from 'vitest';
import { createFuzzyMatcher } from '../fuzzy-matcher';
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

const MAPPINGS: VendorMapping[] = [
  makeMapping({ id: '1', vendor_part_number: 'B422', internal_sku: 'B422' }),
  makeMapping({ id: '2', vendor_part_number: 'C315-3545', internal_sku: 'C315-3545' }),
  makeMapping({ id: '3', vendor_part_number: 'D100-0035', internal_sku: 'D100-0035' }),
  makeMapping({ id: '4', vendor_part_number: 'B5662', internal_sku: 'B5662' }),
];

describe('createFuzzyMatcher', () => {
  it('finds exact matches with high score', () => {
    const matcher = createFuzzyMatcher(MAPPINGS);
    const results = matcher.search('B422');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].mapping.internal_sku).toBe('B422');
    expect(results[0].score).toBeGreaterThanOrEqual(80);
  });

  it('finds close matches', () => {
    const matcher = createFuzzyMatcher(MAPPINGS);
    const results = matcher.search('B5662');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].mapping.internal_sku).toBe('B5662');
  });

  it('returns empty for very short queries', () => {
    const matcher = createFuzzyMatcher(MAPPINGS);
    const results = matcher.search('B');
    expect(results).toHaveLength(0);
  });

  it('returns empty for empty query', () => {
    const matcher = createFuzzyMatcher(MAPPINGS);
    const results = matcher.search('');
    expect(results).toHaveLength(0);
  });

  it('respects limit parameter', () => {
    const matcher = createFuzzyMatcher(MAPPINGS);
    const results = matcher.search('B', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('returns score between 0 and 100', () => {
    const matcher = createFuzzyMatcher(MAPPINGS);
    const results = matcher.search('D100-0035');
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});
