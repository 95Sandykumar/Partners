import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify vendor belongs to user's org
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, vendor_id, vendor_name')
      .eq('id', id)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const { data: templates, error } = await supabase
      .from('vendor_templates')
      .select('*')
      .eq('vendor_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ vendor, templates: templates || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    // Verify vendor belongs to user's org
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', id)
      .single();

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const body = await request.json();
    const { validateBody } = await import('@/lib/validation/validate');
    const { VendorTemplateCreateSchema } = await import('@/lib/validation/schemas');
    const validation = validateBody(VendorTemplateCreateSchema, body);
    if (!validation.success) return validation.response;

    // Deactivate existing active templates if this one is active
    if (validation.data.is_active) {
      await supabase
        .from('vendor_templates')
        .update({ is_active: false })
        .eq('vendor_id', id)
        .eq('is_active', true);
    }

    const { data, error } = await supabase
      .from('vendor_templates')
      .insert({
        vendor_id: id,
        ...validation.data,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
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

    const body = await request.json();
    const { validateBody } = await import('@/lib/validation/validate');
    const { VendorTemplateUpdateSchema } = await import('@/lib/validation/schemas');
    const validation = validateBody(VendorTemplateUpdateSchema, body);
    if (!validation.success) return validation.response;

    const templateId = validation.data.template_id;

    // If activating, deactivate others first
    if (validation.data.is_active) {
      await supabase
        .from('vendor_templates')
        .update({ is_active: false })
        .eq('vendor_id', id)
        .eq('is_active', true);
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.template_data !== undefined) updateData.template_data = validation.data.template_data;
    if (validation.data.version !== undefined) updateData.version = validation.data.version;
    if (validation.data.is_active !== undefined) updateData.is_active = validation.data.is_active;

    const { data, error } = await supabase
      .from('vendor_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
