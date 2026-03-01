import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock state ───────────────────────────────────────────────────

const {
  mockAuthGetUser,
  mockUserFrom,
  mockRpc,
  mockDetectCorrections,
  mockRecordCorrections,
  mockUpdateAccuracyMetrics,
  mockValidateBody,
} = vi.hoisted(() => ({
  mockAuthGetUser: vi.fn(),
  mockUserFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockDetectCorrections: vi.fn(),
  mockRecordCorrections: vi.fn(),
  mockUpdateAccuracyMetrics: vi.fn(),
  mockValidateBody: vi.fn(),
}));

// ── Module mocks ─────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockAuthGetUser },
    from: mockUserFrom,
    rpc: mockRpc,
  }),
}));

vi.mock('@/lib/extraction/correction-tracker', () => ({
  detectCorrections: (...args: unknown[]) => mockDetectCorrections(...args),
  recordCorrections: (...args: unknown[]) => mockRecordCorrections(...args),
  updateAccuracyMetrics: (...args: unknown[]) => mockUpdateAccuracyMetrics(...args),
}));

vi.mock('@/lib/validation/validate', () => ({
  validateBody: (...args: unknown[]) => mockValidateBody(...args),
}));

vi.mock('@/lib/validation/schemas', () => ({
  POApprovalSchema: {},
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function buildRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/po/test-po-id/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const routeParams = { params: Promise.resolve({ id: 'test-po-id' }) };

/** Build a chainable supabase query mock */
function makeChain(resolvedValue: unknown) {
  const inner: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'insert', 'update', 'upsert', 'order', 'delete']) {
    inner[m] = vi.fn().mockReturnValue(inner);
  }
  inner['single'] = vi.fn().mockResolvedValue(resolvedValue);
  inner['upsert'] = vi.fn().mockResolvedValue({ data: null, error: null });
  return inner;
}

function setupFromChain(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    users: { data: { organization_id: 'org-1' }, error: null },
    purchase_orders: { data: { raw_extraction: null, vendor_id: 'v-1', organization_id: 'org-1' }, error: null },
    po_line_items: { data: [], error: null },
    vendor_mappings: { data: null, error: null },
    ...overrides,
  };

  mockUserFrom.mockImplementation((table: string) => {
    const resolved = defaults[table] ?? { data: null, error: null };
    const inner: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'insert', 'update', 'upsert', 'delete']) {
      inner[m] = vi.fn().mockReturnValue(inner);
    }
    inner['single'] = vi.fn().mockResolvedValue(resolved);
    inner['upsert'] = vi.fn().mockResolvedValue({ data: null, error: null });
    // For po_line_items: .order() should resolve the list data
    if (table === 'po_line_items') {
      inner['order'] = vi.fn().mockResolvedValue(resolved);
    } else {
      inner['order'] = vi.fn().mockReturnValue(inner);
    }
    return inner;
  });
}

// ── Setup ────────────────────────────────────────────────────────────────

let POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();

  const mod = await import('@/app/api/po/[id]/approve/route');
  POST = mod.POST;

  // Defaults
  mockAuthGetUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
  });
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockDetectCorrections.mockReturnValue([]);
  mockRecordCorrections.mockResolvedValue(undefined);
  mockUpdateAccuracyMetrics.mockResolvedValue(undefined);

  setupFromChain();
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/po/[id]/approve', () => {
  it('returns 401 without auth', async () => {
    mockAuthGetUser.mockResolvedValueOnce({
      data: { user: null },
    });

    mockValidateBody.mockReturnValue({
      success: true,
      data: { action: 'approve' },
    });

    const res = await POST(buildRequest({ action: 'approve' }), routeParams);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 404 when user profile not found', async () => {
    setupFromChain({
      users: { data: null, error: null },
    });

    mockValidateBody.mockReturnValue({
      success: true,
      data: { action: 'approve' },
    });

    const res = await POST(buildRequest({ action: 'approve' }), routeParams);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('User profile not found');
  });

  it('approves PO successfully (calls rpc approve_po)', async () => {
    mockValidateBody.mockReturnValue({
      success: true,
      data: { action: 'approve', line_items: undefined, review_notes: undefined, new_mappings: undefined },
    });

    const res = await POST(buildRequest({ action: 'approve' }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('approved');

    // Verify rpc was called with correct args
    expect(mockRpc).toHaveBeenCalledWith('approve_po', {
      p_po_id: 'test-po-id',
      p_org_id: 'org-1',
      p_status: 'approved',
      p_reviewed_by: 'user-123',
      p_review_notes: null,
    });
  });

  it('rejects PO with review notes', async () => {
    mockValidateBody.mockReturnValue({
      success: true,
      data: {
        action: 'reject',
        review_notes: 'Prices do not match contract',
        line_items: undefined,
        new_mappings: undefined,
      },
    });

    const res = await POST(
      buildRequest({ action: 'reject', review_notes: 'Prices do not match contract' }),
      routeParams
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('rejected');

    expect(mockRpc).toHaveBeenCalledWith('approve_po', expect.objectContaining({
      p_status: 'rejected',
      p_review_notes: 'Prices do not match contract',
    }));
  });

  it('updates line items with operator edits', async () => {
    const lineEdits = [
      { id: 'item-uuid-1', quantity: 20, unit_price: 12.5 },
      { id: 'item-uuid-2', description: 'Updated widget' },
    ];

    mockValidateBody.mockReturnValue({
      success: true,
      data: { action: 'approve', line_items: lineEdits, review_notes: undefined, new_mappings: undefined },
    });

    // Track update calls on po_line_items
    const updateCalls: unknown[][] = [];

    mockUserFrom.mockImplementation((table: string) => {
      const inner: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'insert', 'upsert', 'order', 'delete']) {
        inner[m] = vi.fn().mockReturnValue(inner);
      }

      if (table === 'users') {
        inner['single'] = vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null });
      } else if (table === 'purchase_orders') {
        inner['single'] = vi.fn().mockResolvedValue({
          data: { raw_extraction: null, vendor_id: 'v-1', organization_id: 'org-1' },
          error: null,
        });
      } else if (table === 'po_line_items') {
        const eqFn = vi.fn().mockReturnValue(inner);
        inner['update'] = vi.fn().mockImplementation((...args: unknown[]) => {
          updateCalls.push(args);
          return { eq: eqFn };
        });
        inner['eq'] = eqFn;
        inner['order'] = vi.fn().mockResolvedValue({ data: [], error: null });
        inner['single'] = vi.fn().mockResolvedValue({ data: null, error: null });
      } else {
        inner['single'] = vi.fn().mockResolvedValue({ data: null, error: null });
      }

      return inner;
    });

    const res = await POST(buildRequest({ action: 'approve', line_items: lineEdits }), routeParams);
    expect(res.status).toBe(200);

    // Verify update was called for each line item
    expect(updateCalls.length).toBe(2);
    expect(updateCalls[0][0]).toEqual({ quantity: 20, unit_price: 12.5 });
    expect(updateCalls[1][0]).toEqual({ description: 'Updated widget' });
  });

  it('creates new vendor mappings', async () => {
    const newMappings = [
      {
        vendor_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        vendor_part_number: 'VP-NEW',
        internal_sku: 'SKU-NEW',
        confidence: 100,
      },
    ];

    mockValidateBody.mockReturnValue({
      success: true,
      data: { action: 'approve', line_items: undefined, review_notes: undefined, new_mappings: newMappings },
    });

    // Track upsert calls on vendor_mappings
    const upsertCalls: unknown[][] = [];

    mockUserFrom.mockImplementation((table: string) => {
      const inner: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'insert', 'update', 'order', 'delete']) {
        inner[m] = vi.fn().mockReturnValue(inner);
      }
      inner['single'] = vi.fn().mockResolvedValue({ data: null, error: null });

      if (table === 'users') {
        inner['single'] = vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null });
      } else if (table === 'vendor_mappings') {
        inner['upsert'] = vi.fn().mockImplementation((...args: unknown[]) => {
          upsertCalls.push(args);
          return Promise.resolve({ data: null, error: null });
        });
      }

      return inner;
    });

    const res = await POST(buildRequest({ action: 'approve', new_mappings: newMappings }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify upsert was called with the mapping data
    expect(upsertCalls.length).toBe(1);
    expect(upsertCalls[0][0]).toEqual(expect.objectContaining({
      organization_id: 'org-1',
      vendor_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      vendor_part_number: 'VP-NEW',
      internal_sku: 'SKU-NEW',
      confidence: 100,
      match_source: 'verified',
      is_verified: true,
    }));
    expect(upsertCalls[0][1]).toEqual(expect.objectContaining({
      onConflict: 'organization_id,vendor_id,vendor_part_number',
    }));
  });
});
