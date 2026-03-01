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

  const mod = await import('../analytics/route');
  GET = mod.GET;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/dashboard/analytics', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns analytics data successfully', async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'purchase_orders') {
        return createChain({
          data: [
            {
              created_at: `${today}T10:00:00Z`,
              extraction_confidence: 90,
              vendor_id: 'v-1',
              vendors: { vendor_name: 'Acme Corp' },
            },
            {
              created_at: `${today}T14:00:00Z`,
              extraction_confidence: 60,
              vendor_id: 'v-2',
              vendors: { vendor_name: 'Beta Inc' },
            },
          ],
          error: null,
        });
      }
      if (table === 'extraction_logs') {
        return createChain({
          data: [
            { created_at: `${today}T10:00:00Z`, matched_count: 8, line_count: 10 },
          ],
          error: null,
        });
      }
      return createChain({ data: [], error: null });
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('posOverTime');
    expect(body).toHaveProperty('confidenceDistribution');
    expect(body).toHaveProperty('vendorBreakdown');
    expect(body).toHaveProperty('matchRateTrend');
    expect(Array.isArray(body.posOverTime)).toBe(true);
    expect(Array.isArray(body.confidenceDistribution)).toBe(true);
    expect(Array.isArray(body.vendorBreakdown)).toBe(true);
    expect(Array.isArray(body.matchRateTrend)).toBe(true);
  });

  it('handles empty data gracefully', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return createChain({ data: [], error: null });
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posOverTime).toBeDefined();
    expect(body.confidenceDistribution).toEqual([
      { range: 'High (85-100%)', count: 0 },
      { range: 'Medium (60-84%)', count: 0 },
      { range: 'Low (<60%)', count: 0 },
    ]);
    expect(body.vendorBreakdown).toEqual([]);
    expect(body.matchRateTrend).toEqual([]);
  });

  it('correctly categorizes confidence distribution', async () => {
    const today = new Date().toISOString().split('T')[0];

    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'purchase_orders') {
        return createChain({
          data: [
            { created_at: `${today}T10:00:00Z`, extraction_confidence: 95, vendor_id: 'v-1', vendors: { vendor_name: 'A' } },
            { created_at: `${today}T11:00:00Z`, extraction_confidence: 85, vendor_id: 'v-1', vendors: { vendor_name: 'A' } },
            { created_at: `${today}T12:00:00Z`, extraction_confidence: 70, vendor_id: 'v-1', vendors: { vendor_name: 'A' } },
            { created_at: `${today}T13:00:00Z`, extraction_confidence: 50, vendor_id: 'v-1', vendors: { vendor_name: 'A' } },
          ],
          error: null,
        });
      }
      return createChain({ data: [], error: null });
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    const dist = body.confidenceDistribution;
    expect(dist.find((d: { range: string }) => d.range.includes('High')).count).toBe(2); // 95, 85
    expect(dist.find((d: { range: string }) => d.range.includes('Medium')).count).toBe(1); // 70
    expect(dist.find((d: { range: string }) => d.range.includes('Low')).count).toBe(1); // 50
  });

  it('sorts vendor breakdown by count descending', async () => {
    const today = new Date().toISOString().split('T')[0];

    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'purchase_orders') {
        return createChain({
          data: [
            { created_at: `${today}T10:00:00Z`, extraction_confidence: 90, vendor_id: 'v-1', vendors: { vendor_name: 'Acme' } },
            { created_at: `${today}T11:00:00Z`, extraction_confidence: 80, vendor_id: 'v-2', vendors: { vendor_name: 'Beta' } },
            { created_at: `${today}T12:00:00Z`, extraction_confidence: 70, vendor_id: 'v-1', vendors: { vendor_name: 'Acme' } },
          ],
          error: null,
        });
      }
      return createChain({ data: [], error: null });
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vendorBreakdown[0].vendor).toBe('Acme');
    expect(body.vendorBreakdown[0].count).toBe(2);
    expect(body.vendorBreakdown[1].vendor).toBe('Beta');
    expect(body.vendorBreakdown[1].count).toBe(1);
  });
});
