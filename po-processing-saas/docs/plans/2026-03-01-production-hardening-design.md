# POFlow Production Hardening Design

**Date:** 2026-03-01
**Author:** Testing Lead Audit
**Status:** Approved
**Timeline:** 14 days
**Goal:** Go live for paying customers with enterprise-grade reliability

---

## Context

POFlow is a PO processing SaaS with waiting customers. Audit revealed 5 critical blockers and 7 high-priority issues across billing, security, and testing. This design covers a 14-day hardening plan to ship with confidence.

### Current State
- 9 test files, ~36 tests (extraction + matching only)
- 25 API routes, 0 tested
- 30+ React components, 0 tested
- No E2E tests
- No error tracking or monitoring
- In-memory rate limiting (single instance only)
- No pre-commit hooks
- CI: lint → typecheck → test → build (solid foundation)

### Target State
- ~150 total tests (unit + component)
- 7 E2E journeys (Playwright)
- 70%+ code coverage enforced in CI
- Sentry error tracking
- Upstash distributed rate limiting
- Pre-commit hooks (husky + lint-staged)
- Structured logging (pino)
- All critical billing/security bugs fixed

---

## Phase 1: Critical Fixes (Day 1)

### 1.1 Set STRIPE_WEBHOOK_SECRET
- Get signing secret from Stripe Dashboard > Developers > Webhooks
- Add to `.env.local` and Vercel production environment variables
- Verify webhook endpoint URL is configured in Stripe
- **File:** `.env.local`

### 1.2 Add admin role check to billing portal
- Query user's role from `users` table
- Return 403 if not `admin`
- Match pattern from checkout route
- **File:** `src/app/api/billing/portal/route.ts`

### 1.3 Fix webhook error responses
- Change all `catch` blocks to return 200 with error body
- Log errors server-side
- Stripe interprets non-2xx as retry-needed — returning 400 causes retry storms
- **File:** `src/app/api/billing/webhook/route.ts`

### 1.4 Add org ownership check to approval endpoint
- Add `.eq('organization_id', userOrgId)` to PO query
- Add `.eq('purchase_order_id', poId)` to line item updates
- Belt-and-suspenders with RLS
- **File:** `src/app/api/po/[id]/approve/route.ts`

### 1.5 Fix customer creation race condition
- Use Supabase `upsert` with conflict handling on `stripe_customer_id`
- Prevent duplicate Stripe customers on double-click
- **File:** `src/app/api/billing/checkout/route.ts`

---

## Phase 2: Billing Hardening (Day 2)

### 2.1 Webhook idempotency
- Create `webhook_events` table: `(event_id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ)`
- Check event_id existence before processing
- If exists → return 200 immediately
- If not → process, then insert event_id
- **Files:** New migration + `src/app/api/billing/webhook/route.ts`

### 2.2 PO limit enforcement
- In upload route, check org's current month usage against `monthly_po_limit`
- Return 402 if over limit with upgrade message
- Check BEFORE extraction (don't burn API credits for over-limit orgs)
- **File:** `src/app/api/po/upload/route.ts`

### 2.3 Add invoice.payment_succeeded webhook handler
- Update `subscription_status` to `'active'` on successful payment
- Handles recovery from past_due status
- **File:** `src/app/api/billing/webhook/route.ts`

### 2.4 Validate Stripe price IDs at startup
- Replace empty string defaults with runtime validation
- Throw at app startup if price IDs missing/invalid
- **File:** `src/lib/stripe/plans.ts`

### 2.5 Wrap approval in database transaction
- Create PostgreSQL function via Supabase RPC
- Atomic: update line items + PO status + review queue + vendor mappings
- All-or-nothing rollback on failure
- **Files:** New migration + `src/app/api/po/[id]/approve/route.ts`

### 2.6 Extraction failure handling
- Wrap `runExtractionPipeline()` in try-catch
- On failure: delete orphaned PDF from storage
- Create PO record with `status: 'extraction_failed'`
- Return meaningful error to user
- **File:** `src/app/api/po/upload/route.ts`

---

## Phase 3: Test Suite (Days 3-6)

### 3.1 API route tests (~78 tests)

**P0 — Billing routes (~20 tests):**
- `billing/webhook`: signature verification, each event type, idempotency, error handling
- `billing/checkout`: auth check, admin check, customer creation, Stripe session creation
- `billing/portal`: auth check, admin check, portal session creation

**P0 — Core workflow routes (~15 tests):**
- `po/upload`: file validation, auth, rate limiting, extraction success/failure, usage tracking
- `po/[id]/approve`: org ownership, status transitions, line item updates, mapping creation

**P1 — CRUD routes (~27 tests):**
- `po/route`: list with filters, create
- `po/[id]/route`: get detail, update
- `po/export`: CSV generation, filters
- `products/route`: list, create, bulk import
- `vendors/route`: list, create
- `mappings/route`: CRUD, match trigger

**P2 — Supporting routes (~16 tests):**
- `dashboard/stats`, `dashboard/analytics`, `dashboard/accuracy`
- `auth/setup`, `review-queue`, `seed`, `health`

### 3.2 Component tests (~22 tests)

Install `@testing-library/user-event` and `msw`.

| Component | Tests | Verifies |
|-----------|-------|----------|
| pdf-dropzone | 4 | File type validation, size limits, upload trigger |
| editable-line-items | 5 | Edit, save, cancel, validation |
| part-matcher-cell | 3 | Search, select, clear |
| approve-actions | 4 | Approve, reject, corrections |
| po-review-layout | 3 | Panel rendering, resize |
| sidebar | 3 | Navigation, active state, collapse |

### 3.3 Expanded validation tests (~15 tests)
- All Zod schemas: valid + invalid inputs
- Edge cases: empty strings, null, extreme values, injection attempts

### 3.4 Test infrastructure
- Add `@testing-library/user-event`
- Add `msw` for API mocking
- Add coverage threshold to CI: fail if < 70%
- Upload coverage report as CI artifact

**Total new tests: ~115 (36 existing + 115 new = ~151)**

---

## Phase 4: E2E Tests (Days 7-9)

### Framework: Playwright

**Setup:**
- Install `@playwright/test`
- Chrome + Firefox (skip Safari for B2B SaaS)
- Test DB seeding via `/api/seed`
- Mock Mistral API and Stripe checkout with MSW

### 7 Critical Journeys

| # | Journey | Steps |
|---|---------|-------|
| 1 | Signup → Onboarding | Sign up, create org, complete onboarding |
| 2 | Upload → Review → Approve | Upload PDF, verify extraction, review, approve |
| 3 | Product catalog management | Add product, edit, CSV import, delete |
| 4 | Vendor + template setup | Create vendor, add template, verify detection |
| 5 | Billing upgrade | Click upgrade, verify Stripe redirect, verify portal |
| 6 | PO export | Filter POs, export CSV, verify download |
| 7 | Login → Dashboard | Login, verify stats, verify sidebar nav |

### CI Integration
- Run E2E after unit tests pass
- Upload Playwright HTML report on failure
- Run against test Supabase instance

---

## Phase 5: Monitoring & DevOps (Days 10-12)

### 5.1 Sentry error tracking
- Install `@sentry/nextjs`
- Client + server error capture
- Source maps for readable traces
- Alert rules: 500 errors → notification
- Tag errors by `org_id`

### 5.2 Upstash distributed rate limiting
- Replace in-memory `Map` with `@upstash/ratelimit`
- Rate limits per route:
  - Upload: 10/min per org
  - Approval: 30/min per user
  - Product CRUD: 60/min per org
  - Dashboard reads: 120/min per user
  - Seed: 1/hour per org

### 5.3 Middleware hardening
- Remove `/api` from `publicPaths`
- Explicit public API list: `/api/health`, `/api/billing/webhook`, `/api/auth/setup`
- All other `/api/*` routes require auth at middleware level

### 5.4 Pre-commit hooks
- Install `husky` + `lint-staged`
- On commit: ESLint + TypeScript check on staged files
- Fast feedback before CI

### 5.5 CI pipeline improvements
- Coverage threshold: fail if < 70%
- E2E test stage after unit tests
- Coverage + Playwright reports as artifacts

### 5.6 Structured logging (pino)
- JSON logs on all server routes
- Fields: request ID, org ID, user ID, duration, status code
- Enables searching logs by org for debugging

---

## Phase 6: Validation & Launch (Days 13-14)

### 6.1 Manual smoke test
- Full journey: signup → onboarding → upload → review → approve → export
- Billing: free → starter upgrade, webhook verification
- Multi-tenancy: 2 orgs, verify isolation
- Mobile viewport responsive check
- Error states: invalid file, API timeout

### 6.2 Security audit
- Verify `.env` secrets not in git history
- Verify RLS policies (cross-org query attempt)
- Verify CORS + CSP headers in production
- Verify Stripe webhook signature with test event

### 6.3 Performance baseline
- Dashboard page load: target < 2s
- Extraction pipeline: target < 30s per PDF
- API reads: target < 500ms
- Document baselines

### 6.4 Launch
- Deploy to Vercel production
- Configure production Stripe webhook URL
- Set all production env vars
- Verify health check
- Invite waiting customers

---

## Timeline

| Days | Phase | Deliverables |
|------|-------|-------------|
| Day 1 | Critical Fixes | 5 blockers fixed, billing functional |
| Day 2 | Billing Hardening | Idempotency, PO limits, transactions, error handling |
| Days 3-6 | Unit + Component Tests | ~115 new tests, 70%+ coverage |
| Days 7-9 | E2E Tests | 7 Playwright journeys, CI integration |
| Days 10-12 | Monitoring & DevOps | Sentry, Upstash, middleware, logging, hooks |
| Days 13-14 | Validation & Launch | Smoke tests, security audit, go live |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Customers churn from waiting | Communicate timeline, offer early access after Day 2 |
| Test writing takes longer than expected | P0 routes first, defer P2 if needed |
| Sentry/Upstash setup issues | These are well-documented SaaS tools, fallback to manual monitoring |
| Playwright flaky tests | Focus on happy paths, skip edge cases in E2E |
| Supabase local dev issues | Use remote Supabase for E2E if local setup fails |
