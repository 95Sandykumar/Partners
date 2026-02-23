import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { runExtractionPipeline } from '@/lib/extraction/extraction-pipeline';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const { success } = await limiter.check(ip, 10);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Get user's org
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const orgId = userProfile.organization_id;

    // --- PO Limit Check ---
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: orgData } = await supabase
      .from('organizations')
      .select('monthly_po_limit, subscription_tier')
      .eq('id', orgId)
      .single();

    const limit = orgData?.monthly_po_limit ?? 50;

    const { data: usage } = await supabase
      .from('po_usage_tracking')
      .select('pos_processed')
      .eq('organization_id', orgId)
      .eq('month', currentMonth)
      .single();

    const currentUsage = usage?.pos_processed ?? 0;

    if (limit !== 999999 && currentUsage >= limit) {
      return NextResponse.json(
        {
          error: 'Monthly PO limit reached',
          current: currentUsage,
          limit,
          tier: orgData?.subscription_tier,
          message: `You've reached your monthly limit of ${limit} POs. Upgrade your plan to process more.`,
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const senderEmail = formData.get('senderEmail') as string | null;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 });
    }

    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Validate PDF magic bytes (%PDF)
    const headerBytes = await file.slice(0, 4).arrayBuffer();
    const header = new TextDecoder().decode(headerBytes);
    if (!header.startsWith('%PDF')) {
      return NextResponse.json(
        { error: 'Invalid file. Must be a valid PDF document.' },
        { status: 400 }
      );
    }

    // Upload PDF to storage
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${orgId}/${timestamp}_${safeName}`;

    const serviceClient = await createServiceClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await serviceClient.storage
      .from('po-pdfs')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Convert to base64 for Claude
    const pdfBase64 = buffer.toString('base64');

    // Run extraction pipeline
    const result = await runExtractionPipeline(serviceClient, {
      pdfBase64,
      fileName: file.name,
      senderEmail: senderEmail || undefined,
      orgId,
      userId: user.id,
      pdfStoragePath: storagePath,
    });

    // Increment monthly PO usage
    await supabase
      .from('po_usage_tracking')
      .upsert(
        {
          organization_id: orgId,
          month: currentMonth,
          pos_processed: currentUsage + 1,
          limit_at_time: limit,
        },
        { onConflict: 'organization_id,month' }
      );

    return NextResponse.json({
      purchase_order_id: result.purchase_order_id,
      po_number: result.extraction.header.po_number,
      vendor_detected: result.vendor_detection.vendor_name,
      extraction_confidence: result.overall_confidence,
      line_count: result.extraction.line_items.length,
      matched_count: Object.values(result.matches).filter((m) => m !== null).length,
      auto_approved: result.auto_approved,
      status: result.auto_approved ? 'approved' : 'pending_review',
      validation_issues: result.validation_issues,
    });
  } catch (error: unknown) {
    console.error('PO upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
