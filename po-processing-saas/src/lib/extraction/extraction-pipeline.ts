import { SupabaseClient } from '@supabase/supabase-js';
import { detectVendor } from './vendor-detection';
import { buildExtractionPrompt } from './prompt-builder';
import { extractPOWithVision } from './mistral-api';
import { validateExtraction } from './validation';
import { calculateConfidence } from './confidence-scoring';
import { matchAllLineItems } from '../matching/match-engine';
import type { PipelineResult } from '@/types/extraction';

interface PipelineInput {
  pdfBase64: string;
  fileName: string;
  senderEmail?: string;
  orgId: string;
  userId: string;
  pdfStoragePath: string;
}

export async function runExtractionPipeline(
  supabase: SupabaseClient,
  input: PipelineInput
): Promise<PipelineResult> {
  const startTime = Date.now();

  // 1. Get vendors for this organization
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*, templates:vendor_templates(*)')
    .eq('organization_id', input.orgId);

  // 2. Detect vendor
  const vendorDetection = detectVendor(
    '', // We don't have raw text from PDF, Claude will handle that
    input.senderEmail,
    vendors || []
  );

  // 3. Load vendor template if detected
  let vendorTemplate = null;
  let vendorSlug: string | undefined;
  if (vendorDetection.template_id) {
    const { data } = await supabase
      .from('vendor_templates')
      .select('*')
      .eq('id', vendorDetection.template_id)
      .eq('is_active', true)
      .single();
    vendorTemplate = data;
    // Get the vendor_id slug for prompt building
    if (vendorDetection.vendor_id) {
      const vendor = vendors?.find((v) => v.id === vendorDetection.vendor_id);
      vendorSlug = vendor?.vendor_id;
    }
  }

  // 4. Build extraction prompt
  const { systemPrompt, userPrompt } = buildExtractionPrompt(
    vendorTemplate,
    vendorSlug
  );

  // 5. Call Claude Vision API
  const { result: extraction, usage, cost: extractionCost } = await extractPOWithVision(
    input.pdfBase64,
    systemPrompt,
    userPrompt
  );

  // Cost ceiling warning
  if (extractionCost > 0.50) {
    console.warn(
      `[cost-warning] Extraction cost $${extractionCost.toFixed(4)} exceeds $0.50 ceiling for PO "${extraction.header.po_number}" (org: ${input.orgId})`
    );
  }

  // 6. Validate extraction
  const templateData = vendorTemplate?.template_data as Record<string, unknown> | undefined;
  const vendorPatterns = templateData?.part_number_patterns as string[] | undefined;
  const validationIssues = validateExtraction(extraction, vendorPatterns);

  // 7. Calculate confidence
  const confidenceAdjustments = templateData?.confidence_adjustments as Record<string, number> | undefined;
  const overallConfidence = calculateConfidence(
    extraction,
    validationIssues,
    confidenceAdjustments
  );

  // 8. Match parts
  const { data: mappings } = await supabase
    .from('vendor_mappings')
    .select('*')
    .eq('organization_id', input.orgId);

  const matches = matchAllLineItems(extraction.line_items, mappings || []);

  // 9. Save to database
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      organization_id: input.orgId,
      vendor_id: vendorDetection.vendor_id,
      po_number: extraction.header.po_number || `UNKNOWN-${Date.now()}`,
      po_date: extraction.header.po_date || null,
      total: extraction.totals.total || null,
      status: 'pending_review',
      extraction_confidence: overallConfidence,
      pdf_storage_path: input.pdfStoragePath,
      raw_extraction: extraction as unknown as Record<string, unknown>,
      created_by: input.userId,
    })
    .select()
    .single();

  if (poError || !po) {
    throw new Error(`Failed to save PO: ${poError?.message}`);
  }

  // 10. Save line items
  const lineItemRows = extraction.line_items.map((item) => {
    const match = matches[item.line_number];
    return {
      purchase_order_id: po.id,
      line_number: item.line_number,
      vendor_part_number: item.vendor_part_number,
      manufacturer_part_number: item.manufacturer_part_number,
      description: item.description,
      quantity: item.quantity,
      unit_of_measure: item.unit_of_measure || 'EA',
      unit_price: item.unit_price,
      extended_price: item.extended_price,
      matched_internal_sku: match?.internal_sku || null,
      match_confidence: match?.confidence || null,
      match_method: match?.match_method || null,
      is_matched: !!match,
      extraction_confidence: item.confidence,
      extraction_notes: item.extraction_notes,
    };
  });

  if (lineItemRows.length > 0) {
    await supabase.from('po_line_items').insert(lineItemRows);
  }

  // 11. Determine routing
  const matchedCount = Object.values(matches).filter((m) => m !== null).length;
  const errorIssues = validationIssues.filter((i) => i.severity === 'error');
  const autoApproved =
    overallConfidence >= 85 && errorIssues.length === 0;

  if (autoApproved) {
    await supabase
      .from('purchase_orders')
      .update({ status: 'approved' })
      .eq('id', po.id);
  } else {
    // Add to review queue
    const reasons: string[] = [];
    if (overallConfidence < 85) reasons.push(`Low confidence: ${overallConfidence}%`);
    if (errorIssues.length > 0) reasons.push(`${errorIssues.length} validation error(s)`);
    if (matchedCount < extraction.line_items.length) {
      reasons.push(
        `${extraction.line_items.length - matchedCount} unmatched part(s)`
      );
    }

    await supabase.from('review_queue').insert({
      purchase_order_id: po.id,
      organization_id: input.orgId,
      priority: overallConfidence < 60 ? 2 : 1,
      reason: reasons,
      status: 'pending',
    });
  }

  // 12. Log extraction
  const processingTime = Date.now() - startTime;

  await supabase.from('extraction_logs').insert({
    organization_id: input.orgId,
    purchase_order_id: po.id,
    vendor_id: vendorDetection.vendor_id,
    extraction_confidence: overallConfidence,
    line_count: extraction.line_items.length,
    matched_count: matchedCount,
    processing_time_ms: processingTime,
    api_cost: extractionCost,
    success: true,
  });

  return {
    success: true,
    purchase_order_id: po.id,
    extraction,
    vendor_detection: vendorDetection,
    matches,
    validation_issues: validationIssues,
    overall_confidence: overallConfidence,
    auto_approved: autoApproved,
    processing_time_ms: processingTime,
  };
}
