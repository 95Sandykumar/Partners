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

vi.mock('@/lib/validation/validate', () => ({
  validateBody: vi.fn().mockImplementation((_schema: unknown, data: unknown) => ({
    success: true,
    data,
  })),
}));

vi.mock('@/lib/validation/schemas', () => ({
  VendorCreateSchema: {},
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), options);
}

function createChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert', 'delete', 'or', 'in'];
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
let POST: (req: NextRequest) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  resetMockSupabase();

  const mod = await import('../route');
  GET = mod.GET;
  POST = mod.POST;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
});

// ── GET Tests ────────────────────────────────────────────────────────────

describe('GET /api/vendors', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns vendor list successfully', async () => {
    const mockVendors = [
      { id: 'v-1', vendor_name: 'Acme Corp', templates: [] },
      { id: 'v-2', vendor_name: 'Beta Inc', templates: [{ id: 't-1', version: '1.0', is_active: true }] },
    ];
    const chain = createChain({ data: mockVendors, error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockVendors);
    expect(mockSupabase['from']).toHaveBeenCalledWith('vendors');
  });

  it('returns empty array when data is null', async () => {
    const chain = createChain({ data: null, error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    const chain = createChain({ data: null, error: { message: 'DB error' } });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });
});

// ── POST Tests ───────────────────────────────────────────────────────────

describe('POST /api/vendors', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/vendors', {
      method: 'POST',
      body: JSON.stringify({ vendor_id: 'V-001', vendor_name: 'Test' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 404 when user profile not found', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return createChain({ data: null, error: null });
    });

    const req = createRequest('http://localhost/api/vendors', {
      method: 'POST',
      body: JSON.stringify({ vendor_id: 'V-001', vendor_name: 'Test' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Profile not found');
  });

  it('creates a vendor successfully', async () => {
    const newVendor = { id: 'v-new', vendor_id: 'V-001', vendor_name: 'New Vendor' };
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      // vendors insert chain
      return createChain({ data: newVendor, error: null });
    });

    const req = createRequest('http://localhost/api/vendors', {
      method: 'POST',
      body: JSON.stringify({ vendor_id: 'V-001', vendor_name: 'New Vendor' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(newVendor);
    expect(mockSupabase['from']).toHaveBeenCalledWith('vendors');
  });

  it('creates vendor with template_data', async () => {
    const newVendor = { id: 'v-new', vendor_id: 'V-001', vendor_name: 'New Vendor' };
    const insertFn = vi.fn();

    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      if (table === 'vendor_templates') {
        const chain = createChain({ data: null, error: null });
        chain['insert'] = insertFn.mockReturnValue(chain);
        return chain;
      }
      return createChain({ data: newVendor, error: null });
    });

    const req = createRequest('http://localhost/api/vendors', {
      method: 'POST',
      body: JSON.stringify({
        vendor_id: 'V-001',
        vendor_name: 'New Vendor',
        template_data: { header_region: { x: 0, y: 0 } },
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSupabase['from']).toHaveBeenCalledWith('vendor_templates');
    expect(insertFn).toHaveBeenCalledWith({
      vendor_id: 'v-new',
      template_data: { header_region: { x: 0, y: 0 } },
      is_active: true,
    });
  });

  it('returns 500 when insert fails', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      return createChain({ data: null, error: { message: 'Duplicate vendor_id' } });
    });

    const req = createRequest('http://localhost/api/vendors', {
      method: 'POST',
      body: JSON.stringify({ vendor_id: 'V-001', vendor_name: 'Test' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Duplicate vendor_id');
  });
});
