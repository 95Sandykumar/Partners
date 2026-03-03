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
  MappingCreateSchema: {},
  MappingBulkCreateSchema: {},
  MappingUpdateSchema: {},
  sanitizeSearchParam: vi.fn().mockImplementation((s: string | null) => s),
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), options);
}

function createChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert', 'delete', 'or', 'in', 'gte', 'lte'];
  for (const m of methods) {
    inner[m] = vi.fn().mockReturnValue(inner);
  }
  inner['single'] = vi.fn().mockResolvedValue(resolvedValue);
  inner['then'] = vi.fn().mockImplementation(
    (resolve: (v: unknown) => void) => Promise.resolve(resolvedValue).then(resolve)
  );
  return inner;
}

function createUserProfileChain() {
  return createChain({ data: { organization_id: 'org-1' }, error: null });
}

// ── Setup ────────────────────────────────────────────────────────────────

let GET: (req: NextRequest) => Promise<Response>;
let POST: (req: NextRequest) => Promise<Response>;
let PUT: (req: NextRequest) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  resetMockSupabase();

  const mod = await import('../route');
  GET = mod.GET;
  POST = mod.POST;
  PUT = mod.PUT;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
});

// ── GET Tests ────────────────────────────────────────────────────────────

describe('GET /api/mappings', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/mappings');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns mapping list successfully', async () => {
    const mockMappings = [
      { id: 'm-1', vendor_part_number: 'VP-100', internal_sku: 'SKU-001' },
      { id: 'm-2', vendor_part_number: 'VP-200', internal_sku: 'SKU-002' },
    ];
    const chain = createChain({ data: mockMappings, error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return createUserProfileChain();
      return chain;
    });

    const req = createRequest('http://localhost/api/mappings');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockMappings);
    expect(mockSupabase['from']).toHaveBeenCalledWith('vendor_mappings');
  });

  it('returns empty array when data is null', async () => {
    const chain = createChain({ data: null, error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return createUserProfileChain();
      return chain;
    });

    const req = createRequest('http://localhost/api/mappings');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('applies vendor_id filter', async () => {
    const chain = createChain({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return createUserProfileChain();
      return chain;
    });

    const req = createRequest('http://localhost/api/mappings?vendor_id=v-123');
    await GET(req);

    expect(chain.eq).toHaveBeenCalledWith('vendor_id', 'v-123');
  });

  it('applies search filter with or clause', async () => {
    const chain = createChain({ data: [], error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return createUserProfileChain();
      return chain;
    });

    const req = createRequest('http://localhost/api/mappings?search=widget');
    await GET(req);

    expect(chain.or).toHaveBeenCalledWith(
      expect.stringContaining('widget')
    );
  });

  it('returns 500 when database query fails', async () => {
    const chain = createChain({ data: null, error: { message: 'DB error' } });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return createUserProfileChain();
      return chain;
    });

    const req = createRequest('http://localhost/api/mappings');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });
});

// ── POST Tests ───────────────────────────────────────────────────────────

describe('POST /api/mappings', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({
        vendor_id: 'v-1',
        vendor_part_number: 'VP-100',
        internal_sku: 'SKU-001',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 404 when user profile not found', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return createChain({ data: null, error: null });
    });

    const req = createRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({
        vendor_id: 'v-1',
        vendor_part_number: 'VP-100',
        internal_sku: 'SKU-001',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Profile not found');
  });

  it('creates a single mapping successfully', async () => {
    const newMapping = { id: 'm-1', vendor_part_number: 'VP-100', internal_sku: 'SKU-001' };
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      return createChain({ data: newMapping, error: null });
    });

    const req = createRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({
        vendor_id: 'v-1',
        vendor_part_number: 'VP-100',
        internal_sku: 'SKU-001',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(newMapping);
    expect(mockSupabase['from']).toHaveBeenCalledWith('vendor_mappings');
  });

  it('handles bulk import (array body)', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      const chain = createChain({ data: [{}, {}, {}], error: null });
      return chain;
    });

    const bulkData = [
      { vendor_id: 'v-1', vendor_part_number: 'VP-100', internal_sku: 'SKU-001' },
      { vendor_id: 'v-1', vendor_part_number: 'VP-200', internal_sku: 'SKU-002' },
      { vendor_id: 'v-1', vendor_part_number: 'VP-300', internal_sku: 'SKU-003' },
    ];
    const req = createRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify(bulkData),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inserted).toBe(3);
  });

  it('returns 500 when insert fails', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      return createChain({ data: null, error: { message: 'Constraint violation' } });
    });

    const req = createRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({
        vendor_id: 'v-1',
        vendor_part_number: 'VP-100',
        internal_sku: 'SKU-001',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Constraint violation');
  });
});

// ── PUT Tests ────────────────────────────────────────────────────────────

describe('PUT /api/mappings', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/mappings', {
      method: 'PUT',
      body: JSON.stringify({ id: 'm-1', internal_sku: 'SKU-UPDATED' }),
    });
    const res = await PUT(req);

    expect(res.status).toBe(401);
  });

  it('returns 404 when user profile not found', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return createChain({ data: null, error: null });
    });

    const req = createRequest('http://localhost/api/mappings', {
      method: 'PUT',
      body: JSON.stringify({ id: 'm-1', internal_sku: 'SKU-UPDATED' }),
    });
    const res = await PUT(req);

    expect(res.status).toBe(404);
  });

  it('updates a mapping successfully', async () => {
    const updatedMapping = { id: 'm-1', vendor_part_number: 'VP-100', internal_sku: 'SKU-UPDATED' };
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      return createChain({ data: updatedMapping, error: null });
    });

    const req = createRequest('http://localhost/api/mappings', {
      method: 'PUT',
      body: JSON.stringify({ id: 'm-1', internal_sku: 'SKU-UPDATED' }),
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(updatedMapping);
  });
});
