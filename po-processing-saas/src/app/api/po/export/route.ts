import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendor_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('purchase_orders')
      .select('*, vendor:vendors(vendor_name)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (vendorId) query = query.eq('vendor_id', vendorId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: pos, error: posError } = await query;
    if (posError) {
      return new Response(posError.message, { status: 500 });
    }

    if (!pos || pos.length === 0) {
      return new Response('No purchase orders found', { status: 404 });
    }

    // Fetch all line items for these POs
    const poIds = pos.map((po) => po.id);
    const { data: allLineItems } = await supabase
      .from('po_line_items')
      .select('*')
      .in('purchase_order_id', poIds)
      .order('line_number');

    const lineItemsByPO: Record<string, typeof allLineItems> = {};
    for (const item of allLineItems || []) {
      if (!lineItemsByPO[item.purchase_order_id]) {
        lineItemsByPO[item.purchase_order_id] = [];
      }
      lineItemsByPO[item.purchase_order_id]!.push(item);
    }

    // Build CSV
    const headers = [
      'PO Number', 'Vendor', 'PO Date', 'Status', 'Confidence %',
      'Line #', 'Vendor Part #', 'MFG Part #', 'Description',
      'Qty', 'Unit Price', 'Extended Price', 'Matched SKU', 'Match Method',
    ];

    const rows: string[] = [headers.map(escapeCSV).join(',')];

    for (const po of pos) {
      const vendor = po.vendor as { vendor_name: string } | null;
      const items = lineItemsByPO[po.id] || [];

      if (items.length === 0) {
        rows.push([
          escapeCSV(po.po_number),
          escapeCSV(vendor?.vendor_name),
          escapeCSV(po.po_date),
          escapeCSV(po.status),
          escapeCSV(po.extraction_confidence?.toFixed(1)),
          '', '', '', '', '', '', '', '', '',
        ].join(','));
      } else {
        for (const item of items) {
          rows.push([
            escapeCSV(po.po_number),
            escapeCSV(vendor?.vendor_name),
            escapeCSV(po.po_date),
            escapeCSV(po.status),
            escapeCSV(po.extraction_confidence?.toFixed(1)),
            escapeCSV(item.line_number),
            escapeCSV(item.vendor_part_number),
            escapeCSV(item.manufacturer_part_number),
            escapeCSV(item.description),
            escapeCSV(item.quantity),
            escapeCSV(item.unit_price?.toFixed(2)),
            escapeCSV(item.extended_price?.toFixed(2)),
            escapeCSV(item.matched_internal_sku),
            escapeCSV(item.match_method),
          ].join(','));
        }
      }
    }

    const csvContent = rows.join('\n');
    const dateStr = new Date().toISOString().split('T')[0];

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="po-export-${dateStr}.csv"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return new Response(message, { status: 500 });
  }
}
