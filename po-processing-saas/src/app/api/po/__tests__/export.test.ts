import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────

const mockSupabase: Record<string, unknown> = {};
function resetMockSupabase() {
  mockSupabase['auth'] = {
    getUser: vi.fn(),
  };
  mockSupabase['from'] = vi.fn();
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ check: vi.fn().mockResolvedValue({ success: true }) }),
  getClientIp: () => '127.0.0.1',
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'));
}

/**
 * Creates a chainable query mock that is also "thenable" (so `await query` works).
 * Calling any method returns the same chain. The `then` method resolves with `resolvedValue`.
 */
function createChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'in', 'gte', 'lte', 'ilike', 'neq', 'single'];
  for (const m of methods) {
    inner[m] = vi.fn().mockReturnValue(inner);
  }
  // Make the object thenable (so `await query` works like Supabase)
  inner['then'] = vi.fn().mockImplementation(
    (resolve: (v: unknown) => void) => Promise.resolve(resolvedValue).then(resolve)
  );
  return inner;
}

// ── Setup ────────────────────────────────────────────────────────────────

let GET: (req: NextRequest) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  resetMockSupabase();

  const mod = await import('../export/route');
  GET = mod.GET;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
});

/**
 * Set up the from chain for the export route.
 * The route calls from('purchase_orders') first, then from('po_line_items').
 */
function setupExportChain(
  posResult: unknown,
  lineItemsResult: unknown = { data: [], error: null },
) {
  (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    if (table === 'purchase_orders') {
      return createChain(posResult);
    } else if (table === 'po_line_items') {
      return createChain(lineItemsResult);
    }
    return createChain({ data: null, error: null });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/po/export', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/po/export');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toBe('Unauthorized');
  });

  it('returns 404 when no purchase orders found', async () => {
    setupExportChain({ data: [], error: null });

    const req = createRequest('http://localhost/api/po/export');
    const res = await GET(req);

    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toBe('No purchase orders found');
  });

  it('returns 404 when POs data is null', async () => {
    setupExportChain({ data: null, error: null });

    const req = createRequest('http://localhost/api/po/export');
    const res = await GET(req);

    expect(res.status).toBe(404);
  });

  it('returns 500 when PO query fails', async () => {
    setupExportChain({ data: null, error: { message: 'DB connection lost' } });

    const req = createRequest('http://localhost/api/po/export');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe('DB connection lost');
  });

  it('exports CSV with POs and line items', async () => {
    const mockPOs = [
      {
        id: 'po-1',
        po_number: 'PO-001',
        po_date: '2025-01-15',
        status: 'approved',
        extraction_confidence: 95.5,
        vendor: { vendor_name: 'Acme Corp' },
      },
    ];
    const mockLineItems = [
      {
        purchase_order_id: 'po-1',
        line_number: 1,
        vendor_part_number: 'VP-100',
        manufacturer_part_number: 'MFG-100',
        description: 'Widget A',
        quantity: 10,
        unit_price: 25.00,
        extended_price: 250.00,
        matched_internal_sku: 'SKU-001',
        match_method: 'exact',
      },
    ];

    setupExportChain(
      { data: mockPOs, error: null },
      { data: mockLineItems, error: null },
    );

    const req = createRequest('http://localhost/api/po/export');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('po-export-');
    expect(res.headers.get('Content-Disposition')).toContain('.csv');

    const csv = await res.text();
    expect(csv).toContain('PO Number');
    expect(csv).toContain('Vendor');
    expect(csv).toContain('PO-001');
    expect(csv).toContain('Acme Corp');
    expect(csv).toContain('VP-100');
    expect(csv).toContain('Widget A');
  });

  it('exports CSV with PO that has no line items', async () => {
    const mockPOs = [
      {
        id: 'po-2',
        po_number: 'PO-002',
        po_date: '2025-02-01',
        status: 'pending_review',
        extraction_confidence: 70.0,
        vendor: { vendor_name: 'Beta Inc' },
      },
    ];

    setupExportChain(
      { data: mockPOs, error: null },
      { data: [], error: null },
    );

    const req = createRequest('http://localhost/api/po/export');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain('PO-002');
    expect(csv).toContain('Beta Inc');
  });

  it('applies status filter', async () => {
    const posChain = createChain({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => posChain);

    const req = createRequest('http://localhost/api/po/export?status=approved');
    await GET(req);

    expect(posChain.eq).toHaveBeenCalledWith('status', 'approved');
  });

  it('does not filter by status when status is "all"', async () => {
    const posChain = createChain({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => posChain);

    const req = createRequest('http://localhost/api/po/export?status=all');
    await GET(req);

    expect(posChain.eq).not.toHaveBeenCalledWith('status', 'all');
  });

  it('applies date range filters', async () => {
    const posChain = createChain({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => posChain);

    const req = createRequest('http://localhost/api/po/export?from=2025-01-01&to=2025-12-31');
    await GET(req);

    expect(posChain.gte).toHaveBeenCalledWith('created_at', '2025-01-01');
    expect(posChain.lte).toHaveBeenCalledWith('created_at', '2025-12-31');
  });

  it('applies vendor_id filter', async () => {
    const posChain = createChain({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => posChain);

    const req = createRequest('http://localhost/api/po/export?vendor_id=v-123');
    await GET(req);

    expect(posChain.eq).toHaveBeenCalledWith('vendor_id', 'v-123');
  });
});
