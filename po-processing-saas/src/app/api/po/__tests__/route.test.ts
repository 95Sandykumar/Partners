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

function setupFromChain(resolvedValue: unknown = { data: [], error: null }) {
  (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const inner: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'in', 'gte', 'lte', 'ilike', 'neq']) {
      inner[m] = vi.fn().mockReturnValue(inner);
    }
    // The terminal call (limit in this case) should resolve
    inner['limit'] = vi.fn().mockResolvedValue(resolvedValue);
    // Also make eq resolve (for when eq is the terminal call after filters)
    inner['eq'] = vi.fn().mockImplementation(() => {
      // Return a new inner that also has limit resolving
      const next: Record<string, unknown> = { ...inner };
      next['eq'] = vi.fn().mockReturnValue(next);
      next['limit'] = vi.fn().mockResolvedValue(resolvedValue);
      return next;
    });
    return inner;
  });
}

// ── Setup ────────────────────────────────────────────────────────────────

let GET: (req: NextRequest) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  resetMockSupabase();

  const mod = await import('../route');
  GET = mod.GET;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
  setupFromChain({ data: [], error: null });
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/po (list)', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/po');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns PO list with default parameters', async () => {
    const mockData = [
      { id: '1', po_number: 'PO-001', status: 'pending_review' },
      { id: '2', po_number: 'PO-002', status: 'approved' },
    ];
    setupFromChain({ data: mockData, error: null });

    const req = createRequest('http://localhost/api/po');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockData);
    expect(mockSupabase['from']).toHaveBeenCalledWith('purchase_orders');
  });

  it('applies status filter when provided', async () => {
    const selectFn = vi.fn();
    const orderFn = vi.fn();
    const limitFn = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqFn = vi.fn().mockResolvedValue({ data: [], error: null });

    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: selectFn.mockReturnValue({
        order: orderFn.mockReturnValue({
          limit: limitFn.mockReturnValue({
            eq: eqFn,
          }),
        }),
      }),
    }));

    const req = createRequest('http://localhost/api/po?status=approved');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(eqFn).toHaveBeenCalledWith('status', 'approved');
  });

  it('applies vendor_id filter when provided', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const inner: Record<string, unknown> = {};
      for (const m of ['select', 'order', 'limit', 'eq']) {
        inner[m] = vi.fn().mockReturnValue(inner);
      }
      inner['eq'] = eqFn.mockReturnValue(inner);
      // Resolve after the last eq call
      eqFn.mockResolvedValue({ data: [], error: null });
      return inner;
    });

    const req = createRequest('http://localhost/api/po?vendor_id=v123');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(eqFn).toHaveBeenCalledWith('vendor_id', 'v123');
  });

  it('returns 500 when database query fails', async () => {
    setupFromChain({ data: null, error: { message: 'DB error' } });

    const req = createRequest('http://localhost/api/po');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });

  it('returns empty array when data is null', async () => {
    setupFromChain({ data: null, error: null });

    const req = createRequest('http://localhost/api/po');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
