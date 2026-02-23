import type { VendorMapping } from '@/types/database';
import type { MatchResult } from '@/types/extraction';
import { normalizePartNumber, stripKnownPrefix } from './prefix-normalizer';
import { createFuzzyMatcher } from './fuzzy-matcher';

export function matchPartNumber(
  vendorPartNumber: string,
  manufacturerPartNumber: string | null,
  mappings: VendorMapping[]
): MatchResult | null {
  if (!vendorPartNumber && !manufacturerPartNumber) return null;

  // Stage 1: Exact match on vendor part number
  const exactVendorMatch = mappings.find(
    (m) =>
      m.vendor_part_number.toUpperCase() === vendorPartNumber?.toUpperCase()
  );
  if (exactVendorMatch) {
    return {
      internal_sku: exactVendorMatch.internal_sku,
      confidence: exactVendorMatch.confidence,
      match_method: 'exact',
      matched_vendor_part: exactVendorMatch.vendor_part_number,
      matched_mfg_part: exactVendorMatch.manufacturer_part_number,
    };
  }

  // Stage 2: Exact match on manufacturer part number
  if (manufacturerPartNumber) {
    const exactMfgMatch = mappings.find(
      (m) =>
        m.manufacturer_part_number?.toUpperCase() ===
        manufacturerPartNumber.toUpperCase()
    );
    if (exactMfgMatch) {
      return {
        internal_sku: exactMfgMatch.internal_sku,
        confidence: Math.max(exactMfgMatch.confidence - 5, 0),
        match_method: 'exact',
        matched_vendor_part: exactMfgMatch.vendor_part_number,
        matched_mfg_part: exactMfgMatch.manufacturer_part_number,
      };
    }
  }

  // Stage 3: Prefix-normalized match
  const strippedVendor = stripKnownPrefix(vendorPartNumber);
  const normalizedVendor = normalizePartNumber(strippedVendor);

  for (const mapping of mappings) {
    const strippedMapping = stripKnownPrefix(mapping.vendor_part_number);
    const normalizedMapping = normalizePartNumber(strippedMapping);

    if (normalizedVendor && normalizedMapping && normalizedVendor === normalizedMapping) {
      return {
        internal_sku: mapping.internal_sku,
        confidence: Math.max(mapping.confidence - 10, 0),
        match_method: 'prefix',
        matched_vendor_part: mapping.vendor_part_number,
        matched_mfg_part: mapping.manufacturer_part_number,
      };
    }

    // Also try against MFG part
    if (mapping.manufacturer_part_number) {
      const normalizedMfg = normalizePartNumber(mapping.manufacturer_part_number);
      if (normalizedVendor && normalizedMfg && normalizedVendor === normalizedMfg) {
        return {
          internal_sku: mapping.internal_sku,
          confidence: Math.max(mapping.confidence - 10, 0),
          match_method: 'prefix',
          matched_vendor_part: mapping.vendor_part_number,
          matched_mfg_part: mapping.manufacturer_part_number,
        };
      }
    }
  }

  // Also normalize MFG part if provided
  if (manufacturerPartNumber) {
    const normalizedMfgInput = normalizePartNumber(manufacturerPartNumber);
    for (const mapping of mappings) {
      const normalizedMapping = normalizePartNumber(
        stripKnownPrefix(mapping.vendor_part_number)
      );
      if (normalizedMfgInput && normalizedMapping && normalizedMfgInput === normalizedMapping) {
        return {
          internal_sku: mapping.internal_sku,
          confidence: Math.max(mapping.confidence - 15, 0),
          match_method: 'prefix',
          matched_vendor_part: mapping.vendor_part_number,
          matched_mfg_part: mapping.manufacturer_part_number,
        };
      }
    }
  }

  // Stage 4: Fuzzy match
  const fuzzyMatcher = createFuzzyMatcher(mappings);
  const fuzzyResults = fuzzyMatcher.search(vendorPartNumber, 1);

  if (fuzzyResults.length > 0 && fuzzyResults[0].score >= 70) {
    const best = fuzzyResults[0];
    return {
      internal_sku: best.mapping.internal_sku,
      confidence: Math.min(best.score, 75),
      match_method: 'fuzzy',
      matched_vendor_part: best.mapping.vendor_part_number,
      matched_mfg_part: best.mapping.manufacturer_part_number,
    };
  }

  // Try fuzzy on MFG part
  if (manufacturerPartNumber) {
    const mfgFuzzy = fuzzyMatcher.search(manufacturerPartNumber, 1);
    if (mfgFuzzy.length > 0 && mfgFuzzy[0].score >= 70) {
      const best = mfgFuzzy[0];
      return {
        internal_sku: best.mapping.internal_sku,
        confidence: Math.min(best.score - 5, 70),
        match_method: 'fuzzy',
        matched_vendor_part: best.mapping.vendor_part_number,
        matched_mfg_part: best.mapping.manufacturer_part_number,
      };
    }
  }

  return null;
}

export function matchAllLineItems(
  lineItems: Array<{
    line_number: number;
    vendor_part_number: string;
    manufacturer_part_number: string | null;
  }>,
  mappings: VendorMapping[]
): Record<number, MatchResult | null> {
  const results: Record<number, MatchResult | null> = {};

  for (const item of lineItems) {
    results[item.line_number] = matchPartNumber(
      item.vendor_part_number,
      item.manufacturer_part_number,
      mappings
    );
  }

  return results;
}
