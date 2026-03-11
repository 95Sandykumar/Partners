import { SupabaseClient } from '@supabase/supabase-js';
import type { VendorMapping } from '@/types/database';
import type { MatchResult } from '@/types/extraction';
import { normalizePartNumber, stripKnownPrefix } from './prefix-normalizer';
import { createFuzzyMatcher } from './fuzzy-matcher';
import { findSemanticPartMatch, SEMANTIC_MATCH_THRESHOLD } from '@/lib/rag/retrieval-service';
import { createModuleLogger, errorContext } from '@/lib/logger';

const log = createModuleLogger('match-engine');

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

/**
 * Enhanced matching that includes Stage 5: Semantic matching via RAG.
 * Runs the standard 4-stage matching first, then attempts semantic
 * matching for any unmatched line items.
 *
 * @param supabase - Supabase client for RAG queries
 * @param orgId - Organization ID for tenant isolation
 * @param lineItems - Line items to match
 * @param mappings - Vendor mappings for deterministic matching
 * @returns Match results with semantic matches included
 */
export async function matchAllLineItemsWithSemantic(
  supabase: SupabaseClient,
  orgId: string,
  lineItems: Array<{
    line_number: number;
    vendor_part_number: string;
    manufacturer_part_number: string | null;
    description: string;
  }>,
  mappings: VendorMapping[]
): Promise<Record<number, MatchResult | null>> {
  // Stage 1-4: Run standard deterministic matching
  const results = matchAllLineItems(lineItems, mappings);

  // Stage 5: Semantic matching for unmatched items
  const unmatchedItems = lineItems.filter(
    (item) => results[item.line_number] === null
  );

  if (unmatchedItems.length === 0) {
    return results;
  }

  log.info(
    { orgId, unmatchedCount: unmatchedItems.length },
    'Attempting semantic matching for unmatched parts'
  );

  // Run semantic searches in parallel for unmatched items
  const semanticPromises = unmatchedItems.map(async (item) => {
    try {
      const semanticMatch = await findSemanticPartMatch(
        supabase,
        orgId,
        item.vendor_part_number,
        item.manufacturer_part_number,
        item.description
      );

      if (semanticMatch) {
        // Cap confidence at 70 for semantic matches
        const confidence = Math.min(
          Math.round(semanticMatch.similarity * 70),
          70
        );

        const matchResult: MatchResult = {
          internal_sku: semanticMatch.internalSku,
          confidence,
          match_method: 'semantic',
          matched_vendor_part: semanticMatch.vendorPartNumber,
          matched_mfg_part: semanticMatch.manufacturerPartNumber,
        };

        return { lineNumber: item.line_number, result: matchResult };
      }
    } catch (error) {
      log.warn(
        {
          ...errorContext(error),
          lineNumber: item.line_number,
          vendorPart: item.vendor_part_number,
        },
        'Semantic match failed for line item'
      );
    }

    return { lineNumber: item.line_number, result: null };
  });

  const semanticResults = await Promise.all(semanticPromises);

  // Merge semantic results into the main results
  let semanticMatchCount = 0;
  for (const { lineNumber, result } of semanticResults) {
    if (result !== null) {
      // Create new results object (immutability)
      results[lineNumber] = result;
      semanticMatchCount++;
    }
  }

  if (semanticMatchCount > 0) {
    log.info(
      { orgId, semanticMatchCount, totalUnmatched: unmatchedItems.length },
      'Semantic matching complete'
    );
  }

  return results;
}
