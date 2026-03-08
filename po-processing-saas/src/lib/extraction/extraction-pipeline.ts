import { SupabaseClient } from '@supabase/supabase-js';
import { detectVendor } from './vendor-detection';
import { buildExtractionPrompt } from './prompt-builder';
import { validateExtraction } from './validation';
import { calculateConfidence } from './confidence-scoring';
import { matchAllLineItems } from '../matching/match-engine';
import { getProviderMode } from './vision-provider';
import { deepseekProvider } from './deepseek-provider';
import { mistralProvider } from './mistral-api';
import type { VisionProviderResult } from './vision-provider';
import type { PipelineResult } from '@/types/extraction';

const HYBRID_CONFIDENCE_THRESHOLD = 75;

interface PipelineInput {
  pdfBase64: string;
  fileName: string;
  senderEmail?: string;
  orgId: string;
  userId: string;
  pdfStoragePath: string;
}

export async function extractWithProvider(
  pdfBase64: string,
  systemPrompt: string,
  userPrompt: string
): Promise<VisionProviderResult> {
  const mode = getProviderMode();

  if (mode === 'mistral') {
    return mistralProvider.extractPO(pdfBase64, systemPrompt, userPrompt);
  }

  if (mode === 'deepseek') {
    return deepseekProvider.extractPO(pdfBase64, systemPrompt, userPrompt);
  }

  // Hybrid mode: DeepSeek first, Mistral fallback if low confidence
  try {
    const primary = await deepseekProvider.extractPO(pdfBase64, systemPrompt, userPrompt);
    const primaryConfidence = primary.result.extraction_metadata.overall_confidence;

    if (primaryConfidence >= HYBRID_CONFIDENCE_THRESHOLD) {
      return primary;
    }

    // Low confidence from DeepSeek — try Mistral as fallback
    console.info(
      `[hybrid] DeepSeek confidence ${primaryConfidence}% < ${HYBRID_CONFIDENCE_THRESHOLD}% threshold, falling back to Mistral`
    );

    try {
      const fallback = await mistralProvider.extractPO(pdfBase64, systemPrompt, userPrompt);
      const fallbackConfidence = fallback.result.extraction_metadata.overall_confidence;

      // Use whichever had higher confidence
      if (fallbackConfidence > primaryConfidence) {
        return {
          ...fallback,
          cost: primary.cost + fallback.cost,
        };
      }

      // DeepSeek was still better despite low confidence
      return {
        ...primary,
        cost: primary.cost + fallback.cost,
      };
    } catch {
      // Mistral fallback failed — return DeepSeek result anyway
      console.warn('[hybrid] Mistral fallback failed, using DeepSeek result');
      return primary;
    }
  } catch (deepseekError) {
    // DeepSeek completely failed — try Mistral as sole provider
    console.warn('[hybrid] DeepSeek failed, trying Mistral as sole provider');
    return mistralProvider.extractPO(pdfBase64, systemPrompt, userPrompt);
  }
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
    '',
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

  // 5. Extract using configured provider(s)
  const { result: extraction, usage, cost: extractionCost, provider: usedProvider } =
    await extractWithProvider(input.pdfBase64, systemPrompt, userPrompt);

  // Cost ceiling warning
  if (extractionCost > 0.50) {
    console.warn(
      `[cost-warning] Extraction cost $${extractionCost.toFixed(4)} exceeds $0.50 ceiling for PO "${extraction.header.po_number}" (org: ${input.orgId}, provider: ${usedProvider})`
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

  // 12. Log extraction (includes provider info)
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
