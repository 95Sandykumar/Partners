import { describe, it, expect, vi, beforeEach } from 'vitest';

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

function createChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'gte', 'lte', 'gt', 'in'];
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

let GET: () => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  resetMockSupabase();

  const mod = await import('../stats/route');
  GET = mod.GET;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/dashboard/stats', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns dashboard stats successfully', async () => {
    // The route uses Promise.all for 4 parallel queries, then one more for extraction_logs.
    // We need to track the table being queried to return appropriate data.
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'purchase_orders') {
        // For POs, there are two calls:
        //  1. POs today (head: true, count: 'exact')
        //  2. All POs (select extraction_confidence)
        return createChain({
          data: [
            { extraction_confidence: 90, id: '1' },
            { extraction_confidence: 80, id: '2' },
          ],
          error: null,
          count: 5,
        });
      }
      if (table === 'review_queue') {
        return createChain({ data: null, error: null, count: 3 });
      }
      if (table === 'vendors') {
        return createChain({ data: null, error: null, count: 10 });
      }
      if (table === 'extraction_logs') {
        return createChain({
          data: [
            { line_count: 10, matched_count: 8 },
            { line_count: 5, matched_count: 5 },
          ],
          error: null,
        });
      }
      return createChain({ data: null, error: null });
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('pos_today');
    expect(body).toHaveProperty('pending_reviews');
    expect(body).toHaveProperty('avg_confidence');
    expect(body).toHaveProperty('match_rate');
    expect(body).toHaveProperty('total_pos');
    expect(body).toHaveProperty('total_vendors');
  });

  it('handles empty data gracefully', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return createChain({ data: [], error: null, count: 0 });
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.avg_confidence).toBe(0);
    expect(body.match_rate).toBe(0);
    expect(body.total_pos).toBe(0);
  });

  it('calculates average confidence correctly', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'purchase_orders') {
        return createChain({
          data: [
            { extraction_confidence: 100, id: '1' },
            { extraction_confidence: 50, id: '2' },
          ],
          error: null,
          count: 2,
        });
      }
      if (table === 'extraction_logs') {
        return createChain({ data: [], error: null });
      }
      return createChain({ data: null, error: null, count: 0 });
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.avg_confidence).toBe(75);
    expect(body.total_pos).toBe(2);
  });
});
