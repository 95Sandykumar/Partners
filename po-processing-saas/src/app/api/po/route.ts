import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const { success } = await limiter.check(ip, 60);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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

    const { searchParams } = new URL(request.url);

    // Allowlist status values
    const ALLOWED_STATUSES = ['pending_review', 'approved', 'rejected', 'processed'] as const;
    const rawStatus = searchParams.get('status');
    const status = rawStatus && ALLOWED_STATUSES.includes(rawStatus as typeof ALLOWED_STATUSES[number])
      ? rawStatus
      : null;

    // Validate vendorId is a UUID format before passing to query
    const rawVendorId = searchParams.get('vendor_id');
    const vendorId = rawVendorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawVendorId)
      ? rawVendorId
      : null;
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 200);

    // Allowlist sort columns to prevent column injection
    const ALLOWED_SORT_COLUMNS = ['created_at', 'po_date', 'po_number', 'total', 'status', 'extraction_confidence'] as const;
    const rawSort = searchParams.get('sort') || 'created_at';
    const sort = ALLOWED_SORT_COLUMNS.includes(rawSort as typeof ALLOWED_SORT_COLUMNS[number])
      ? rawSort
      : 'created_at';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    let query = supabase
      .from('purchase_orders')
      .select('*, vendor:vendors(vendor_name, vendor_id)')
      .eq('organization_id', userProfile.organization_id)
      .order(sort, { ascending: order === 'asc' })
      .limit(limit);

    if (status) query = query.eq('status', status);
    if (vendorId) query = query.eq('vendor_id', vendorId);

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
