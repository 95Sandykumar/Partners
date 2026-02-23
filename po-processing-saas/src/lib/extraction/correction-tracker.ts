import { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractionResult, ExtractionLineItem } from '@/types/extraction';
import type { LineItemEdit } from '@/types/po';
import type { POLineItem } from '@/types/database';

interface CorrectionRecord {
  field_path: string;
  field_name: string;
  line_number: number | null;
  ai_extracted_value: string | null;
  corrected_value: string | null;
  extraction_confidence: number | null;
}

/** Fields we track corrections on for line items */
const TRACKED_LINE_FIELDS: Array<{
  extractionKey: keyof ExtractionLineItem;
  editKey: keyof LineItemEdit;
  dbKey: keyof POLineItem;
}> = [
  { extractionKey: 'vendor_part_number', editKey: 'vendor_part_number', dbKey: 'vendor_part_number' },
  { extractionKey: 'manufacturer_part_number', editKey: 'manufacturer_part_number', dbKey: 'manufacturer_part_number' },
  { extractionKey: 'description', editKey: 'description', dbKey: 'description' },
  { extractionKey: 'quantity', editKey: 'quantity', dbKey: 'quantity' },
  { extractionKey: 'unit_price', editKey: 'unit_price', dbKey: 'unit_price' },
  { extractionKey: 'extended_price', editKey: 'extended_price', dbKey: 'extended_price' },
];

/**
 * Detects corrections by comparing the original AI extraction with submitted edits.
 *
 * We match edits to original extraction items by looking up `currentDbItems`
 * (pre-edit DB rows) to find the extraction's line_number, then compare the
 * submitted edit values against the original AI-extracted values.
 */
export function detectCorrections(
  rawExtraction: ExtractionResult,
  submittedEdits: LineItemEdit[],
  currentDbItems: POLineItem[]
): CorrectionRecord[] {
  const corrections: CorrectionRecord[] = [];

  // Map DB item IDs to their line_number for lookup
  const dbItemMap = new Map(currentDbItems.map((item) => [item.id, item]));

  // Map line_number to original extraction data
  const extractionByLine = new Map(
    rawExtraction.line_items.map((item) => [item.line_number, item])
  );

  for (const edit of submittedEdits) {
    const dbItem = dbItemMap.get(edit.id);
    if (!dbItem) continue;

    const originalExtraction = extractionByLine.get(dbItem.line_number);
    if (!originalExtraction) continue;

    for (const { extractionKey, editKey, dbKey } of TRACKED_LINE_FIELDS) {
      const editValue = edit[editKey];
      // Only check fields that were actually submitted in the edit
      if (editValue === undefined) continue;

      const aiValue = originalExtraction[extractionKey];

      // Compare stringified values to handle number/string differences
      const aiStr = String(aiValue ?? '');
      const editStr = String(editValue ?? '');

      if (aiStr !== editStr) {
        corrections.push({
          field_path: `line_items[${dbItem.line_number}].${extractionKey}`,
          field_name: String(extractionKey),
          line_number: dbItem.line_number,
          ai_extracted_value: aiStr,
          corrected_value: editStr,
          extraction_confidence: originalExtraction.confidence,
        });
      }
    }
  }

  return corrections;
}

/** Save detected corrections to the database */
export async function recordCorrections(
  supabase: SupabaseClient,
  poId: string,
  vendorId: string | null,
  organizationId: string,
  userId: string,
  corrections: CorrectionRecord[]
): Promise<void> {
  if (corrections.length === 0) return;

  const records = corrections.map((c) => ({
    purchase_order_id: poId,
    vendor_id: vendorId,
    organization_id: organizationId,
    field_path: c.field_path,
    field_name: c.field_name,
    line_number: c.line_number,
    ai_extracted_value: c.ai_extracted_value,
    corrected_value: c.corrected_value,
    extraction_confidence: c.extraction_confidence,
    corrected_by: userId,
  }));

  const { error } = await supabase.from('extraction_corrections').insert(records);
  if (error) {
    console.error('Failed to record corrections:', error.message);
  }
}

/**
 * Update accuracy metrics for a vendor. Called async after recording corrections.
 * Counts total POs vs POs with corrections per field to calculate accuracy.
 */
export async function updateAccuracyMetrics(
  supabase: SupabaseClient,
  organizationId: string,
  vendorId: string | null
): Promise<void> {
  // Get correction counts grouped by field
  let query = supabase
    .from('extraction_corrections')
    .select('field_name')
    .eq('organization_id', organizationId);

  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }

  const { data: corrections, error } = await query;
  if (error || !corrections) return;

  // Count corrections per field
  const fieldCounts = new Map<string, number>();
  for (const c of corrections) {
    fieldCounts.set(c.field_name, (fieldCounts.get(c.field_name) || 0) + 1);
  }

  // Get total POs for this org+vendor to estimate total extractions per field
  let poQuery = supabase
    .from('purchase_orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (vendorId) {
    poQuery = poQuery.eq('vendor_id', vendorId);
  }

  const { count: totalPOs } = await poQuery;
  if (!totalPOs || totalPOs === 0) return;

  // Upsert metrics for each field
  for (const [fieldName, incorrectCount] of fieldCounts) {
    const correctCount = Math.max(0, totalPOs - incorrectCount);
    const accuracyRate = totalPOs > 0
      ? Math.round((correctCount / totalPOs) * 10000) / 100
      : 0;

    await supabase.from('extraction_accuracy_metrics').upsert(
      {
        organization_id: organizationId,
        vendor_id: vendorId,
        field_name: fieldName,
        time_window: 'all_time',
        window_start: null,
        window_end: null,
        total_extractions: totalPOs,
        correct_extractions: correctCount,
        accuracy_rate: accuracyRate,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'organization_id,vendor_id,field_name,time_window,window_start' }
    );
  }
}
