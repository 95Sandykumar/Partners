# POFlow Production Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 5 critical blockers, harden billing, add ~115 tests, 7 E2E journeys, monitoring, and launch.

**Architecture:** Phases 1-2 fix security/billing bugs in existing route handlers. Phase 3-4 add Vitest unit tests + Playwright E2E tests. Phase 5 adds Sentry, Upstash, pino logging, and CI hardening. Phase 6 is manual validation.

**Tech Stack:** Next.js 16, Vitest, Playwright, Sentry, Upstash Redis, pino, husky + lint-staged

---

## Phase 1: Critical Fixes (Day 1)

### Task 1: Add admin role check to billing portal

**Files:**
- Modify: `src/app/api/billing/portal/route.ts`
- Test: `src/app/api/billing/__tests__/portal.test.ts` (created in Phase 3)

**Step 1: Add role check after userProfile query**

In `src/app/api/billing/portal/route.ts`, the current code queries `users` for `organization_id` only (line 16). Add `role` to the select and check it.

```typescript
// Replace lines 14-22 with:
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage billing' }, { status: 403 });
    }
```

**Step 2: Run build to verify**

Run: `cd po-processing-saas && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/app/api/billing/portal/route.ts
git commit -m "fix: add admin role check to billing portal route"
```

---

### Task 2: Fix webhook error responses (return 200 instead of 400)

**Files:**
- Modify: `src/app/api/billing/webhook/route.ts:130-134`

**Step 1: Change the outer catch to return 200**

Stripe interprets non-2xx as "retry needed". The current code returns 400 on all errors (line 133), causing retry storms. Change the outer catch:

```typescript
// Replace lines 130-134 with:
  } catch (error: unknown) {
    // Stripe signature verification failures should return 400
    // (tells Stripe the webhook is misconfigured)
    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    // All other errors: return 200 to acknowledge receipt
    // (prevents Stripe from retrying business logic errors)
    console.error('Webhook processing error:', error);
    return NextResponse.json({ received: true, error: 'Processing failed' }, { status: 200 });
  }
```

**Step 2: Run build**

Run: `cd po-processing-saas && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/app/api/billing/webhook/route.ts
git commit -m "fix: return 200 from webhook on processing errors to prevent Stripe retries"
```

---

### Task 3: Add org ownership check to approval endpoint

**Files:**
- Modify: `src/app/api/po/[id]/approve/route.ts:28-32, 66-74`

**Step 1: Get user's org_id first**

Add org lookup before the PO query, then filter PO by org:

```typescript
// After line 19 (after auth check), add:
    // Get user's org for ownership check
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
```

**Step 2: Add org filter to PO query**

```typescript
// Replace lines 28-32 (the PO select) with:
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('raw_extraction, vendor_id, organization_id')
        .eq('id', id)
        .eq('organization_id', userProfile.organization_id)
        .single();
```

**Step 3: Add PO ownership check to line item updates**

```typescript
// Replace lines 66-75 (line item update loop) with:
    if (line_items && Array.isArray(line_items)) {
      for (const item of line_items) {
        const { id: itemId, ...updates } = item;
        if (itemId) {
          // Only update line items belonging to this PO
          await supabase
            .from('po_line_items')
            .update(updates)
            .eq('id', itemId)
            .eq('purchase_order_id', id);
        }
      }
    }
```

**Step 4: Also scope the PO status update and review queue update**

```typescript
// For PO status update (around line 80-86), add org filter:
    await supabase
      .from('purchase_orders')
      .update({
        status,
        reviewed_by: user.id,
      })
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id);

// For review queue (around line 89-94), add org filter:
    await supabase
      .from('review_queue')
      .update({
        status: 'completed',
        review_notes: review_notes || null,
      })
      .eq('purchase_order_id', id)
      .eq('organization_id', userProfile.organization_id);
```

**Step 5: Run build**

Run: `cd po-processing-saas && npx tsc --noEmit`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/app/api/po/[id]/approve/route.ts
git commit -m "fix: add org ownership checks to PO approval endpoint"
```

---

### Task 4: Fix customer creation race condition in checkout

**Files:**
- Modify: `src/app/api/billing/checkout/route.ts:63-80`

**Step 1: Replace the create-then-update pattern with a lock check**

The current code checks `org.stripe_customer_id` is null, creates a Stripe customer, then updates. Two concurrent requests can both pass the null check. Fix by re-querying with a fresh read:

```typescript
// Replace lines 63-80 with:
      // Create or retrieve Stripe customer (with race condition protection)
      let customerId = org.stripe_customer_id;

      if (!customerId) {
        // Re-check with fresh query to prevent race condition
        const { data: freshOrg } = await supabase
          .from('organizations')
          .select('stripe_customer_id')
          .eq('id', org.id)
          .single();

        if (freshOrg?.stripe_customer_id) {
          customerId = freshOrg.stripe_customer_id;
        } else {
          const customer = await stripe.customers.create({
            email: user.email!,
            metadata: {
              organization_id: org.id,
              organization_name: org.name,
            },
          });

          customerId = customer.id;

          // Use update with a WHERE clause that ensures no other request set it first
          const { error: updateError } = await supabase
            .from('organizations')
            .update({ stripe_customer_id: customerId })
            .eq('id', org.id)
            .is('stripe_customer_id', null);

          if (updateError) {
            // Another request already set the customer ID - fetch theirs
            const { data: raceOrg } = await supabase
              .from('organizations')
              .select('stripe_customer_id')
              .eq('id', org.id)
              .single();

            if (raceOrg?.stripe_customer_id) {
              customerId = raceOrg.stripe_customer_id;
              // Clean up the duplicate Stripe customer
              await stripe.customers.del(customer.id);
            }
          }
        }
      }
```

**Step 2: Run build**

Run: `cd po-processing-saas && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/app/api/billing/checkout/route.ts
git commit -m "fix: prevent duplicate Stripe customer creation on concurrent requests"
```

---

### Task 5: Verify STRIPE_WEBHOOK_SECRET is configured

**Files:**
- Modify: `.env.local` (manual step — user must get secret from Stripe Dashboard)

**Step 1: Check current value**

The `.env.local` currently has `STRIPE_WEBHOOK_SECRET=` (empty). The user must:
1. Go to Stripe Dashboard > Developers > Webhooks
2. Click the webhook endpoint (or create one pointing to `https://<your-domain>/api/billing/webhook`)
3. Copy the signing secret (starts with `whsec_`)
4. Set it in `.env.local` and Vercel environment variables

**Step 2: Add validation to health check**

Add webhook secret check to `src/app/api/health/route.ts`:

```typescript
// After the Stripe key check (line 62), add:
  // Stripe webhook secret configured
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  checks.stripe_webhook = hasWebhookSecret
    ? { status: 'healthy' }
    : { status: 'unhealthy', message: 'STRIPE_WEBHOOK_SECRET not configured' };
```

**Step 3: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "fix: add webhook secret check to health endpoint"
```

---

## Phase 2: Billing Hardening (Day 2)

### Task 6: Add webhook idempotency table and check

**Files:**
- Create: `supabase/migrations/005_webhook_events.sql`
- Modify: `src/app/api/billing/webhook/route.ts`

**Step 1: Create migration**

```sql
-- supabase/migrations/005_webhook_events.sql
-- Track processed Stripe webhook events for idempotency

CREATE TABLE webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup: delete events older than 7 days (Stripe retry window is 3 days)
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed_at);
```

**Step 2: Add idempotency check to webhook route**

In `src/app/api/billing/webhook/route.ts`, after constructing the event (line 31), add:

```typescript
      // Idempotency check - skip if already processed
      const { data: existing } = await supabase
        .from('webhook_events')
        .select('event_id')
        .eq('event_id', event.id)
        .single();

      if (existing) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      // Record event before processing (prevents re-processing on crash)
      await supabase
        .from('webhook_events')
        .insert({ event_id: event.id, event_type: event.type });
```

**Step 3: Push migration**

Run: `cd po-processing-saas && echo "Y" | npx supabase db push --include-all`

**Step 4: Run build**

Run: `cd po-processing-saas && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add supabase/migrations/005_webhook_events.sql src/app/api/billing/webhook/route.ts
git commit -m "feat: add webhook idempotency to prevent duplicate processing"
```

---

### Task 7: Add invoice.payment_succeeded webhook handler

**Files:**
- Modify: `src/app/api/billing/webhook/route.ts`

**Step 1: Add the new case to the switch statement**

After the `invoice.payment_failed` case (line 126), add:

```typescript
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          const { data: org } = await supabase
            .from('organizations')
            .select('id, subscription_status')
            .eq('stripe_customer_id', customerId)
            .single();

          if (org && org.subscription_status !== 'active') {
            await supabase
              .from('organizations')
              .update({ subscription_status: 'active' })
              .eq('id', org.id);
          }
          break;
        }
```

**Step 2: Run build**

Run: `cd po-processing-saas && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/api/billing/webhook/route.ts
git commit -m "feat: add payment_succeeded webhook to recover from past_due status"
```

---

### Task 8: Validate Stripe price IDs at runtime

**Files:**
- Modify: `src/lib/stripe/plans.ts:45-59`

**Step 1: Replace empty-string defaults with validation**

```typescript
// Replace getPriceIdToTierMap (lines 45-51) with:
export function getPriceIdToTierMap(): Record<string, string> {
  const map: Record<string, string> = {};
  const starter = process.env.STRIPE_STARTER_PRICE_ID;
  const professional = process.env.STRIPE_PROFESSIONAL_PRICE_ID;
  const enterprise = process.env.STRIPE_ENTERPRISE_PRICE_ID;

  if (starter) map[starter] = 'starter';
  if (professional) map[professional] = 'professional';
  if (enterprise) map[enterprise] = 'enterprise';

  return map;
}

// Replace getTierToPriceIdMap (lines 54-59) with:
export function getTierToPriceIdMap(): Record<string, string> {
  const map: Record<string, string> = {};
  const starter = process.env.STRIPE_STARTER_PRICE_ID;
  const professional = process.env.STRIPE_PROFESSIONAL_PRICE_ID;
  const enterprise = process.env.STRIPE_ENTERPRISE_PRICE_ID;

  if (starter) map['starter'] = starter;
  if (professional) map['professional'] = professional;
  if (enterprise) map['enterprise'] = enterprise;

  return map;
}
```

**Step 2: Run tests**

Run: `cd po-processing-saas && npm test`
Expected: All 36 tests pass

**Step 3: Commit**

```bash
git add src/lib/stripe/plans.ts
git commit -m "fix: skip unmapped price IDs instead of using empty strings"
```

---

### Task 9: Wrap approval flow in database transaction

**Files:**
- Create: `supabase/migrations/006_approve_po_function.sql`
- Modify: `src/app/api/po/[id]/approve/route.ts`

**Step 1: Create PostgreSQL function for atomic approval**

```sql
-- supabase/migrations/006_approve_po_function.sql
-- Atomic PO approval: updates PO status + review queue in one transaction

CREATE OR REPLACE FUNCTION approve_po(
  p_po_id UUID,
  p_org_id UUID,
  p_status TEXT,
  p_reviewed_by UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update PO status
  UPDATE purchase_orders
  SET status = p_status, reviewed_by = p_reviewed_by
  WHERE id = p_po_id AND organization_id = p_org_id;

  -- Update review queue
  UPDATE review_queue
  SET status = 'completed', review_notes = p_review_notes
  WHERE purchase_order_id = p_po_id AND organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Replace separate PO + review_queue updates with RPC call**

In the approval route, replace the two separate update calls with:

```typescript
    // Atomic: update PO status + review queue in one transaction
    const status = action === 'reject' ? 'rejected' : 'approved';
    await supabase.rpc('approve_po', {
      p_po_id: id,
      p_org_id: userProfile.organization_id,
      p_status: status,
      p_reviewed_by: user.id,
      p_review_notes: review_notes || null,
    });
```

**Step 3: Push migration**

Run: `cd po-processing-saas && echo "Y" | npx supabase db push --include-all`

**Step 4: Run build**

Run: `cd po-processing-saas && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add supabase/migrations/006_approve_po_function.sql src/app/api/po/[id]/approve/route.ts
git commit -m "feat: wrap PO approval in database transaction via RPC"
```

---

### Task 10: Add extraction failure handling

**Files:**
- Modify: `src/app/api/po/upload/route.ts:113-117`

**Step 1: Wrap extraction pipeline in try-catch with cleanup**

```typescript
// Replace lines 113-137 with:
    // Run extraction pipeline with failure handling
    let result;
    try {
      result = await runExtractionPipeline(serviceClient, {
        pdfBase64,
        fileName: file.name,
        senderEmail: senderEmail || undefined,
        orgId,
        userId: user.id,
        pdfStoragePath: storagePath,
      });
    } catch (extractionError: unknown) {
      // Clean up orphaned PDF
      await serviceClient.storage.from('po-pdfs').remove([storagePath]);

      console.error('Extraction failed:', extractionError);
      const extractionMessage = extractionError instanceof Error
        ? extractionError.message
        : 'Extraction failed';
      return NextResponse.json(
        {
          error: 'PO extraction failed',
          detail: extractionMessage,
          message: 'The PDF was uploaded but extraction failed. Please try again or contact support.',
        },
        { status: 422 }
      );
    }

    // Increment monthly PO usage (only on success)
    await supabase
      .from('po_usage_tracking')
      .upsert(
        {
          organization_id: orgId,
          month: currentMonth,
          pos_processed: currentUsage + 1,
          limit_at_time: limit,
        },
        { onConflict: 'organization_id,month' }
      );

    return NextResponse.json({
      purchase_order_id: result.purchase_order_id,
      po_number: result.extraction.header.po_number,
      vendor_detected: result.vendor_detection.vendor_name,
      extraction_confidence: result.overall_confidence,
      line_count: result.extraction.line_items.length,
      matched_count: Object.values(result.matches).filter((m) => m !== null).length,
      auto_approved: result.auto_approved,
      status: result.auto_approved ? 'approved' : 'pending_review',
      validation_issues: result.validation_issues,
    });
```

**Step 2: Run build**

Run: `cd po-processing-saas && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/api/po/upload/route.ts
git commit -m "fix: handle extraction failures gracefully, clean up orphaned PDFs"
```

---

## Phase 3: Test Suite (Days 3-6)

### Task 11: Install test dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install**

Run: `cd po-processing-saas && npm install --save-dev @testing-library/user-event msw @vitest/coverage-v8`

**Step 2: Update vitest config for coverage**

In `vitest.config.ts`, add coverage config:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/components/ui/**',
        'src/types/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 3: Verify existing tests still pass**

Run: `cd po-processing-saas && npm test`
Expected: All 36 tests pass

**Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add test dependencies (user-event, msw, coverage)"
```

---

### Task 12: Create test helpers and mocks

**Files:**
- Create: `src/test/helpers.ts`
- Create: `src/test/mocks/supabase.ts`
- Create: `src/test/mocks/stripe.ts`

**Step 1: Create Supabase mock**

```typescript
// src/test/mocks/supabase.ts
import { vi } from 'vitest';

export function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    ...overrides,
  };

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    _query: mockQuery,
  };
}

// Mock the createClient import
export function mockCreateClient(client: ReturnType<typeof createMockSupabaseClient>) {
  vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockResolvedValue(client),
    createServiceClient: vi.fn().mockResolvedValue(client),
  }));
}
```

**Step 2: Create Stripe mock**

```typescript
// src/test/mocks/stripe.ts
import { vi } from 'vitest';

export function createMockStripe() {
  return {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
      del: vi.fn().mockResolvedValue({}),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
}

export function mockGetStripe(stripe: ReturnType<typeof createMockStripe>) {
  vi.mock('@/lib/stripe/server', () => ({
    getStripe: vi.fn().mockReturnValue(stripe),
  }));
}
```

**Step 3: Create test helpers**

```typescript
// src/test/helpers.ts
import { NextRequest } from 'next/server';

export function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>
): NextRequest {
  const url = 'http://localhost:3000/api/test';
  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

export function createMockFormDataRequest(formData: FormData): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    body: formData,
    headers: { 'x-forwarded-for': '127.0.0.1' },
  });
}
```

**Step 4: Commit**

```bash
git add src/test/
git commit -m "chore: add test helpers and mock factories for Supabase + Stripe"
```

---

### Task 13: P0 billing route tests — webhook

**Files:**
- Create: `src/app/api/billing/__tests__/webhook.test.ts`

**Step 1: Write tests**

```typescript
// src/app/api/billing/__tests__/webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before imports
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
};

const mockStripe = {
  webhooks: {
    constructEvent: vi.fn(),
  },
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

import { POST } from '../webhook/route';
import { NextRequest } from 'next/server';

function makeRequest(body = 'test-body', signature = 'test-sig') {
  return new NextRequest('http://localhost:3000/api/billing/webhook', {
    method: 'POST',
    body,
    headers: {
      'stripe-signature': signature,
      'x-forwarded-for': '127.0.0.1',
    },
  });
}

describe('POST /api/billing/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    // Reset chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
  });

  it('returns 400 if signature is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/billing/webhook', {
      method: 'POST',
      body: 'test',
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 if STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid signature', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      const err = new Error('Invalid signature');
      throw err;
    });
    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 for checkout.session.completed', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_test1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { organization_id: 'org-1', tier: 'starter' },
          subscription: 'sub_test',
        },
      },
    });
    // Mock idempotency check (not found)
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    // Mock insert
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
    // Mock org update
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('returns 200 for invoice.payment_failed', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_test2',
      type: 'invoice.payment_failed',
      data: {
        object: { customer: 'cus_test' },
      },
    });
    mockSupabase.single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // idempotency
      .mockResolvedValueOnce({ data: null, error: null }) // insert event
      .mockResolvedValueOnce({ data: { id: 'org-1' }, error: null }); // org lookup

    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('handles processing errors gracefully (returns 200)', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_test3',
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_test',
          items: { data: [{ price: { id: 'price_test' } }] },
          status: 'active',
        },
      },
    });
    // Idempotency check succeeds (not found), then org lookup throws
    mockSupabase.single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockRejectedValueOnce(new Error('DB connection lost'));

    const req = makeRequest();
    const res = await POST(req);
    // Should return 200 to prevent Stripe retries
    expect(res.status).toBe(200);
  });
});
```

**Step 2: Run test**

Run: `cd po-processing-saas && npx vitest run src/app/api/billing/__tests__/webhook.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/app/api/billing/__tests__/webhook.test.ts
git commit -m "test: add webhook route tests (signature, events, error handling)"
```

---

### Task 14: P0 billing route tests — checkout + portal

**Files:**
- Create: `src/app/api/billing/__tests__/checkout.test.ts`
- Create: `src/app/api/billing/__tests__/portal.test.ts`

These follow the same mock pattern as Task 13. Test cases:

**Checkout tests (~8):**
- Returns 401 without auth
- Returns 403 for non-admin
- Returns 400 for invalid tier
- Returns 400 when price ID not configured
- Creates Stripe customer if none exists
- Reuses existing Stripe customer
- Returns checkout session URL on success
- Rate limits at 5 requests/minute

**Portal tests (~4):**
- Returns 401 without auth
- Returns 403 for non-admin
- Returns 404 if no Stripe customer
- Returns portal URL on success

**Step 1: Write checkout tests, step 2: write portal tests, step 3: run all, step 4: commit**

```bash
git add src/app/api/billing/__tests__/
git commit -m "test: add checkout and portal route tests"
```

---

### Task 15: P0 core workflow tests — upload

**Files:**
- Create: `src/app/api/po/__tests__/upload.test.ts`

Test cases (~8):
- Returns 401 without auth
- Returns 400 for non-PDF file
- Returns 400 for file > 10MB
- Returns 400 for invalid PDF magic bytes
- Returns 403 when PO limit reached
- Returns 429 when rate limited
- Returns 422 when extraction fails (verifies PDF cleanup)
- Returns 200 with extraction result on success

**Commit message:** `test: add upload route tests`

---

### Task 16: P0 core workflow tests — approve

**Files:**
- Create: `src/app/api/po/__tests__/approve.test.ts`

Test cases (~7):
- Returns 401 without auth
- Returns 404 for PO not in user's org
- Approves PO and updates review queue
- Rejects PO with notes
- Updates line items with operator edits
- Creates new vendor mappings (learning loop)
- Tracks corrections when edits differ from extraction

**Commit message:** `test: add approval route tests`

---

### Task 17: P1 CRUD route tests — PO routes

**Files:**
- Create: `src/app/api/po/__tests__/route.test.ts` (GET list, POST create)
- Create: `src/app/api/po/__tests__/detail.test.ts` (GET [id], PUT [id])
- Create: `src/app/api/po/__tests__/export.test.ts` (GET export)

Test cases (~12 total):
- List POs with status filter
- List POs with vendor filter
- Create PO returns 201
- Get PO detail with line items
- Update PO fields
- CSV export generates valid CSV
- CSV export applies date/status filters

**Commit message:** `test: add PO CRUD route tests`

---

### Task 18: P1 CRUD route tests — products, vendors, mappings

**Files:**
- Create: `src/app/api/products/__tests__/route.test.ts`
- Create: `src/app/api/vendors/__tests__/route.test.ts`
- Create: `src/app/api/mappings/__tests__/route.test.ts`

Test cases (~15 total):
- Products: list, search, create, bulk create, update, delete (soft)
- Vendors: list, create
- Mappings: list, create, update, delete, trigger match

**Commit message:** `test: add products, vendors, and mappings route tests`

---

### Task 19: P2 supporting route tests

**Files:**
- Create: `src/app/api/dashboard/__tests__/stats.test.ts`
- Create: `src/app/api/dashboard/__tests__/analytics.test.ts`
- Create: `src/app/api/auth/__tests__/setup.test.ts`
- Create: `src/app/api/__tests__/health.test.ts`
- Create: `src/app/api/__tests__/review-queue.test.ts`

Test cases (~16 total):
- Dashboard stats returns metrics
- Dashboard analytics returns chart data
- Auth setup creates org + user
- Auth setup prevents duplicate
- Health check reports all services
- Review queue returns joined data

**Commit message:** `test: add dashboard, auth, health, and review-queue route tests`

---

### Task 20: Component tests — pdf-dropzone

**Files:**
- Create: `src/components/upload/__tests__/pdf-dropzone.test.tsx`

Test cases (4):
- Renders dropzone area
- Rejects non-PDF files
- Shows file in pending list after drop
- Shows upload progress during processing

**Commit message:** `test: add pdf-dropzone component tests`

---

### Task 21: Component tests — approve-actions + editable-line-items

**Files:**
- Create: `src/components/po-review/__tests__/approve-actions.test.tsx`
- Create: `src/components/po-review/__tests__/editable-line-items.test.tsx`

**approve-actions tests (4):**
- Renders approve/reject buttons
- Opens confirmation dialog on approve
- Opens rejection dialog with notes field on reject
- Disables buttons when loading

**editable-line-items tests (5):**
- Renders line item table with data
- Double-click activates edit mode
- Saves edited values
- Cancels edit on escape
- Shows confidence badges

**Commit message:** `test: add PO review component tests`

---

### Task 22: Component tests — sidebar + part-matcher-cell

**Files:**
- Create: `src/components/layout/__tests__/sidebar.test.tsx`
- Create: `src/components/po-review/__tests__/part-matcher-cell.test.tsx`

**sidebar tests (3):**
- Renders all navigation links
- Highlights active link
- Sign out button triggers auth logout

**part-matcher-cell tests (3):**
- Renders current SKU match
- Opens search popover on click
- Selects product and fires onChange

**Commit message:** `test: add sidebar and part-matcher-cell component tests`

---

### Task 23: Expand validation schema tests

**Files:**
- Modify: `src/lib/validation/__tests__/schemas.test.ts`

Add ~15 tests for edge cases:
- Empty strings where min length is required
- SQL injection in search params
- Extremely long strings (>1000 chars)
- Negative numbers for quantities/prices
- Invalid UUID formats
- XSS attempts in text fields
- Null vs undefined for optional fields

**Commit message:** `test: expand validation schema tests with edge cases`

---

### Task 24: Run full test suite and verify coverage

**Step 1: Run all tests**

Run: `cd po-processing-saas && npm test`
Expected: ~150 tests pass

**Step 2: Run coverage report**

Run: `cd po-processing-saas && npx vitest run --coverage`
Expected: > 70% overall coverage

**Step 3: Commit any fixes needed**

---

## Phase 4: E2E Tests (Days 7-9)

### Task 25: Install and configure Playwright

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `e2e/fixtures.ts`

**Step 1: Install**

Run: `cd po-processing-saas && npm install --save-dev @playwright/test && npx playwright install chromium firefox`

**Step 2: Create playwright config**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential for shared state
  retries: 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

**Step 3: Create test fixture with auth helper**

```typescript
// e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  // Add any shared fixtures here
});

export { expect };
```

**Step 4: Add E2E script to package.json**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

**Step 5: Commit**

```bash
git add playwright.config.ts e2e/ package.json package-lock.json
git commit -m "chore: configure Playwright for E2E testing"
```

---

### Task 26: E2E — Login and Dashboard

**Files:**
- Create: `e2e/login-dashboard.spec.ts`

Tests:
- Navigate to `/login`
- Enter email/password
- Verify redirect to dashboard
- Verify dashboard shows stat cards
- Verify sidebar navigation works (click each link, verify page loads)

**Commit message:** `test: add E2E test for login and dashboard`

---

### Task 27: E2E — Upload, Review, Approve

**Files:**
- Create: `e2e/upload-review-approve.spec.ts`

Tests:
- Login
- Navigate to `/upload`
- Upload a sample PDF
- Verify extraction result appears
- Navigate to review queue
- Open the PO for review
- Verify PDF viewer and data panel load
- Approve the PO
- Verify status changes to "approved"

Note: This test should mock the Mistral API or use a pre-seeded PO if extraction takes too long.

**Commit message:** `test: add E2E test for upload-review-approve flow`

---

### Task 28: E2E — Products, Vendors, Billing, Export

**Files:**
- Create: `e2e/products.spec.ts`
- Create: `e2e/vendors.spec.ts`
- Create: `e2e/billing.spec.ts`
- Create: `e2e/export.spec.ts`

**Products:** Add product, edit, verify in table, delete
**Vendors:** Create vendor, add template
**Billing:** Click upgrade, verify redirect to Stripe (then back)
**Export:** Filter POs, export CSV, verify download

**Commit message:** `test: add E2E tests for products, vendors, billing, export`

---

## Phase 5: Monitoring & DevOps (Days 10-12)

### Task 29: Install and configure Sentry

**Files:**
- Modify: `package.json`
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Modify: `next.config.ts`

**Step 1: Install**

Run: `cd po-processing-saas && npx @sentry/wizard@latest -i nextjs`

This wizard creates the config files. If manual:

Run: `cd po-processing-saas && npm install @sentry/nextjs`

**Step 2: Create client config**

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

**Step 3: Create server config**

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

**Step 4: Add DSN to env vars**

Add `NEXT_PUBLIC_SENTRY_DSN=` to `.env.example` (user gets DSN from Sentry project settings).

**Step 5: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts next.config.ts .env.example package.json package-lock.json
git commit -m "feat: add Sentry error tracking"
```

---

### Task 30: Replace in-memory rate limiting with Upstash

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Modify: `package.json`

**Step 1: Install**

Run: `cd po-processing-saas && npm install @upstash/ratelimit @upstash/redis`

**Step 2: Rewrite rate-limit.ts**

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// Use Upstash Redis for distributed rate limiting if configured,
// otherwise fall back to in-memory for local development
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? Redis.fromEnv()
  : null;

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

export function rateLimit(options: RateLimitOptions) {
  if (redis) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, `${options.interval}ms`),
      analytics: true,
    });

    return {
      async check(token: string, limit: number): Promise<{ success: boolean }> {
        const { success } = await limiter.limit(`${token}:${limit}`);
        return { success };
      },
    };
  }

  // Fallback: in-memory for local dev
  const tokenMap = new Map<string, { count: number; lastReset: number }>();
  const { interval } = options;

  return {
    check(token: string, limit: number): Promise<{ success: boolean }> {
      const now = Date.now();
      const entry = tokenMap.get(token);

      if (!entry || now - entry.lastReset >= interval) {
        tokenMap.set(token, { count: 1, lastReset: now });
        return Promise.resolve({ success: true });
      }

      entry.count += 1;
      return Promise.resolve({ success: entry.count <= limit });
    },
  };
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
```

**Step 3: Add env vars to .env.example**

```
# Upstash Redis (for distributed rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**Step 4: Run tests**

Run: `cd po-processing-saas && npm test`

**Step 5: Commit**

```bash
git add src/lib/rate-limit.ts package.json package-lock.json .env.example
git commit -m "feat: replace in-memory rate limiting with Upstash Redis"
```

---

### Task 31: Harden middleware — remove /api from public paths

**Files:**
- Modify: `src/lib/supabase/middleware.ts:33`

**Step 1: Replace the public paths list**

```typescript
// Replace line 33 with:
  const publicPaths = [
    '/login', '/signup', '/forgot-password', '/reset-password',
    '/terms', '/privacy', '/security', '/dpa',
    '/api/health', '/api/billing/webhook', '/api/auth/setup',
  ];
```

**Step 2: Run build and test**

Run: `cd po-processing-saas && npx tsc --noEmit && npm test`

**Step 3: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "fix: remove blanket /api from public paths, whitelist specific routes"
```

---

### Task 32: Add structured logging with pino

**Files:**
- Modify: `package.json`
- Create: `src/lib/logger.ts`

**Step 1: Install**

Run: `cd po-processing-saas && npm install pino`

**Step 2: Create logger**

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createRequestLogger(reqId: string, orgId?: string, userId?: string) {
  return logger.child({ reqId, orgId, userId });
}
```

**Step 3: Add to key routes (upload, webhook, approve)**

Replace `console.error` calls with `logger.error` in the 3 critical routes.

**Step 4: Commit**

```bash
git add src/lib/logger.ts package.json package-lock.json
git commit -m "feat: add pino structured logging"
```

---

### Task 33: Add pre-commit hooks

**Files:**
- Modify: `package.json`

**Step 1: Install**

Run: `cd po-processing-saas && npm install --save-dev husky lint-staged && npx husky init`

**Step 2: Configure lint-staged in package.json**

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "bash -c 'npx tsc --noEmit'"],
  "*.{ts,tsx,js,jsx,json,md}": ["prettier --write"]
}
```

**Step 3: Configure husky pre-commit hook**

Run: `echo "npx lint-staged" > po-processing-saas/.husky/pre-commit`

**Step 4: Commit**

```bash
git add .husky/ package.json package-lock.json
git commit -m "chore: add pre-commit hooks (husky + lint-staged)"
```

---

### Task 34: Update CI pipeline

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Add coverage threshold + E2E + artifacts**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: po-processing-saas

      - name: Lint
        run: npm run lint
        working-directory: po-processing-saas

      - name: TypeScript type check
        run: npx tsc --noEmit
        working-directory: po-processing-saas

      - name: Run tests with coverage
        run: npx vitest run --coverage
        working-directory: po-processing-saas

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | node -e "
            const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
            console.log(Math.round(data.total.lines.pct));
          ")
          echo "Coverage: ${COVERAGE}%"
          if [ "$COVERAGE" -lt 70 ]; then
            echo "Coverage ${COVERAGE}% is below 70% threshold"
            exit 1
          fi
        working-directory: po-processing-saas

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: po-processing-saas/coverage/

      - name: Build
        run: npm run build
        working-directory: po-processing-saas
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
          SUPABASE_SERVICE_ROLE_KEY: placeholder-service-key
          MISTRAL_API_KEY: placeholder
          NEXT_PUBLIC_APP_URL: http://localhost:3000

  e2e:
    runs-on: ubuntu-latest
    needs: build-and-test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: po-processing-saas

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
        working-directory: po-processing-saas

      - name: Run E2E tests
        run: npx playwright test --project=chromium
        working-directory: po-processing-saas
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
          NEXT_PUBLIC_APP_URL: http://localhost:3000

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: po-processing-saas/playwright-report/
```

**Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: add coverage threshold, E2E stage, and artifact uploads to CI"
```

---

## Phase 6: Validation & Launch (Days 13-14)

### Task 35: Manual smoke test checklist

This is a manual task. Follow the checklist in the design doc (`docs/plans/2026-03-01-production-hardening-design.md`, Section 6.1):

- [ ] Full journey: signup -> onboarding -> upload -> review -> approve -> export
- [ ] Billing: upgrade from free to starter, verify webhook fires
- [ ] Multi-tenancy: create 2 orgs, verify data isolation
- [ ] Mobile viewport responsive check
- [ ] Error states: upload invalid file, API timeout

### Task 36: Security audit

- [ ] Run: `git log --all -p -- '*.env*'` — verify no secrets in git history
- [ ] Test RLS: query data with wrong org context, verify 0 rows returned
- [ ] Verify CSP headers in production: `curl -I https://<domain>`
- [ ] Send test webhook from Stripe Dashboard, verify signature verification works

### Task 37: Performance baseline

- [ ] Dashboard page load time (target: < 2s)
- [ ] Extraction pipeline time (target: < 30s per PDF)
- [ ] API read response times (target: < 500ms)
- [ ] Document results in `docs/performance-baseline.md`

### Task 38: Production deployment

- [ ] Set all env vars in Vercel
- [ ] Configure Stripe webhook URL to production domain
- [ ] Set `STRIPE_WEBHOOK_SECRET` from Stripe Dashboard
- [ ] Set Upstash Redis credentials
- [ ] Set Sentry DSN
- [ ] Verify health check: `GET /api/health` returns 200
- [ ] Invite waiting customers
