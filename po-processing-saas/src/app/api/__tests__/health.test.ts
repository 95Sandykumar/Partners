import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────

const mockSupabase: Record<string, unknown> = {};
function resetMockSupabase() {
  mockSupabase['auth'] = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'not authenticated' } }),
  };
  mockSupabase['from'] = vi.fn();
  mockSupabase['storage'] = {
    getBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
  createServiceClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ check: vi.fn().mockResolvedValue({ success: true }) }),
  getClientIp: () => '127.0.0.1',
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function createChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit'];
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

  const mod = await import('../../api/health/route');
  GET = mod.GET;
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns healthy status when all checks pass', async () => {
    // DB check succeeds
    const chain = createChain({ data: [{ id: '1' }], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    // Auth check succeeds (expected to "fail" without token but service responds)
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });

    // Storage check succeeds
    (mockSupabase['storage'] as { getBucket: ReturnType<typeof vi.fn> }).getBucket.mockResolvedValue({
      data: {},
      error: null,
    });

    // Set env vars for the test
    const originalMistral = process.env.MISTRAL_API_KEY;
    const originalStripe = process.env.STRIPE_SECRET_KEY;
    const originalWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.MISTRAL_API_KEY = 'test-key';
    process.env.STRIPE_SECRET_KEY = 'test-key';
    process.env.STRIPE_WEBHOOK_SECRET = 'test-key';

    try {
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('healthy');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('checks');
      expect(body.checks.database.status).toBe('healthy');
      expect(body.checks.auth.status).toBe('healthy');
      expect(body.checks.storage.status).toBe('healthy');
      expect(body.checks.extraction_api.status).toBe('healthy');
      expect(body.checks.stripe.status).toBe('healthy');
    } finally {
      process.env.MISTRAL_API_KEY = originalMistral;
      process.env.STRIPE_SECRET_KEY = originalStripe;
      process.env.STRIPE_WEBHOOK_SECRET = originalWebhook;
    }
  });

  it('returns degraded status when database check fails', async () => {
    const chain = createChain({ data: null, error: { message: 'Connection refused' } });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });
    (mockSupabase['storage'] as { getBucket: ReturnType<typeof vi.fn> }).getBucket.mockResolvedValue({
      data: {},
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.checks.database.status).toBe('unhealthy');
    expect(body.checks.database.message).toBe('Connection refused');
  });

  it('returns degraded when storage bucket check fails', async () => {
    const chain = createChain({ data: [{ id: '1' }], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });
    (mockSupabase['storage'] as { getBucket: ReturnType<typeof vi.fn> }).getBucket.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    });

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.checks.storage.status).toBe('unhealthy');
  });

  it('reports unhealthy extraction_api when MISTRAL_API_KEY is missing', async () => {
    const chain = createChain({ data: [{ id: '1' }], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });
    (mockSupabase['storage'] as { getBucket: ReturnType<typeof vi.fn> }).getBucket.mockResolvedValue({
      data: {},
      error: null,
    });

    const originalKey = process.env.MISTRAL_API_KEY;
    delete process.env.MISTRAL_API_KEY;

    try {
      const res = await GET();
      const body = await res.json();
      expect(body.checks.extraction_api.status).toBe('unhealthy');
      expect(body.checks.extraction_api.message).toBe('MISTRAL_API_KEY not configured');
    } finally {
      if (originalKey) process.env.MISTRAL_API_KEY = originalKey;
    }
  });

  it('includes latency_ms in database check', async () => {
    const chain = createChain({ data: [{ id: '1' }], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });
    (mockSupabase['storage'] as { getBucket: ReturnType<typeof vi.fn> }).getBucket.mockResolvedValue({
      data: {},
      error: null,
    });

    const res = await GET();
    const body = await res.json();
    expect(body.checks.database).toHaveProperty('latency_ms');
    expect(typeof body.checks.database.latency_ms).toBe('number');
  });
});
