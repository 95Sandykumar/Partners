import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectCorrections, recordCorrections, updateAccuracyMetrics } from '@/lib/extraction/correction-tracker';
import { validateBody } from '@/lib/validation/validate';
import { POApprovalSchema } from '@/lib/validation/schemas';
import type { ExtractionResult } from '@/types/extraction';
import type { POLineItem } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(POApprovalSchema, body);
    if (!validation.success) return validation.response;
    const { line_items, review_notes, new_mappings, action } = validation.data;

    // --- Correction Tracking ---
    // Fetch PO raw_extraction and current line items BEFORE applying edits
    if (line_items && Array.isArray(line_items) && line_items.length > 0) {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('raw_extraction, vendor_id, organization_id')
        .eq('id', id)
        .single();

      if (po?.raw_extraction) {
        const { data: currentDbItems } = await supabase
          .from('po_line_items')
          .select('*')
          .eq('purchase_order_id', id)
          .order('line_number', { ascending: true });

        if (currentDbItems) {
          const corrections = detectCorrections(
            po.raw_extraction as unknown as ExtractionResult,
            line_items,
            currentDbItems as POLineItem[]
          );

          if (corrections.length > 0) {
            await recordCorrections(
              supabase,
              id,
              po.vendor_id,
              po.organization_id,
              user.id,
              corrections
            );

            // Update metrics async (fire-and-forget to avoid slowing approval)
            updateAccuracyMetrics(supabase, po.organization_id, po.vendor_id).catch(
              (err) => console.error('Accuracy metrics update failed:', err)
            );
          }
        }
      }
    }

    // --- Update line items with operator edits ---
    if (line_items && Array.isArray(line_items)) {
      for (const item of line_items) {
        const { id: itemId, ...updates } = item;
        if (itemId) {
          await supabase
            .from('po_line_items')
            .update(updates)
            .eq('id', itemId);
        }
      }
    }

    // Update PO status
    const status = action === 'reject' ? 'rejected' : 'approved';
    await supabase
      .from('purchase_orders')
      .update({
        status,
        reviewed_by: user.id,
      })
      .eq('id', id);

    // Update review queue
    await supabase
      .from('review_queue')
      .update({
        status: 'completed',
        review_notes: review_notes || null,
      })
      .eq('purchase_order_id', id);

    // Create new mappings (learning loop)
    if (new_mappings && Array.isArray(new_mappings) && new_mappings.length > 0) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        for (const mapping of new_mappings) {
          await supabase
            .from('vendor_mappings')
            .upsert(
              {
                organization_id: userProfile.organization_id,
                vendor_id: mapping.vendor_id,
                vendor_part_number: mapping.vendor_part_number,
                manufacturer_part_number: mapping.manufacturer_part_number || null,
                internal_sku: mapping.internal_sku,
                confidence: mapping.confidence || 100,
                match_source: 'verified',
                is_verified: true,
                times_seen: 1,
              },
              {
                onConflict: 'organization_id,vendor_id,vendor_part_number',
              }
            );
        }
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Approval failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
