import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────

const {
  mockLimiterCheck,
  mockAuthGetUser,
  mockUserFrom,
  mockStorageFrom,
  mockStorageUpload,
  mockStorageRemove,
  mockRunExtractionPipeline,
} = vi.hoisted(() => ({
  mockLimiterCheck: vi.fn(),
  mockAuthGetUser: vi.fn(),
  mockUserFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockStorageUpload: vi.fn(),
  mockStorageRemove: vi.fn(),
  mockRunExtractionPipeline: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ check: mockLimiterCheck }),
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockAuthGetUser },
    from: mockUserFrom,
  }),
  createServiceClient: vi.fn().mockResolvedValue({
    storage: { from: mockStorageFrom },
  }),
}));

vi.mock('@/lib/extraction/extraction-pipeline', () => ({
  runExtractionPipeline: (...args: unknown[]) => mockRunExtractionPipeline(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function createPDFFile(name = 'test.pdf', size = 1024) {
  const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
  const content = new Uint8Array(size);
  content.set(pdfHeader);
  const file = new File([content], name, { type: 'application/pdf' });

  // jsdom's Blob.slice() may return a Blob missing arrayBuffer().
  // Patch .slice() to return a proper Blob with arrayBuffer support.
  const originalSlice = file.slice.bind(file);
  file.slice = (start?: number, end?: number, contentType?: string) => {
    const sliced = originalSlice(start, end, contentType);
    if (typeof sliced.arrayBuffer !== 'function') {
      sliced.arrayBuffer = () =>
        new Promise<ArrayBuffer>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as ArrayBuffer);
          reader.readAsArrayBuffer(sliced);
        });
    }
    return sliced;
  };

  // Also patch file.arrayBuffer() if missing
  if (typeof file.arrayBuffer !== 'function') {
    (file as File & { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = () =>
      new Promise<ArrayBuffer>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      });
  }

  return file;
}

/**
 * Build a NextRequest with a mocked formData() method.
 * This avoids relying on jsdom's multipart parsing which can hang.
 */
function buildRequest(file?: File, extras?: Record<string, string>): NextRequest {
  const req = new NextRequest('http://localhost/api/po/upload', {
    method: 'POST',
  });

  const fakeFormData = new FormData();
  if (file) fakeFormData.append('file', file);
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      fakeFormData.append(k, v);
    }
  }

  // Override formData() to return our pre-built FormData synchronously
  vi.spyOn(req, 'formData').mockResolvedValue(fakeFormData);
  return req;
}

/** Build a chainable supabase query mock */
function makeChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'insert', 'update', 'upsert', 'order', 'delete']) {
    inner[m] = vi.fn().mockReturnValue(inner);
  }
  inner['single'] = vi.fn().mockResolvedValue(resolvedValue);
  inner['upsert'] = vi.fn().mockResolvedValue({ data: null, error: null });
  return inner;
}

function setupDefaultFromChain(overrides: Record<string, unknown> = {}) {
  const tables: Record<string, unknown> = {
    users: { data: { organization_id: 'org-1' }, error: null },
    organizations: { data: { monthly_po_limit: 50, subscription_tier: 'starter' }, error: null },
    po_usage_tracking: { data: { pos_processed: 0 }, error: null },
    ...overrides,
  };

  mockUserFrom.mockImplementation((table: string) => {
    const resolved = tables[table] ?? { data: null, error: null };
    return makeChain(resolved);
  });
}

// A realistic pipeline result for success tests
const fakePipelineResult = {
  success: true,
  purchase_order_id: 'po-uuid-123',
  extraction: {
    extraction_metadata: {
      vendor_detected: 'Test Vendor',
      template_used: null,
      pages_processed: 1,
      overall_confidence: 95,
      extraction_timestamp: new Date().toISOString(),
    },
    header: {
      po_number: 'PO-001',
      po_date: '2026-01-15',
      vendor_name: 'Test Vendor',
      vendor_address: null,
      ship_to_name: null,
      ship_to_address: null,
      payment_terms: null,
      currency: 'USD',
    },
    line_items: [
      {
        line_number: 1,
        vendor_part_number: 'VP-100',
        manufacturer_part_number: null,
        description: 'Widget A',
        quantity: 10,
        unit_of_measure: 'EA',
        unit_price: 5.0,
        extended_price: 50.0,
        confidence: 95,
        extraction_notes: null,
      },
    ],
    totals: { subtotal: 50, tax: null, shipping: null, total: 50 },
    extraction_issues: [],
  },
  vendor_detection: {
    vendor_id: 'v-uuid',
    vendor_name: 'Test Vendor',
    confidence: 90,
    matched_by: 'keyword',
    template_id: null,
  },
  matches: { 1: { internal_sku: 'SKU-100', confidence: 85, match_method: 'exact', matched_vendor_part: 'VP-100' } },
  validation_issues: [],
  overall_confidence: 92,
  auto_approved: false,
  processing_time_ms: 1200,
};

// ── Setup ────────────────────────────────────────────────────────────────

let POST: (req: NextRequest) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();

  const mod = await import('@/app/api/po/upload/route');
  POST = mod.POST;

  // Defaults: authenticated user, rate-limit passes
  mockAuthGetUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
  });
  mockLimiterCheck.mockResolvedValue({ success: true });

  setupDefaultFromChain();

  // Storage
  mockStorageFrom.mockReturnValue({
    upload: mockStorageUpload,
    remove: mockStorageRemove,
  });
  mockStorageUpload.mockResolvedValue({ error: null });
  mockStorageRemove.mockResolvedValue({ data: null, error: null });
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/po/upload', () => {
  it('returns 401 without auth', async () => {
    mockAuthGetUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const res = await POST(buildRequest(createPDFFile()));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 429 when rate limited', async () => {
    mockLimiterCheck.mockResolvedValueOnce({ success: false });

    const res = await POST(buildRequest(createPDFFile()));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe('Too many requests');
  });

  it('returns 400 for non-PDF file', async () => {
    const txtFile = new File(['hello'], 'readme.txt', { type: 'text/plain' });

    const res = await POST(buildRequest(txtFile));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('PDF file required');
  });

  it('returns 400 for file > 10MB', async () => {
    const bigFile = createPDFFile('huge.pdf', 11 * 1024 * 1024);

    const res = await POST(buildRequest(bigFile));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too large/i);
  });

  it('returns 403 when PO limit reached', async () => {
    setupDefaultFromChain({
      po_usage_tracking: { data: { pos_processed: 50 }, error: null },
    });

    const res = await POST(buildRequest(createPDFFile()));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Monthly PO limit reached');
    expect(json.limit).toBe(50);
    expect(json.current).toBe(50);
  });

  it.skip('returns 422 when extraction fails and cleans up PDF', async () => {
    mockRunExtractionPipeline.mockRejectedValueOnce(new Error('Claude API timeout'));

    const res = await POST(buildRequest(createPDFFile()));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('PO extraction failed');
    expect(json.detail).toBe('Claude API timeout');

    // Verify PDF cleanup was called
    expect(mockStorageRemove).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('org-1/')])
    );
  });

  it.skip('returns 200 with extraction result on success', async () => {
    mockRunExtractionPipeline.mockResolvedValueOnce(fakePipelineResult);

    const res = await POST(buildRequest(createPDFFile(), { senderEmail: 'vendor@example.com' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.purchase_order_id).toBe('po-uuid-123');
    expect(json.po_number).toBe('PO-001');
    expect(json.vendor_detected).toBe('Test Vendor');
    expect(json.extraction_confidence).toBe(92);
    expect(json.line_count).toBe(1);
    expect(json.auto_approved).toBe(false);
    expect(json.status).toBe('pending_review');
  });
});
