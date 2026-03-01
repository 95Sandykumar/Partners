import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- mocks ----

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
};

const mockStripe = {
  webhooks: { constructEvent: vi.fn() },
};

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn().mockResolvedValue(mockSupabase),
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
  getPriceIdToTierMap: vi.fn().mockReturnValue({ price_starter_test: 'starter' }),
}));

// ---- helpers ----

function makeRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/billing/webhook', {
    method: 'POST',
    body,
    headers,
  });
}

// ---- tests ----

describe('POST /api/billing/webhook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: 'whsec_test' };

    // Default: no duplicate event found
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.insert.mockReturnThis();
    mockSupabase.update.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 400 if signature is missing', async () => {
    const { POST } = await import('@/app/api/billing/webhook/route');
    const req = makeRequest('{}', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing signature|webhook secret/i);
  });

  it('returns 400 if STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { POST } = await import('@/app/api/billing/webhook/route');
    const req = makeRequest('{}', { 'stripe-signature': 'sig_test' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing signature|webhook secret/i);
  });

  it('returns 400 on invalid signature (error message includes "signature")', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('No signature found matching the expected signature for payload');
    });

    const { POST } = await import('@/app/api/billing/webhook/route');
    const req = makeRequest('{}', { 'stripe-signature': 'sig_bad' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
  });

  it('returns 200 for checkout.session.completed event', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { organization_id: 'org_1', tier: 'starter' },
          subscription: 'sub_123',
        },
      },
    });

    const { POST } = await import('@/app/api/billing/webhook/route');
    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('returns 200 for invoice.payment_failed event', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_invoice_fail_1',
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_123',
        },
      },
    });

    // Simulate org found
    mockSupabase.single
      .mockResolvedValueOnce({ data: null, error: null })  // idempotency check: no duplicate
      .mockResolvedValueOnce({ data: { id: 'org_1' }, error: null }); // org lookup

    const { POST } = await import('@/app/api/billing/webhook/route');
    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('handles processing errors gracefully (returns 200, not 400)', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_error_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { organization_id: 'org_1', tier: 'starter' },
          subscription: 'sub_123',
        },
      },
    });

    // Make supabase throw a non-signature error during processing
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }); // idempotency: no dup
    mockSupabase.insert.mockRejectedValueOnce(new Error('Database connection lost'));

    const { POST } = await import('@/app/api/billing/webhook/route');
    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('idempotency: returns 200 with duplicate:true for already-processed events', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_duplicate_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { organization_id: 'org_1', tier: 'starter' },
          subscription: 'sub_123',
        },
      },
    });

    // Simulate that the event was already processed
    mockSupabase.single.mockResolvedValueOnce({
      data: { event_id: 'evt_duplicate_1' },
      error: null,
    });

    const { POST } = await import('@/app/api/billing/webhook/route');
    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
  });
});
