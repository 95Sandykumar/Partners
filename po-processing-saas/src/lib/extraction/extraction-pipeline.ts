import { SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { detectVendor } from './vendor-detection';
import { buildExtractionPrompt } from './prompt-builder';
import { validateExtraction } from './validation';
import { calculateConfidence } from './confidence-scoring';
import { matchAllLineItems, matchAllLineItemsWithSemantic } from '../matching/match-engine';
import { getProviderMode } from './vision-provider';
import { deepseekProvider } from './deepseek-provider';
import { mistralProvider } from './mistral-api';
import { createModuleLogger, errorContext } from '@/lib/logger';
import { findSimilarExtractions, enhancePromptWithExamples, storeApprovedExtraction, logFewShotUsage } from '@/lib/rag';
import type { VisionProviderResult } from './vision-provider';
import type { PipelineResult } from '@/types/extraction';

const log = createModuleLogger('extraction-pipeline');
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

    // Low confidence from DeepSeek -- try Mistral as fallback
    log.info(
      { provider: 'deepseek', confidence: primaryConfidence, threshold: HYBRID_CONFIDENCE_THRESHOLD },
      'primary provider below confidence threshold, falling back to Mistral'
    );

    try {
      const fallback = await mistralProvider.extractPO(pdfBase64, systemPrompt, userPrompt);
      const fallbackConfidence = fallback.result.extraction_metadata.overall_confidence;

      log.info(
        { deepseekConfidence: primaryConfidence, mistralConfidence: fallbackConfidence },
        'hybrid fallback complete, using higher confidence result'
      );

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
    } catch (mistralError) {
      // Mistral fallback failed -- return DeepSeek result anyway
      log.warn({ ...errorContext(mistralError) }, 'Mistral fallback failed, using DeepSeek result');
      return primary;
    }
  } catch (deepseekError) {
    // DeepSeek completely failed -- try Mistral as sole provider
    log.warn({ ...errorContext(deepseekError) }, 'DeepSeek failed, trying Mistral as sole provider');
    return mistralProvider.extractPO(pdfBase64, systemPrompt, userPrompt);
  }
}

export async function runExtractionPipeline(
  supabase: SupabaseClient,
  input: PipelineInput
): Promise<PipelineResult> {
  const startTime = Date.now();
  const pipelineContext = {
    orgId: input.orgId,
    userId: input.userId,
    fileName: input.fileName,
  };

  log.info(pipelineContext, 'extraction pipeline started');

  try {
    // 1. Get vendors for this organization
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('*, templates:vendor_templates(*)')
      .eq('organization_id', input.orgId);

    if (vendorError) {
      log.error({ ...pipelineContext, ...errorContext(vendorError) }, 'failed to fetch vendors');
    }

    // 2. Detect vendor
    const vendorDetection = detectVendor(
      '',
      input.senderEmail,
      vendors || []
    );

    log.info(
      { ...pipelineContext, vendorId: vendorDetection.vendor_id, vendorName: vendorDetection.vendor_name, templateId: vendorDetection.template_id },
      'vendor detection complete'
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

    // 4b. RAG: Retrieve similar past extractions and enhance prompt with few-shot examples
    let enhancedUserPrompt = userPrompt;
    let ragExampleIds: string[] = [];
    try {
      const similarExtractions = await findSimilarExtractions(
        supabase,
        input.orgId,
        vendorDetection.vendor_id,
        // Use a minimal placeholder extraction for retrieval context
        {
          extraction_metadata: {
            vendor_detected: vendorDetection.vendor_name || '',
            template_used: vendorTemplate?.version || null,
            pages_processed: 1,
            overall_confidence: 0,
            extraction_timestamp: new Date().toISOString(),
          },
          header: {
            po_number: '',
            po_date: '',
            vendor_name: vendorDetection.vendor_name || '',
            vendor_address: null,
            ship_to_name: null,
            ship_to_address: null,
            payment_terms: null,
            currency: 'USD',
          },
          line_items: [],
          totals: { subtotal: null, tax: null, shipping: null, total: 0 },
          extraction_issues: [],
        }
      );

      if (similarExtractions.length > 0) {
        enhancedUserPrompt = enhancePromptWithExamples(userPrompt, similarExtractions);
        ragExampleIds = similarExtractions.map((e) => e.id);
        log.info(
          { ...pipelineContext, exampleCount: similarExtractions.length },
          'RAG: prompt enhanced with few-shot examples'
        );
      }
    } catch (ragError) {
      // RAG failures should never block extraction
      log.warn({ ...pipelineContext, ...errorContext(ragError) }, 'RAG retrieval failed, proceeding without examples');
    }

    // 5. Extract using configured provider(s)
    log.info({ ...pipelineContext, providerMode: getProviderMode() }, 'starting AI extraction');

    const { result: extraction, usage, cost: extractionCost, provider: usedProvider } =
      await extractWithProvider(input.pdfBase64, systemPrompt, enhancedUserPrompt);

    log.info(
      {
        ...pipelineContext,
        provider: usedProvider,
        cost: extractionCost,
        lineItems: extraction.line_items.length,
        poNumber: extraction.header.po_number,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
      },
      'AI extraction complete'
    );

    // Cost ceiling warning
    if (extractionCost > 0.50) {
      log.warn(
        {
          ...pipelineContext,
          cost: extractionCost,
          poNumber: extraction.header.po_number,
          provider: usedProvider,
        },
        'extraction cost exceeds $0.50 ceiling'
      );
    }

    // 6. Validate extraction
    const templateData = vendorTemplate?.template_data as Record<string, unknown> | undefined;
    const vendorPatterns = templateData?.part_number_patterns as string[] | undefined;
    const validationIssues = validateExtraction(extraction, vendorPatterns);

    if (validationIssues.length > 0) {
      const errorCount = validationIssues.filter((i) => i.severity === 'error').length;
      const warningCount = validationIssues.filter((i) => i.severity === 'warning').length;
      log.info(
        { ...pipelineContext, errorCount, warningCount, totalIssues: validationIssues.length },
        'validation issues found'
      );
    }

    // 7. Calculate confidence
    const confidenceAdjustments = templateData?.confidence_adjustments as Record<string, number> | undefined;
    const overallConfidence = calculateConfidence(
      extraction,
      validationIssues,
      confidenceAdjustments
    );

    // 8. Match parts (4-stage deterministic + Stage 5 semantic via RAG)
    const { data: mappings } = await supabase
      .from('vendor_mappings')
      .select('*')
      .eq('organization_id', input.orgId);

    const lineItemsForMatching = extraction.line_items.map((item) => ({
      line_number: item.line_number,
      vendor_part_number: item.vendor_part_number,
      manufacturer_part_number: item.manufacturer_part_number,
      description: item.description,
    }));

    let matches: Record<number, import('@/types/extraction').MatchResult | null>;
    try {
      matches = await matchAllLineItemsWithSemantic(
        supabase,
        input.orgId,
        lineItemsForMatching,
        mappings || []
      );
    } catch (matchError) {
      // Semantic matching failed, fall back to deterministic only
      log.warn({ ...pipelineContext, ...errorContext(matchError) }, 'Semantic matching failed, using deterministic only');
      matches = matchAllLineItems(extraction.line_items, mappings || []);
    }
    const matchedCount = Object.values(matches).filter((m) => m !== null).length;

    log.info(
      {
        ...pipelineContext,
        matchedCount,
        totalLineItems: extraction.line_items.length,
        mappingsAvailable: mappings?.length || 0,
      },
      'part matching complete'
    );

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
      log.error({ ...pipelineContext, ...errorContext(poError) }, 'failed to save PO to database');
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
      const { error: lineItemError } = await supabase.from('po_line_items').insert(lineItemRows);
      if (lineItemError) {
        log.error({ ...pipelineContext, poId: po.id, ...errorContext(lineItemError) }, 'failed to save line items');
      }
    }

    // 11. Determine routing
    const errorIssues = validationIssues.filter((i) => i.severity === 'error');
    const autoApproved =
      overallConfidence >= 85 && errorIssues.length === 0;

    if (autoApproved) {
      await supabase
        .from('purchase_orders')
        .update({ status: 'approved' })
        .eq('id', po.id);
      log.info({ ...pipelineContext, poId: po.id, confidence: overallConfidence }, 'PO auto-approved');

      // 11b. RAG: Store auto-approved extraction as training data (fire-and-forget)
      storeApprovedExtraction(supabase, {
        organizationId: input.orgId,
        purchaseOrderId: po.id,
        vendorId: vendorDetection.vendor_id,
        vendorName: vendorDetection.vendor_name,
        extractionData: extraction,
        confidence: overallConfidence,
        wasCorrected: false,
        correctionCount: 0,
      }).catch((ragErr) => {
        log.warn({ ...pipelineContext, ...errorContext(ragErr) }, 'RAG: failed to store auto-approved extraction');
      });
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
      log.info({ ...pipelineContext, poId: po.id, reasons, priority: overallConfidence < 60 ? 2 : 1 }, 'PO routed to review queue');
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

    // 12b. RAG: Log few-shot usage if examples were injected
    if (ragExampleIds.length > 0) {
      logFewShotUsage(supabase, input.orgId, po.id, ragExampleIds).catch((ragErr) => {
        log.warn({ ...pipelineContext, ...errorContext(ragErr) }, 'RAG: failed to log few-shot usage');
      });
    }

    log.info(
      {
        ...pipelineContext,
        poId: po.id,
        poNumber: extraction.header.po_number,
        confidence: overallConfidence,
        matchedCount,
        totalLineItems: extraction.line_items.length,
        autoApproved,
        processingTimeMs: processingTime,
        cost: extractionCost,
        provider: usedProvider,
      },
      'extraction pipeline completed successfully'
    );

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
  } catch (error) {
    const processingTime = Date.now() - startTime;

    log.error(
      {
        ...pipelineContext,
        processingTimeMs: processingTime,
        ...errorContext(error),
      },
      'extraction pipeline failed'
    );

    Sentry.captureException(error, {
      tags: { module: 'extraction-pipeline', orgId: input.orgId },
      extra: {
        fileName: input.fileName,
        userId: input.userId,
        processingTimeMs: processingTime,
      },
    });

    // Re-throw so the caller (upload route) can handle the response
    throw error;
  }
}
