import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
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

    // Get user's org for ownership check
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { data: po, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendor:vendors(*),
        line_items:po_line_items(*),
        review_queue_item:review_queue(*)
      `)
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (error || !po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Get signed PDF URL
    const { data: urlData } = await supabase.storage
      .from('po-pdfs')
      .createSignedUrl(po.pdf_storage_path, 3600);

    return NextResponse.json({
      ...po,
      review_queue_item: po.review_queue_item?.[0] || null,
      pdf_url: urlData?.signedUrl || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch PO';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
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

    // Get user's org for ownership check
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify PO belongs to user's org before allowing updates
    const { data: existingPo } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (!existingPo) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    const body = await request.json();
    const { validateBody } = await import('@/lib/validation/validate');
    const { POUpdateSchema } = await import('@/lib/validation/schemas');
    const validation = validateBody(POUpdateSchema, body);
    if (!validation.success) return validation.response;

    // Update line items if provided (scoped to this PO)
    if (body.line_items && Array.isArray(body.line_items)) {
      for (const item of body.line_items) {
        const { id: itemId, ...updates } = item;
        await supabase
          .from('po_line_items')
          .update(updates)
          .eq('id', itemId)
          .eq('purchase_order_id', id);
      }
    }

    // Update PO fields if provided (scoped to user's org)
    const poUpdates: Record<string, unknown> = {};
    if (body.status) poUpdates.status = body.status;
    if (body.total !== undefined) poUpdates.total = body.total;

    if (Object.keys(poUpdates).length > 0) {
      await supabase
        .from('purchase_orders')
        .update(poUpdates)
        .eq('id', id)
        .eq('organization_id', userProfile.organization_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update PO';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
