import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('vendors')
      .select('*, templates:vendor_templates(id, version, is_active)')
      .order('vendor_name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { validateBody } = await import('@/lib/validation/validate');
    const { VendorCreateSchema } = await import('@/lib/validation/schemas');
    const validation = validateBody(VendorCreateSchema, body);
    if (!validation.success) return validation.response;

    const { template_data, ...vendorFields } = validation.data;

    const { data, error } = await supabase
      .from('vendors')
      .insert({
        organization_id: userProfile.organization_id,
        ...vendorFields,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create template if provided
    if (template_data && data) {
      await supabase.from('vendor_templates').insert({
        vendor_id: data.id,
        template_data: template_data,
        is_active: true,
      });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
