import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- mocks ----

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

const mockStripe = {
  customers: {
    create: vi.fn().mockResolvedValue({ id: 'cus_new_123' }),
    del: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session_url' }),
    },
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock('@/lib/stripe/server', () => ({
  getStripe: vi.fn().mockReturnValue(mockStripe),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ check: vi.fn().mockResolvedValue({ success: true }) }),
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/stripe/plans', () => ({
  BILLING_PLANS: {
    free: { poLimit: 50 },
    starter: { poLimit: 200 },
    professional: { poLimit: 500 },
    enterprise: { poLimit: -1 },
  },
  getTierToPriceIdMap: vi.fn().mockReturnValue({ starter: 'price_starter_test' }),
}));

vi.mock('@/lib/validation/validate', () => ({
  validateBody: vi.fn().mockReturnValue({ success: true, data: { tier: 'starter' } }),
}));

vi.mock('@/lib/validation/schemas', () => ({
  CheckoutSchema: {},
}));

// ---- helpers ----

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function resetMockChain() {
  mockSupabase.from.mockReturnThis();
  mockSupabase.select.mockReturnThis();
  mockSupabase.insert.mockReturnThis();
  mockSupabase.update.mockReturnThis();
  mockSupabase.eq.mockReturnThis();
  mockSupabase.is.mockReturnThis();
  mockSupabase.single.mockReset();
}

// ---- tests ----

describe('POST /api/billing/checkout', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockChain();
    process.env = { ...originalEnv, NEXT_PUBLIC_APP_URL: 'http://localhost:3000' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 401 without auth', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const res = await POST(makeRequest({ tier: 'starter' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/unauthorized/i);
  });

  it('returns 403 for non-admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user_1', email: 'test@test.com' } },
      error: null,
    });

    // from('users').select().eq().single() => member role
    mockSupabase.single.mockResolvedValueOnce({
      data: { organization_id: 'org_1', role: 'member' },
      error: null,
    });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const res = await POST(makeRequest({ tier: 'starter' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/admin/i);
  });

  it('returns 400 for invalid/missing tier (no price configured)', async () => {
    const { validateBody } = await import('@/lib/validation/validate');
    // Return a tier that has no price ID mapping
    (validateBody as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      success: true,
      data: { tier: 'nonexistent_tier' },
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user_1', email: 'test@test.com' } },
      error: null,
    });

    // from('users') => admin
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { organization_id: 'org_1', role: 'admin' },
        error: null,
      })
      // from('organizations')
      .mockResolvedValueOnce({
        data: { id: 'org_1', name: 'Test Org', stripe_customer_id: 'cus_existing' },
        error: null,
      });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const res = await POST(makeRequest({ tier: 'nonexistent_tier' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/price not configured/i);
  });

  it('creates Stripe customer if none exists', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user_1', email: 'test@test.com' } },
      error: null,
    });

    // from('users') => admin
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { organization_id: 'org_1', role: 'admin' },
        error: null,
      })
      // from('organizations') => no stripe customer
      .mockResolvedValueOnce({
        data: { id: 'org_1', name: 'Test Org', stripe_customer_id: null },
        error: null,
      })
      // re-check fresh query => still no customer
      .mockResolvedValueOnce({
        data: { stripe_customer_id: null },
        error: null,
      });

    // update for setting stripe_customer_id succeeds (no error => no race)
    mockSupabase.update.mockReturnThis();
    mockSupabase.is.mockReturnValue({ error: null });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const res = await POST(makeRequest({ tier: 'starter' }));
    expect(res.status).toBe(200);

    // Verify customer was created
    expect(mockStripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@test.com',
        metadata: expect.objectContaining({ organization_id: 'org_1' }),
      })
    );

    const json = await res.json();
    expect(json.sessionUrl).toBe('https://checkout.stripe.com/session_url');
  });

  it('reuses existing Stripe customer', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user_1', email: 'test@test.com' } },
      error: null,
    });

    // from('users') => admin
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { organization_id: 'org_1', role: 'admin' },
        error: null,
      })
      // from('organizations') => has stripe customer
      .mockResolvedValueOnce({
        data: { id: 'org_1', name: 'Test Org', stripe_customer_id: 'cus_existing_456' },
        error: null,
      });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const res = await POST(makeRequest({ tier: 'starter' }));
    expect(res.status).toBe(200);

    // Customer should NOT be created
    expect(mockStripe.customers.create).not.toHaveBeenCalled();

    // Checkout session should use existing customer
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing_456',
      })
    );

    const json = await res.json();
    expect(json.sessionUrl).toBe('https://checkout.stripe.com/session_url');
  });

  it('returns checkout session URL on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user_1', email: 'test@test.com' } },
      error: null,
    });

    mockSupabase.single
      .mockResolvedValueOnce({
        data: { organization_id: 'org_1', role: 'admin' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'org_1', name: 'Test Org', stripe_customer_id: 'cus_existing' },
        error: null,
      });

    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/cs_test_abc',
    });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const res = await POST(makeRequest({ tier: 'starter' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sessionUrl).toBe('https://checkout.stripe.com/pay/cs_test_abc');
  });
});
