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
  ProductCreateSchema: {},
  ProductBulkCreateSchema: {},
  ProductUpdateSchema: {},
  ProductDeleteSchema: {},
  sanitizeSearchParam: vi.fn().mockImplementation((s: string | null) => s),
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), options);
}

function createChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert', 'delete', 'or', 'in', 'gte', 'lte', 'ilike', 'neq'];
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
let POST: (req: NextRequest) => Promise<Response>;
let PUT: (req: NextRequest) => Promise<Response>;
let DELETE: (req: NextRequest) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  resetMockSupabase();

  const mod = await import('../route');
  GET = mod.GET;
  POST = mod.POST;
  PUT = mod.PUT;
  DELETE = mod.DELETE;

  (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  });
});

function setupUserProfile(orgId: string | null = 'org-1') {
  const tables: Record<string, unknown> = {
    users: { data: orgId ? { organization_id: orgId } : null, error: null },
    products: { data: null, error: null },
  };

  (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    const resolved = tables[table] ?? { data: null, error: null };
    return createChain(resolved);
  });
}

// ── GET Tests ────────────────────────────────────────────────────────────

describe('GET /api/products', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/products');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns product list successfully', async () => {
    const mockProducts = [
      { id: '1', internal_sku: 'SKU-001', description: 'Widget A' },
      { id: '2', internal_sku: 'SKU-002', description: 'Widget B' },
    ];
    const chain = createChain({ data: mockProducts, error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const req = createRequest('http://localhost/api/products');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockProducts);
    expect(mockSupabase['from']).toHaveBeenCalledWith('products');
  });

  it('returns empty array when data is null', async () => {
    const chain = createChain({ data: null, error: null });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const req = createRequest('http://localhost/api/products');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    const chain = createChain({ data: null, error: { message: 'DB error' } });
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const req = createRequest('http://localhost/api/products');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });
});

// ── POST Tests ───────────────────────────────────────────────────────────

describe('POST /api/products', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ internal_sku: 'SKU-001', description: 'Widget' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 404 when user profile not found', async () => {
    setupUserProfile(null);

    const req = createRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ internal_sku: 'SKU-001', description: 'Widget' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Profile not found');
  });

  it('creates a single product successfully', async () => {
    const newProduct = { id: 'prod-1', internal_sku: 'SKU-001', description: 'Widget A' };
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      return createChain({ data: newProduct, error: null });
    });

    const req = createRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ internal_sku: 'SKU-001', description: 'Widget A' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(newProduct);
  });

  it('handles bulk import (array body)', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      const chain = createChain({ data: [{}, {}], error: null });
      // For bulk, upsert is used then select, no single
      return chain;
    });

    const bulkData = [
      { internal_sku: 'SKU-001', description: 'Widget A' },
      { internal_sku: 'SKU-002', description: 'Widget B' },
    ];
    const req = createRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify(bulkData),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inserted).toBe(2);
  });
});

// ── PUT Tests ────────────────────────────────────────────────────────────

describe('PUT /api/products', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/products', {
      method: 'PUT',
      body: JSON.stringify({ id: 'prod-1', description: 'Updated' }),
    });
    const res = await PUT(req);

    expect(res.status).toBe(401);
  });

  it('returns 404 when user profile not found', async () => {
    setupUserProfile(null);

    const req = createRequest('http://localhost/api/products', {
      method: 'PUT',
      body: JSON.stringify({ id: 'prod-1', description: 'Updated' }),
    });
    const res = await PUT(req);

    expect(res.status).toBe(404);
  });

  it('updates a product successfully', async () => {
    const updatedProduct = { id: 'prod-1', internal_sku: 'SKU-001', description: 'Updated Widget' };
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      return createChain({ data: updatedProduct, error: null });
    });

    const req = createRequest('http://localhost/api/products', {
      method: 'PUT',
      body: JSON.stringify({ id: 'prod-1', description: 'Updated Widget' }),
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(updatedProduct);
  });
});

// ── DELETE Tests ──────────────────────────────────────────────────────────

describe('DELETE /api/products', () => {
  it('returns 401 when user is not authenticated', async () => {
    (mockSupabase['auth'] as { getUser: ReturnType<typeof vi.fn> }).getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const req = createRequest('http://localhost/api/products', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'prod-1' }),
    });
    const res = await DELETE(req);

    expect(res.status).toBe(401);
  });

  it('soft deletes a product successfully', async () => {
    (mockSupabase['from'] as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return createChain({ data: { organization_id: 'org-1' }, error: null });
      }
      const chain = createChain({ data: null, error: null });
      return chain;
    });

    const req = createRequest('http://localhost/api/products', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'prod-1' }),
    });
    const res = await DELETE(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
