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

function createChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'in', 'gte', 'lte', 'ilike', 'neq'];
  for (const m of methods) {
    inner[m] = vi.fn().mockReturnValue(inner);
  }
  inner['single'] = vi.fn().mockResolvedValue(resolvedValue);
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

  const mod = await import('../review-queue/route');
  GET = mod.GET;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/review-queue', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/review-queue');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns review queue items with default pending status', async () => {
    const mockItems = [
      {
        id: 'rq-1',
        status: 'pending',
        priority: 3,
        purchase_order: { id: 'po-1', po_number: 'PO-001', vendor: { vendor_name: 'Acme' } },
      },
      {
        id: 'rq-2',
        status: 'pending',
        priority: 1,
        purchase_order: { id: 'po-2', po_number: 'PO-002', vendor: { vendor_name: 'Beta' } },
      },
    ];
    const chain = createChain({ data: mockItems, error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const req = createRequest('http://localhost/api/review-queue');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockItems);
    expect(mockSupabase['from']).toHaveBeenCalledWith('review_queue');
    // Default status filter is 'pending'
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('filters by custom status', async () => {
    const chain = createChain({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const req = createRequest('http://localhost/api/review-queue?status=reviewed');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith('status', 'reviewed');
  });

  it('does not filter by status when status is "all"', async () => {
    const chain = createChain({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const req = createRequest('http://localhost/api/review-queue?status=all');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(chain.eq).not.toHaveBeenCalledWith('status', expect.anything());
  });

  it('orders by priority desc then created_at asc', async () => {
    const chain = createChain({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const req = createRequest('http://localhost/api/review-queue');
    await GET(req);

    expect(chain.order).toHaveBeenCalledWith('priority', { ascending: false });
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('returns empty array when data is null', async () => {
    const chain = createChain({ data: null, error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const req = createRequest('http://localhost/api/review-queue');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    const chain = createChain({ data: null, error: { message: 'Query failed' } });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const req = createRequest('http://localhost/api/review-queue');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Query failed');
  });
});
