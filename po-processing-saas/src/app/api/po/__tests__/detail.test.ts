import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────

const mockCreateSignedUrl = vi.fn();
const mockSupabase: Record<string, unknown> = {};

function resetMockSupabase() {
  mockSupabase['auth'] = {
    getUser: vi.fn(),
  };
  mockSupabase['from'] = vi.fn();
  mockSupabase['storage'] = {
    from: vi.fn().mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ check: vi.fn().mockResolvedValue({ success: true }) }),
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/validation/validate', () => ({
  validateBody: vi.fn().mockImplementation((_schema: unknown, data: unknown) => ({
    success: true,
    data,
  })),
}));

vi.mock('@/lib/validation/schemas', () => ({
  POUpdateSchema: {},
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), options);
}

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ── Setup ────────────────────────────────────────────────────────────────

let GET: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let PUT: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  resetMockSupabase();

  const mod = await import('../[id]/route');
  GET = mod.GET;
  PUT = mod.PUT;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
});

// ── GET [id] Tests ───────────────────────────────────────────────────────

function createUserProfileChain() {
  const inner: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order']) {
    inner[m] = vi.fn().mockReturnValue(inner);
  }
  inner['single'] = vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null });
  return inner;
}

describe('GET /api/po/[id]', () => {
  function setupGetChain(resolved: unknown) {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return createUserProfileChain();
      const inner: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'order']) {
        inner[m] = vi.fn().mockReturnValue(inner);
      }
      inner['single'] = vi.fn().mockResolvedValue(resolved);
      return inner;
    });
  }

  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/po/123');
    const res = await GET(req, routeParams('123'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when PO is not found', async () => {
    setupGetChain({ data: null, error: { message: 'Not found' } });

    const req = createRequest('http://localhost/api/po/nonexistent');
    const res = await GET(req, routeParams('nonexistent'));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('PO not found');
  });

  it('returns PO detail with signed PDF URL', async () => {
    const mockPO = {
      id: 'po-123',
      po_number: 'PO-001',
      pdf_storage_path: 'pdfs/test.pdf',
      review_queue_item: [{ id: 'rq-1', status: 'pending' }],
    };
    setupGetChain({ data: mockPO, error: null });
    mockCreateSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: 'https://example.com/signed-pdf' },
    });

    const req = createRequest('http://localhost/api/po/po-123');
    const res = await GET(req, routeParams('po-123'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('po-123');
    expect(body.review_queue_item).toEqual({ id: 'rq-1', status: 'pending' });
    expect(body.pdf_url).toBe('https://example.com/signed-pdf');
    expect((mockSupabase['storage'] as { from: ReturnType<typeof vi.fn> }).from).toHaveBeenCalledWith('po-pdfs');
  });

  it('returns null pdf_url when no signed url available', async () => {
    const mockPO = {
      id: 'po-123',
      po_number: 'PO-001',
      pdf_storage_path: 'pdfs/test.pdf',
      review_queue_item: [],
    };
    setupGetChain({ data: mockPO, error: null });
    mockCreateSignedUrl.mockResolvedValueOnce({ data: null });

    const req = createRequest('http://localhost/api/po/po-123');
    const res = await GET(req, routeParams('po-123'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pdf_url).toBeNull();
    expect(body.review_queue_item).toBeNull();
  });
});

// ── PUT [id] Tests ───────────────────────────────────────────────────────

describe('PUT /api/po/[id]', () => {
  function setupUpdateChain() {
    const updateFn = vi.fn();
    const eqFn = vi.fn();
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return createUserProfileChain();
      const inner: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'order', 'single']) {
        inner[m] = vi.fn().mockReturnValue(inner);
      }
      // For the ownership check query (from('purchase_orders').select('id').eq('id', ...).eq('organization_id', ...).single())
      // it needs to resolve with a found PO
      inner['single'] = vi.fn().mockResolvedValue({ data: { id: 'po-123' }, error: null });
      inner['update'] = updateFn.mockReturnValue(inner);
      inner['eq'] = eqFn.mockReturnValue(inner);
      return inner;
    });
    return { updateFn, eqFn };
  }

  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/po/123', {
      method: 'PUT',
      body: JSON.stringify({ status: 'approved' }),
    });
    const res = await PUT(req, routeParams('123'));

    expect(res.status).toBe(401);
  });

  it('updates PO status successfully', async () => {
    const { updateFn } = setupUpdateChain();

    const req = createRequest('http://localhost/api/po/po-123', {
      method: 'PUT',
      body: JSON.stringify({ status: 'approved' }),
    });
    const res = await PUT(req, routeParams('po-123'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(updateFn).toHaveBeenCalledWith({ status: 'approved' });
  });

  it('updates line items when provided', async () => {
    setupUpdateChain();

    const lineItems = [
      { id: 'li-1', quantity: 10 },
      { id: 'li-2', unit_price: 25.00 },
    ];
    const req = createRequest('http://localhost/api/po/po-123', {
      method: 'PUT',
      body: JSON.stringify({ line_items: lineItems }),
    });
    const res = await PUT(req, routeParams('po-123'));

    expect(res.status).toBe(200);
    expect(mockSupabase['from']).toHaveBeenCalledWith('po_line_items');
  });

  it('updates both PO fields and line items', async () => {
    setupUpdateChain();

    const req = createRequest('http://localhost/api/po/po-123', {
      method: 'PUT',
      body: JSON.stringify({
        status: 'approved',
        total: 500.00,
        line_items: [{ id: 'li-1', quantity: 5 }],
      }),
    });
    const res = await PUT(req, routeParams('po-123'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockSupabase['from']).toHaveBeenCalledWith('purchase_orders');
    expect(mockSupabase['from']).toHaveBeenCalledWith('po_line_items');
  });
});
