import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateBody } from '@/lib/validation/validate';
import {
  ProductCreateSchema,
  ProductBulkCreateSchema,
  ProductUpdateSchema,
  ProductDeleteSchema,
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
    const search = sanitizeSearchParam(searchParams.get('search'));
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('internal_sku')
      .limit(limit);

    if (search) {
      query = query.or(
        `internal_sku.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`
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
      const validation = validateBody(ProductBulkCreateSchema, body);
      if (!validation.success) return validation.response;

      const rows = validation.data.map((item) => ({
        organization_id: userProfile.organization_id,
        internal_sku: item.internal_sku,
        description: item.description,
        category: item.category,
        brand: item.brand,
        unit_price: item.unit_price,
        is_active: true,
      }));

      const { data, error } = await supabase
        .from('products')
        .upsert(rows, { onConflict: 'organization_id,internal_sku' })
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ inserted: data?.length || 0 });
    }

    const validation = validateBody(ProductCreateSchema, body);
    if (!validation.success) return validation.response;

    const { data, error } = await supabase
      .from('products')
      .insert({
        organization_id: userProfile.organization_id,
        ...validation.data,
        is_active: true,
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
    const validation = validateBody(ProductUpdateSchema, body);
    if (!validation.success) return validation.response;

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
      .from('products')
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

export async function DELETE(request: NextRequest) {
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
    const validation = validateBody(ProductDeleteSchema, body);
    if (!validation.success) return validation.response;

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', validation.data.id)
      .eq('organization_id', userProfile.organization_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
