import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    const [posResult, logsResult, vendorPosResult] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('created_at, extraction_confidence')
        .gte('created_at', since)
        .order('created_at'),
      supabase
        .from('extraction_logs')
        .select('created_at, matched_count, line_count')
        .gte('created_at', since)
        .order('created_at'),
      supabase
        .from('purchase_orders')
        .select('vendor_id, vendors(vendor_name)')
        .gte('created_at', since),
    ]);

    const pos = posResult.data || [];
    const logs = logsResult.data || [];
    const vendorPos = vendorPosResult.data || [];

    // POs over time (last 30 days, grouped by date)
    const posByDate: Record<string, number> = {};
    for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      posByDate[d.toISOString().split('T')[0]] = 0;
    }
    for (const po of pos) {
      const date = po.created_at.split('T')[0];
      posByDate[date] = (posByDate[date] || 0) + 1;
    }
    const posOverTime = Object.entries(posByDate).map(([date, count]) => ({ date, count }));

    // Confidence distribution
    const confidenceDist = { high: 0, medium: 0, low: 0 };
    for (const po of pos) {
      const conf = po.extraction_confidence || 0;
      if (conf >= 85) confidenceDist.high++;
      else if (conf >= 60) confidenceDist.medium++;
      else confidenceDist.low++;
    }
    const confidenceDistribution = [
      { range: 'High (85-100%)', count: confidenceDist.high },
      { range: 'Medium (60-84%)', count: confidenceDist.medium },
      { range: 'Low (<60%)', count: confidenceDist.low },
    ];

    // Vendor breakdown
    const vendorCounts: Record<string, { name: string; count: number }> = {};
    for (const po of vendorPos) {
      const vid = po.vendor_id || 'unknown';
      const vname = (po.vendors as unknown as { vendor_name: string } | null)?.vendor_name || 'Unknown';
      if (!vendorCounts[vid]) vendorCounts[vid] = { name: vname, count: 0 };
      vendorCounts[vid].count++;
    }
    const vendorBreakdown = Object.values(vendorCounts)
      .map(({ name, count }) => ({ vendor: name, count }))
      .sort((a, b) => b.count - a.count);

    // Match rate trend
    const matchByDate: Record<string, { matched: number; total: number }> = {};
    for (const log of logs) {
      const date = log.created_at.split('T')[0];
      if (!matchByDate[date]) matchByDate[date] = { matched: 0, total: 0 };
      matchByDate[date].matched += log.matched_count || 0;
      matchByDate[date].total += log.line_count || 0;
    }
    const matchRateTrend = Object.entries(matchByDate).map(([date, { matched, total }]) => ({
      date,
      rate: total > 0 ? Math.round((matched / total) * 100) : 0,
    }));

    return NextResponse.json({
      posOverTime,
      confidenceDistribution,
      vendorBreakdown,
      matchRateTrend,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
