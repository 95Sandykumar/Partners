import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

// ============================================================
// VENDOR TEMPLATES
// ============================================================
const VENDOR_TEMPLATES = {
  powerweld: {
    vendor_id: 'powerweld',
    vendor_name: 'Powerweld Inc.',
    email_domains: ['powerweldinc.com'],
    keywords: ['POWERWELD', 'powerweldinc.com', 'VALPARAISO', 'INDIANA'],
    po_format_type: 'simple',
    template: {
      vendor_id: 'powerweld',
      vendor_name: 'Powerweld Inc.',
      version: '1.0.0',
      po_format: { type: 'simple', typical_pages: 1, has_watermark: false, has_tables: true },
      extraction_rules: {
        po_number: { label: 'P.O. NUMBER:', pattern: 'P\\.O\\.\\s*NUMBER:\\s*(V\\d+)' },
        line_items: {
          table_structure: 'text_columns_with_dashes',
          column_headers: ['QTY', 'OUR PT. #', 'VEND PT #', 'DESCRIPTION', 'LOCATION', 'UNIT PRICE'],
          part_number_column: 'OUR PT. #',
          vendor_part_column: 'VEND PT #',
        },
      },
      part_number_patterns: ['^[A-Z]\\d{3,4}$', '^[A-Z]{2}\\d+$', '^[A-Z]\\d{4}-?\\d?$'],
      confidence_adjustments: { simple_format_bonus: 10, single_page_bonus: 5 },
    },
  },
  linde: {
    vendor_id: 'linde',
    vendor_name: 'Linde Gas & Equipment Inc.',
    email_domains: ['linde.com'],
    keywords: ['Linde Gas & Equipment', 'LGEPKG', 'linde.com'],
    po_format_type: 'complex',
    template: {
      vendor_id: 'linde',
      vendor_name: 'Linde Gas & Equipment Inc.',
      version: '1.0.0',
      po_format: { type: 'complex', typical_pages: 10, has_tables: true, has_legal_terms: true },
      extraction_rules: {
        po_number: { label: 'Purchase Order Number', pattern: 'Purchase Order Number\\s+(\\d+)' },
        line_items: {
          table_structure: 'formal_table',
          column_headers: ['Line Num', 'Item Number', 'Description', 'Quantity Ordered', 'Unit Price', 'Extended Price'],
          part_number_column: 'Item Number',
          mfg_part_pattern: 'MFG\\s*#\\s*:\\s*([A-Z0-9-]+)',
        },
      },
      part_number_patterns: ['^CMUC\\d{3}-\\d{4}$', '^CMD\\d{3}-\\d{4}$', '^DROPSHIPFREIGHT$'],
      pages_to_process: { line_items: [1], skip_pages: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
      confidence_adjustments: { complex_format_penalty: -5, mfg_part_found_bonus: 15 },
    },
  },
  matheson: {
    vendor_id: 'matheson',
    vendor_name: 'Matheson Tri-Gas Inc.',
    email_domains: ['mathesongas.com'],
    keywords: ['MATHESON', 'The Gas Professionals', 'Tri-Gas', 'mathesongas.com'],
    po_format_type: 'complex',
    template: {
      vendor_id: 'matheson',
      vendor_name: 'Matheson Tri-Gas Inc.',
      version: '1.0.0',
      po_format: { type: 'complex', typical_pages: 1, has_watermark: true },
      extraction_rules: {
        po_number: { label: 'PURCHASE ORDER:', pattern: 'PURCHASE ORDER:\\s*(\\d+)' },
        line_items: {
          table_structure: 'formal_table_with_colored_headers',
          column_headers: ['LINE NUM', 'QUANTITY', 'UOM', 'SUP', 'ITEM', 'ITEM DESCRIPTION', 'UNIT PRICE', 'EXTENDED PRICE'],
          part_number_column: 'ITEM',
          mfg_part_pattern: 'MFG PART\\s*#:\\s*([0-9-]+)',
        },
      },
      part_number_patterns: ['^CMD\\s*\\d+$', '^\\d{3}-\\d{2}-\\d{3}$'],
      confidence_adjustments: { watermark_penalty: -10, mfg_part_found_bonus: 15 },
    },
  },
  skd_supply: {
    vendor_id: 'skd_supply',
    vendor_name: 'SKD Supply LLC',
    email_domains: [],
    keywords: ['SKD Supply LLC', 'SKD Supply', 'Bowman Road', 'York, PA'],
    po_format_type: 'simple',
    template: {
      vendor_id: 'skd_supply',
      vendor_name: 'SKD Supply LLC',
      version: '1.0.0',
      po_format: { type: 'simple', typical_pages: 1, has_tables: true },
      extraction_rules: {
        po_number: { label: 'P.O. No.', pattern: 'P\\.O\\.\\s*No\\.\\s*(\\d+)' },
        line_items: {
          table_structure: 'clean_table',
          column_headers: ['Item', 'Description', 'Qty', 'Rate', 'Amount'],
          part_number_column: 'Item',
        },
      },
      part_number_patterns: ['^CMI-[A-Z]\\d+$', '^BER-[A-Z0-9]+$', '^LIN-[A-Z0-9-]+$'],
      part_number_prefixes: { 'CMI-': 'CM Industries', 'BER-': 'Bernard', 'LIN-': 'Lincoln' },
      confidence_adjustments: { clean_format_bonus: 10, known_prefix_bonus: 10 },
    },
  },
};

// ============================================================
// PRODUCTS - CM Industries Welding Supplies (20 items)
// ============================================================
const SEED_PRODUCTS = [
  { internal_sku: 'B422', description: 'Trigger 600 V', category: 'Triggers', brand: 'CM Industries', unit_price: 45.00 },
  { internal_sku: 'C315-3545', description: 'Gun 300A 15FT TWECO DP', category: 'Guns', brand: 'CM Industries', unit_price: 285.00 },
  { internal_sku: '046-36-001', description: 'CM Head Insulator', category: 'Insulators', brand: 'CM Industries', unit_price: 12.50 },
  { internal_sku: 'B5662', description: 'Trigger Assembly', category: 'Triggers', brand: 'CM Industries', unit_price: 67.00 },
  { internal_sku: 'B4217', description: 'Nozzle 5/8 Flush', category: 'Nozzles', brand: 'CM Industries', unit_price: 8.50 },
  { internal_sku: 'C620-0035', description: 'Liner .035 15FT', category: 'Liners', brand: 'CM Industries', unit_price: 22.00 },
  { internal_sku: 'D100-0332', description: 'Contact Tip .032', category: 'Tips', brand: 'CM Industries', unit_price: 3.25 },
  { internal_sku: 'D100-0035', description: 'Contact Tip .035', category: 'Tips', brand: 'CM Industries', unit_price: 3.25 },
  { internal_sku: 'D100-0045', description: 'Contact Tip .045', category: 'Tips', brand: 'CM Industries', unit_price: 3.25 },
  { internal_sku: 'B1259', description: 'Diffuser 200A', category: 'Diffusers', brand: 'CM Industries', unit_price: 15.00 },
  { internal_sku: 'B1264', description: 'Diffuser 400A', category: 'Diffusers', brand: 'CM Industries', unit_price: 18.00 },
  { internal_sku: 'C315-2545', description: 'Gun 250A 15FT TWECO', category: 'Guns', brand: 'CM Industries', unit_price: 265.00 },
  { internal_sku: 'B4218', description: 'Nozzle 3/4 Recessed', category: 'Nozzles', brand: 'CM Industries', unit_price: 9.50 },
  { internal_sku: 'A100-2340', description: 'Wire .035 ER70S-6 44LB', category: 'Wire', brand: 'CM Industries', unit_price: 85.00 },
  { internal_sku: 'A100-2345', description: 'Wire .045 ER70S-6 44LB', category: 'Wire', brand: 'CM Industries', unit_price: 85.00 },
  { internal_sku: 'E300-1612', description: 'Regulator CO2', category: 'Regulators', brand: 'CM Industries', unit_price: 125.00 },
  { internal_sku: 'E300-1614', description: 'Regulator Argon/CO2', category: 'Regulators', brand: 'CM Industries', unit_price: 145.00 },
  { internal_sku: 'B4400', description: 'Swan Neck 400A', category: 'Guns', brand: 'CM Industries', unit_price: 35.00 },
  { internal_sku: 'B4200', description: 'Swan Neck 200A', category: 'Guns', brand: 'CM Industries', unit_price: 28.00 },
  { internal_sku: 'C100-1015', description: 'Cable Work 1/0 15FT', category: 'Cables', brand: 'CM Industries', unit_price: 55.00 },
];

// ============================================================
// VENDOR MAPPINGS (~15 cross-vendor part number mappings)
// ============================================================
const SEED_MAPPINGS = [
  // Linde mappings (CMUC/CMD prefix -> CM Industries SKU)
  { vendor: 'linde', vendor_part: 'CMUC315-3545', mfg_part: 'C315-3545', sku: 'C315-3545' },
  { vendor: 'linde', vendor_part: 'CMD100-0035', mfg_part: 'D100-0035', sku: 'D100-0035' },
  { vendor: 'linde', vendor_part: 'CMD100-0045', mfg_part: 'D100-0045', sku: 'D100-0045' },
  { vendor: 'linde', vendor_part: 'CMUE300-1614', mfg_part: 'E300-1614', sku: 'E300-1614' },
  // Matheson mappings (CMD space-separated -> CM Industries SKU)
  { vendor: 'matheson', vendor_part: 'CMD 4636001', mfg_part: '046-36-001', sku: '046-36-001' },
  { vendor: 'matheson', vendor_part: 'CMD 1002340', mfg_part: 'A100-2340', sku: 'A100-2340' },
  { vendor: 'matheson', vendor_part: 'CMD 3001612', mfg_part: 'E300-1612', sku: 'E300-1612' },
  // Powerweld mappings (direct match - simple format)
  { vendor: 'powerweld', vendor_part: 'B422', mfg_part: null, sku: 'B422' },
  { vendor: 'powerweld', vendor_part: 'B5662', mfg_part: null, sku: 'B5662' },
  { vendor: 'powerweld', vendor_part: 'B4217', mfg_part: null, sku: 'B4217' },
  { vendor: 'powerweld', vendor_part: 'B1259', mfg_part: null, sku: 'B1259' },
  // SKD Supply mappings (CMI- prefix -> CM Industries SKU)
  { vendor: 'skd_supply', vendor_part: 'CMI-B5662', mfg_part: 'B5662', sku: 'B5662' },
  { vendor: 'skd_supply', vendor_part: 'CMI-B422', mfg_part: 'B422', sku: 'B422' },
  { vendor: 'skd_supply', vendor_part: 'CMI-D100-0035', mfg_part: 'D100-0035', sku: 'D100-0035' },
  { vendor: 'skd_supply', vendor_part: 'CMI-C620-0035', mfg_part: 'C620-0035', sku: 'C620-0035' },
];

// ============================================================
// SAMPLE PURCHASE ORDERS (3 POs at different confidence levels)
// ============================================================
function buildSamplePOs(
  orgId: string,
  userId: string,
  vendorIdMap: Record<string, string>
) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  return [
    {
      po: {
        organization_id: orgId,
        vendor_id: vendorIdMap.powerweld,
        po_number: 'V24-1087',
        po_date: yesterday.toISOString().split('T')[0],
        total: 347.50,
        status: 'pending_review' as const,
        extraction_confidence: 92.5,
        pdf_storage_path: `${orgId}/powerweld/V24-1087.pdf`,
        created_by: userId,
        raw_extraction: {
          extraction_metadata: {
            vendor_detected: 'Powerweld Inc.',
            template_used: 'powerweld',
            pages_processed: 1,
            overall_confidence: 92.5,
            extraction_timestamp: yesterday.toISOString(),
          },
        },
      },
      line_items: [
        { line_number: 1, vendor_part_number: 'B422', description: 'Trigger 600 V', quantity: 5, unit_of_measure: 'EA', unit_price: 45.00, extended_price: 225.00, matched_internal_sku: 'B422', match_confidence: 100, match_method: 'exact' as const, is_matched: true, extraction_confidence: 95 },
        { line_number: 2, vendor_part_number: 'B5662', description: 'Trigger Assembly', quantity: 1, unit_of_measure: 'EA', unit_price: 67.00, extended_price: 67.00, matched_internal_sku: 'B5662', match_confidence: 100, match_method: 'exact' as const, is_matched: true, extraction_confidence: 95 },
        { line_number: 3, vendor_part_number: 'C100-1015', description: 'Cable Work 1/0 15FT', quantity: 1, unit_of_measure: 'EA', unit_price: 55.00, extended_price: 55.00, matched_internal_sku: null, match_confidence: null, match_method: null, is_matched: false, extraction_confidence: 85, extraction_notes: 'No vendor mapping found' },
      ],
      review: { organization_id: orgId, priority: 1, reason: ['1 unmatched line item'], status: 'pending' as const },
    },
    {
      po: {
        organization_id: orgId,
        vendor_id: vendorIdMap.linde,
        po_number: '4500892147',
        po_date: twoDaysAgo.toISOString().split('T')[0],
        total: 1515.00,
        status: 'pending_review' as const,
        extraction_confidence: 75.0,
        pdf_storage_path: `${orgId}/linde/4500892147.pdf`,
        created_by: userId,
        raw_extraction: {
          extraction_metadata: {
            vendor_detected: 'Linde Gas & Equipment Inc.',
            template_used: 'linde',
            pages_processed: 1,
            overall_confidence: 75.0,
            extraction_timestamp: twoDaysAgo.toISOString(),
          },
        },
      },
      line_items: [
        { line_number: 1, vendor_part_number: 'CMUC315-3545', manufacturer_part_number: 'C315-3545', description: 'Gun 300A 15FT TWECO DP', quantity: 2, unit_of_measure: 'EA', unit_price: 285.00, extended_price: 570.00, matched_internal_sku: 'C315-3545', match_confidence: 95, match_method: 'exact' as const, is_matched: true, extraction_confidence: 88 },
        { line_number: 2, vendor_part_number: 'CMD100-0035', manufacturer_part_number: 'D100-0035', description: 'Contact Tip .035', quantity: 100, unit_of_measure: 'EA', unit_price: 3.25, extended_price: 325.00, matched_internal_sku: 'D100-0035', match_confidence: 95, match_method: 'exact' as const, is_matched: true, extraction_confidence: 88 },
        { line_number: 3, vendor_part_number: 'CMUE300-1614', manufacturer_part_number: 'E300-1614', description: 'Regulator Argon/CO2', quantity: 1, unit_of_measure: 'EA', unit_price: 145.00, extended_price: 145.00, matched_internal_sku: 'E300-1614', match_confidence: 95, match_method: 'exact' as const, is_matched: true, extraction_confidence: 85 },
        { line_number: 4, vendor_part_number: 'CMUB4218', description: 'Nozzle 3/4 Recessed', quantity: 50, unit_of_measure: 'EA', unit_price: 9.50, extended_price: 475.00, matched_internal_sku: null, match_confidence: null, match_method: null, is_matched: false, extraction_confidence: 60, extraction_notes: 'MFG part number partially obscured' },
        { line_number: 5, vendor_part_number: 'DROPSHIPFREIGHT', description: 'Drop Ship Freight Charge', quantity: 1, unit_of_measure: 'EA', unit_price: 0.00, extended_price: 0.00, matched_internal_sku: null, match_confidence: null, match_method: null, is_matched: false, extraction_confidence: 50, extraction_notes: 'Service charge - not a product' },
      ],
      review: { organization_id: orgId, priority: 2, reason: ['2 unmatched line items', 'Complex multi-page format', 'MFG part unclear on line 4'], status: 'pending' as const },
    },
    {
      po: {
        organization_id: orgId,
        vendor_id: vendorIdMap.matheson,
        po_number: '7700234',
        po_date: today.toISOString().split('T')[0],
        total: 715.00,
        status: 'pending_review' as const,
        extraction_confidence: 55.0,
        pdf_storage_path: `${orgId}/matheson/7700234.pdf`,
        created_by: userId,
        raw_extraction: {
          extraction_metadata: {
            vendor_detected: 'Matheson Tri-Gas Inc.',
            template_used: 'matheson',
            pages_processed: 1,
            overall_confidence: 55.0,
            extraction_timestamp: today.toISOString(),
          },
        },
      },
      line_items: [
        { line_number: 1, vendor_part_number: 'CMD 4636001', manufacturer_part_number: '046-36-001', description: 'CM Head Insulator', quantity: 20, unit_of_measure: 'EA', unit_price: 12.50, extended_price: 250.00, matched_internal_sku: '046-36-001', match_confidence: 90, match_method: 'exact' as const, is_matched: true, extraction_confidence: 70, extraction_notes: 'Watermark partially overlapping text' },
        { line_number: 2, vendor_part_number: 'CMD 1002340', manufacturer_part_number: 'A100-2340', description: 'Wire .035 ER70S-6 44LB', quantity: 4, unit_of_measure: 'EA', unit_price: 85.00, extended_price: 340.00, matched_internal_sku: 'A100-2340', match_confidence: 85, match_method: 'exact' as const, is_matched: true, extraction_confidence: 55, extraction_notes: 'Watermark over quantity column; may be 4 or 14' },
        { line_number: 3, vendor_part_number: 'CMD 3001612', description: 'Regulator CO2', quantity: 1, unit_of_measure: 'EA', unit_price: 125.00, extended_price: 125.00, matched_internal_sku: null, match_confidence: null, match_method: null, is_matched: false, extraction_confidence: 40, extraction_notes: 'MFG part completely obscured by watermark' },
      ],
      review: { organization_id: orgId, priority: 3, reason: ['1 unmatched line item', 'Low extraction confidence (55%)', 'Watermark obscuring content'], status: 'pending' as const },
    },
  ];
}

// ============================================================
// RESET: Clear all org-scoped seed data
// ============================================================
async function resetOrgData(
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>,
  orgId: string
) {
  const { data: pos } = await serviceClient
    .from('purchase_orders')
    .select('id')
    .eq('organization_id', orgId);

  const poIds = (pos || []).map((p: { id: string }) => p.id);

  if (poIds.length > 0) {
    await serviceClient.from('review_queue').delete().eq('organization_id', orgId);
    await serviceClient.from('extraction_logs').delete().eq('organization_id', orgId);
    for (const poId of poIds) {
      await serviceClient.from('po_line_items').delete().eq('purchase_order_id', poId);
    }
    await serviceClient.from('purchase_orders').delete().eq('organization_id', orgId);
  }

  await serviceClient.from('vendor_mappings').delete().eq('organization_id', orgId);

  const { data: vendors } = await serviceClient
    .from('vendors')
    .select('id')
    .eq('organization_id', orgId);

  const vendorUuids = (vendors || []).map((v: { id: string }) => v.id);
  for (const vId of vendorUuids) {
    await serviceClient.from('vendor_templates').delete().eq('vendor_id', vId);
  }
  await serviceClient.from('vendors').delete().eq('organization_id', orgId);
  await serviceClient.from('products').delete().eq('organization_id', orgId);

  return { purchase_orders_deleted: poIds.length, vendors_deleted: vendorUuids.length };
}

// ============================================================
// MAIN POST HANDLER
// ============================================================
export async function POST(request: NextRequest) {
  try {
    // Production guard: prevent accidental seeding in production
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED) {
      return NextResponse.json(
        { error: 'Seed endpoint is disabled in production' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const ip = getClientIp(request);
    const { success } = await limiter.check(ip, 3);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const orgId = userProfile.organization_id;
    const serviceClient = await createServiceClient();

    const { searchParams } = new URL(request.url);
    const shouldReset = searchParams.get('reset') === 'true';

    let resetSummary = null;
    if (shouldReset) {
      resetSummary = await resetOrgData(serviceClient, orgId);
    }

    // Seed vendors and templates
    const vendorIdMap: Record<string, string> = {};
    for (const [slug, vendorData] of Object.entries(VENDOR_TEMPLATES)) {
      const { data: vendor } = await serviceClient
        .from('vendors')
        .upsert(
          {
            organization_id: orgId,
            vendor_id: vendorData.vendor_id,
            vendor_name: vendorData.vendor_name,
            email_domains: vendorData.email_domains,
            keywords: vendorData.keywords,
            po_format_type: vendorData.po_format_type,
          },
          { onConflict: 'organization_id,vendor_id' }
        )
        .select()
        .single();

      if (vendor) {
        vendorIdMap[slug] = vendor.id;

        const { data: existingTemplate } = await serviceClient
          .from('vendor_templates')
          .select('id')
          .eq('vendor_id', vendor.id)
          .eq('version', '1.0.0')
          .single();

        if (existingTemplate) {
          await serviceClient
            .from('vendor_templates')
            .update({ template_data: vendorData.template, is_active: true })
            .eq('id', existingTemplate.id);
        } else {
          await serviceClient.from('vendor_templates').insert({
            vendor_id: vendor.id,
            version: '1.0.0',
            template_data: vendorData.template,
            is_active: true,
          });
        }
      }
    }

    // Seed products (20 items)
    const productRows = SEED_PRODUCTS.map((p) => ({
      organization_id: orgId,
      ...p,
      is_active: true,
    }));

    await serviceClient
      .from('products')
      .upsert(productRows, { onConflict: 'organization_id,internal_sku' });

    // Seed vendor mappings (15 mappings)
    let mappingsSeeded = 0;
    for (const m of SEED_MAPPINGS) {
      const vendorUuid = vendorIdMap[m.vendor];
      if (!vendorUuid) continue;

      const { error } = await serviceClient.from('vendor_mappings').upsert(
        {
          organization_id: orgId,
          vendor_id: vendorUuid,
          vendor_part_number: m.vendor_part,
          manufacturer_part_number: m.mfg_part,
          internal_sku: m.sku,
          confidence: 100,
          match_source: 'manual',
          is_verified: true,
          times_seen: 5,
        },
        { onConflict: 'organization_id,vendor_id,vendor_part_number' }
      );
      if (!error) mappingsSeeded++;
    }

    // Seed sample purchase orders (3 POs)
    const samplePOs = buildSamplePOs(orgId, user.id, vendorIdMap);
    let posSeeded = 0;
    let lineItemsSeeded = 0;
    let reviewQueueSeeded = 0;

    for (const sample of samplePOs) {
      if (!shouldReset) {
        const { data: existingPO } = await serviceClient
          .from('purchase_orders')
          .select('id')
          .eq('organization_id', orgId)
          .eq('po_number', sample.po.po_number)
          .single();
        if (existingPO) continue;
      }

      const { data: po, error: poError } = await serviceClient
        .from('purchase_orders')
        .insert(sample.po)
        .select()
        .single();

      if (poError || !po) continue;
      posSeeded++;

      const lineItems = sample.line_items.map((item) => ({
        purchase_order_id: po.id,
        ...item,
      }));

      const { error: lineError } = await serviceClient.from('po_line_items').insert(lineItems);
      if (!lineError) lineItemsSeeded += lineItems.length;

      const { error: reviewError } = await serviceClient
        .from('review_queue')
        .insert({ purchase_order_id: po.id, ...sample.review });
      if (!reviewError) reviewQueueSeeded++;

      const matchedCount = sample.line_items.filter((li) => li.is_matched).length;
      await serviceClient.from('extraction_logs').insert({
        organization_id: orgId,
        purchase_order_id: po.id,
        vendor_id: sample.po.vendor_id,
        extraction_confidence: sample.po.extraction_confidence,
        line_count: sample.line_items.length,
        matched_count: matchedCount,
        processing_time_ms: Math.floor(Math.random() * 3000) + 1500,
        api_cost: parseFloat((Math.random() * 0.05 + 0.02).toFixed(4)),
        success: true,
      });
    }

    return NextResponse.json({
      success: true,
      reset: shouldReset ? resetSummary : null,
      seeded: {
        vendors: Object.keys(vendorIdMap).length,
        vendor_templates: Object.keys(vendorIdMap).length,
        products: SEED_PRODUCTS.length,
        vendor_mappings: mappingsSeeded,
        purchase_orders: posSeeded,
        line_items: lineItemsSeeded,
        review_queue_items: reviewQueueSeeded,
      },
      details: {
        vendors: Object.entries(vendorIdMap).map(([slug, id]) => ({
          slug,
          id,
          name: VENDOR_TEMPLATES[slug as keyof typeof VENDOR_TEMPLATES].vendor_name,
        })),
        product_categories: [...new Set(SEED_PRODUCTS.map((p) => p.category))],
        sample_pos: samplePOs.map((s) => ({
          po_number: s.po.po_number,
          vendor: Object.entries(vendorIdMap).find(([, id]) => id === s.po.vendor_id)?.[0] || 'unknown',
          confidence: s.po.extraction_confidence,
          line_items: s.line_items.length,
          matched: s.line_items.filter((li) => li.is_matched).length,
          unmatched: s.line_items.filter((li) => !li.is_matched).length,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Seed failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
