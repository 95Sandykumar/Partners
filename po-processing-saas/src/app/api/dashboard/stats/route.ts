import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel queries for dashboard stats
    const [posToday, pendingReviews, allPOs, vendors] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase
        .from('review_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('purchase_orders')
        .select('extraction_confidence, id'),
      supabase
        .from('vendors')
        .select('id', { count: 'exact', head: true }),
    ]);

    // Calculate averages
    const poData = allPOs.data || [];
    const avgConfidence =
      poData.length > 0
        ? poData.reduce((sum, po) => sum + (po.extraction_confidence || 0), 0) /
          poData.length
        : 0;

    // Match rate from extraction logs
    const { data: logs } = await supabase
      .from('extraction_logs')
      .select('line_count, matched_count')
      .gt('line_count', 0);

    const totalLines = (logs || []).reduce((sum, l) => sum + l.line_count, 0);
    const matchedLines = (logs || []).reduce((sum, l) => sum + l.matched_count, 0);
    const matchRate = totalLines > 0 ? (matchedLines / totalLines) * 100 : 0;

    return NextResponse.json({
      pos_today: posToday.count || 0,
      pending_reviews: pendingReviews.count || 0,
      avg_confidence: avgConfidence,
      match_rate: matchRate,
      total_pos: poData.length,
      total_vendors: vendors.count || 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
