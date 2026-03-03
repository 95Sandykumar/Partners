import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
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

    const orgId = userProfile.organization_id;
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');

    // Query accuracy metrics scoped to org (all_time by default)
    let metricsQuery = supabase
      .from('extraction_accuracy_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .eq('time_window', 'all_time')
      .order('accuracy_rate', { ascending: true });

    if (vendorId) {
      metricsQuery = metricsQuery.eq('vendor_id', vendorId);
    }

    const { data: metrics, error: metricsError } = await metricsQuery;
    if (metricsError) {
      return NextResponse.json({ error: metricsError.message }, { status: 500 });
    }

    // Get recent corrections scoped to org
    let correctionsQuery = supabase
      .from('extraction_corrections')
      .select('field_name, ai_extracted_value, corrected_value, extraction_confidence, created_at, vendor_id')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (vendorId) {
      correctionsQuery = correctionsQuery.eq('vendor_id', vendorId);
    }

    const { data: recentCorrections } = await correctionsQuery;

    // Summary stats
    const totalCorrections = recentCorrections?.length || 0;
    const fieldBreakdown = (recentCorrections || []).reduce<Record<string, number>>((acc, c) => {
      acc[c.field_name] = (acc[c.field_name] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      metrics: metrics || [],
      recent_corrections: recentCorrections || [],
      summary: {
        total_corrections: totalCorrections,
        field_breakdown: fieldBreakdown,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch accuracy data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
