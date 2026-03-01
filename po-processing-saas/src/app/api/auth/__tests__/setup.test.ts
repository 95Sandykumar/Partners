import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────

const mockSupabase: Record<string, unknown> = {};
const mockServiceClient: Record<string, unknown> = {};

function resetMocks() {
  mockSupabase['auth'] = {
    getUser: vi.fn(),
  };
  mockSupabase['from'] = vi.fn();

  mockServiceClient['from'] = vi.fn();
  mockServiceClient['auth'] = {
    getUser: vi.fn(),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
  createServiceClient: vi.fn().mockImplementation(() => Promise.resolve(mockServiceClient)),
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
  AuthSetupSchema: {},
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/auth/setup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'insert', 'update'];
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

let POST: (req: NextRequest) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  resetMocks();

  const mod = await import('../setup/route');
  POST = mod.POST;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/auth/setup', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest({ orgName: 'Test Org', fullName: 'John Doe' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 409 when user already has a profile', async () => {
    // Service client: users query returns an existing user
    (mockServiceClient['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { id: 'test-user-id' }, error: null });
      }
      return createChain({ data: null, error: null });
    });

    const req = createRequest({ orgName: 'Test Org', fullName: 'John Doe' });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Account already set up');
  });

  it('creates organization and user profile successfully', async () => {
    const insertFn = vi.fn();

    (mockServiceClient['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        // First call: check existing user (returns null)
        // Second call: insert new user
        const chain = createChain({ data: null, error: null });
        chain['insert'] = insertFn.mockReturnValue(chain);
        return chain;
      }
      if (table === 'organizations') {
        return createChain({ data: { id: 'org-new', name: 'Test Org', slug: 'test-org' }, error: null });
      }
      return createChain({ data: null, error: null });
    });

    const req = createRequest({ orgName: 'Test Org', fullName: 'John Doe' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.organization_id).toBe('org-new');
    expect(mockServiceClient['from']).toHaveBeenCalledWith('organizations');
    expect(mockServiceClient['from']).toHaveBeenCalledWith('users');
  });

  it('returns 500 when organization creation fails', async () => {
    (mockServiceClient['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: null, error: null });
      }
      if (table === 'organizations') {
        // Route does `if (orgError) throw orgError` -- thrown object must be an Error instance
        // for the catch block to extract its message
        return createChain({ data: null, error: new Error('Duplicate slug') });
      }
      return createChain({ data: null, error: null });
    });

    const req = createRequest({ orgName: 'Test Org', fullName: 'John Doe' });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Duplicate slug');
  });

  it('returns 500 when user profile creation fails', async () => {
    const insertFn = vi.fn();
    (mockServiceClient['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        const chain = createChain({ data: null, error: null });
        // The insert call throws after org is created
        // Route does `if (userError) throw userError` -- must be Error instance
        chain['insert'] = insertFn.mockReturnValue(
          createChain({ data: null, error: new Error('User insert failed') })
        );
        return chain;
      }
      if (table === 'organizations') {
        return createChain({ data: { id: 'org-new' }, error: null });
      }
      return createChain({ data: null, error: null });
    });

    const req = createRequest({ orgName: 'Test Org', fullName: 'John Doe' });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('User insert failed');
  });
});
