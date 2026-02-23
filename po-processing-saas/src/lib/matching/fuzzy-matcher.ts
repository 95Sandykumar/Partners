import Fuse from 'fuse.js';
import type { VendorMapping } from '@/types/database';

interface FuzzyMatchResult {
  mapping: VendorMapping;
  score: number;
}

export function createFuzzyMatcher(mappings: VendorMapping[]) {
  const fuse = new Fuse(mappings, {
    keys: ['vendor_part_number', 'manufacturer_part_number', 'internal_sku'],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 3,
  });

  return {
    search(query: string, limit = 5): FuzzyMatchResult[] {
      if (!query || query.length < 2) return [];

      const results = fuse.search(query, { limit });
      return results.map((r) => ({
        mapping: r.item,
        score: Math.round((1 - (r.score || 0)) * 100),
      }));
    },
  };
}
