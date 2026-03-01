import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- mocks ----

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

const mockStripe = {
  billingPortal: {
    sessions: {
      create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/portal_url' }),
    },
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock('@/lib/stripe/server', () => ({
  getStripe: vi.fn().mockReturnValue(mockStripe),
}));

// ---- helpers ----

function resetMockChain() {
  mockSupabase.from.mockReturnThis();
  mockSupabase.select.mockReturnThis();
  mockSupabase.eq.mockReturnThis();
  mockSupabase.single.mockReset();
}

// ---- tests ----

describe('POST /api/billing/portal', () => {
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

    const { POST } = await import('@/app/api/billing/portal/route');
    const res = await POST();
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

    const { POST } = await import('@/app/api/billing/portal/route');
    const res = await POST();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/admin/i);
  });

  it('returns 404 if no Stripe customer', async () => {
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
      // from('organizations') => no stripe_customer_id
      .mockResolvedValueOnce({
        data: { stripe_customer_id: null },
        error: null,
      });

    const { POST } = await import('@/app/api/billing/portal/route');
    const res = await POST();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/billing account/i);
  });

  it('returns portal URL on success', async () => {
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
        data: { stripe_customer_id: 'cus_existing_789' },
        error: null,
      });

    const { POST } = await import('@/app/api/billing/portal/route');
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.portalUrl).toBe('https://billing.stripe.com/portal_url');

    // Verify correct customer was used
    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing_789',
      })
    );
  });
});
