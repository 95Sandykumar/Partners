import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateBody } from '@/lib/validation/validate';
import {
  MappingCreateSchema,
  MappingBulkCreateSchema,
  MappingUpdateSchema,
  sanitizeSearchParam,
} from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');
    const search = sanitizeSearchParam(searchParams.get('search'));

    let query = supabase
      .from('vendor_mappings')
      .select('*, vendor:vendors(vendor_name, vendor_id)')
      .order('updated_at', { ascending: false });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    if (search) {
      query = query.or(
        `vendor_part_number.ilike.%${search}%,manufacturer_part_number.ilike.%${search}%,internal_sku.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

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

    // Handle bulk import
    if (Array.isArray(body)) {
      const validation = validateBody(MappingBulkCreateSchema, body);
      if (!validation.success) return validation.response;

      const rows = validation.data.map((item) => ({
        organization_id: userProfile.organization_id,
        ...item,
      }));

      const { data, error } = await supabase
        .from('vendor_mappings')
        .upsert(rows, {
          onConflict: 'organization_id,vendor_id,vendor_part_number',
        })
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ inserted: data?.length || 0 });
    }

    // Single insert
    const validation = validateBody(MappingCreateSchema, body);
    if (!validation.success) return validation.response;

    const { data, error } = await supabase
      .from('vendor_mappings')
      .insert({
        organization_id: userProfile.organization_id,
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

export async function PUT(request: NextRequest) {
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
    const validation = validateBody(MappingUpdateSchema, body);
    if (!validation.success) return validation.response;

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
      .from('vendor_mappings')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id)
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
