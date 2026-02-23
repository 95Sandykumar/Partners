# PO Processing SaaS - Skills Reference

Quick-reference guide for architecture, operations, and troubleshooting.

---

## Deployment

| Service | URL | Dashboard |
|---------|-----|-----------|
| **App (Vercel)** | https://po-processing-saas.vercel.app | https://vercel.com/95sandykumars-projects/po-processing-saas |
| **Database (Supabase)** | https://yispbrxqydfdyoxlclyd.supabase.co | https://supabase.com/dashboard/project/yispbrxqydfdyoxlclyd |
| **Repo (GitHub)** | https://github.com/95Sandykumar/po-processing-saas | — |
| **Billing (Stripe)** | — | https://dashboard.stripe.com |

### Deploy Flow
```
git push origin master → GitHub webhook → Vercel auto-build → Live in ~60s
```

### Environment Variables (Vercel)
| Variable | Type | Purpose |
|----------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Bypasses RLS (server-only) |
| `ANTHROPIC_API_KEY` | Secret | Claude Vision API for PDF extraction |
| `NEXT_PUBLIC_APP_URL` | Public | Production URL for metadata/sitemap |
| `SUPABASE_ACCESS_TOKEN` | Secret | Supabase CLI management |
| `STRIPE_SECRET_KEY` | Secret | Stripe API (not yet configured) |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe webhook signature verification |
| `STRIPE_STARTER_PRICE_ID` | Secret | Stripe price ID for Starter plan |
| `STRIPE_PROFESSIONAL_PRICE_ID` | Secret | Stripe price ID for Professional plan |
| `STRIPE_ENTERPRISE_PRICE_ID` | Secret | Stripe price ID for Enterprise plan |

---

## Architecture

### Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Apple-inspired design)
- **Supabase** (PostgreSQL 17 + Auth + Storage + RLS)
- **Claude Vision API** (PDF extraction via `@anthropic-ai/sdk`)
- **Stripe** (subscription billing)
- **React Query** (server state) + **React Hook Form** + **Zod** (forms)

### Multi-Tenancy
- Every table has `organization_id` with RLS policies
- `public.user_org_id()` SQL function resolves current user's org
- Service role key bypasses RLS for admin/webhook operations

### Data Flow
```
PDF Upload → Claude Vision → Extract Line Items → Match to Products → Confidence Score
  ↓                                                                        ↓
  Storage (po-pdfs bucket)                                    Auto-approve (>85%)
                                                              OR → Review Queue
                                                                        ↓
                                                              Human Review → Approve
                                                                        ↓
                                                              Correction Tracking → Accuracy Metrics
```

### Part Matching Engine (4-stage cascade)
1. **Exact vendor mapping** (100% confidence) - lookup in vendor_mappings table
2. **Manufacturer part match** (95%) - if MFG part was extracted
3. **Prefix-normalized** (85%) - strip CMI-/BER-/LIN-/CMUC/CMD prefixes
4. **Fuzzy match** (varies) - Fuse.js with threshold 0.3

---

## Database Schema (12 tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `organizations` | Multi-tenant orgs | name, slug, subscription_tier, stripe_customer_id |
| `users` | User profiles | email, role (admin/operator/viewer), organization_id |
| `vendors` | Vendor registry | vendor_name, vendor_code, contact_email |
| `vendor_templates` | Extraction templates | template_data (JSONB), vendor_id |
| `products` | Product catalog | internal_sku, manufacturer_part, description, unit_price |
| `vendor_mappings` | Part number mappings | vendor_part_number → product_id |
| `purchase_orders` | PO records | po_number, status, confidence_score, raw_extraction (JSONB) |
| `po_line_items` | PO line items | vendor_part_number, matched_product_id, quantity, unit_price |
| `review_queue` | Items needing review | purchase_order_id, assigned_to, priority |
| `extraction_corrections` | AI feedback loop | field_name, ai_extracted_value, corrected_value |
| `extraction_accuracy_metrics` | Accuracy aggregates | vendor_id, field_name, accuracy_rate |
| `po_usage_tracking` | Billing enforcement | organization_id, month, pos_processed, limit_at_time |

### Migrations
| # | File | What it does |
|---|------|-------------|
| 001 | `initial_schema.sql` | 10 core tables + RLS + triggers + storage bucket |
| 002 | `seed_data.sql` | Seed data functions |
| 003 | `extraction_corrections.sql` | Correction tracking + accuracy metrics tables |
| 004 | `stripe_billing.sql` | Stripe columns on organizations + usage tracking |

---

## API Routes (19 endpoints)

### Auth
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/auth/setup` | Public | Create org + user on signup |

### PO Management
| Method | Route | Auth | Rate Limit | Purpose |
|--------|-------|------|------------|---------|
| GET/POST | `/api/po` | User | — | List & create POs |
| GET/PUT | `/api/po/[id]` | User | — | PO detail & update |
| POST | `/api/po/[id]/approve` | User | — | Approve/reject + correction tracking |
| POST | `/api/po/upload` | User | 10/min | PDF upload + extraction pipeline |
| GET | `/api/po/export` | User | — | CSV export with filters |

### Billing
| Method | Route | Auth | Rate Limit | Purpose |
|--------|-------|------|------------|---------|
| POST | `/api/billing/checkout` | Admin | 5/min | Create Stripe Checkout session |
| POST | `/api/billing/portal` | Admin | — | Create Stripe Customer Portal |
| POST | `/api/billing/webhook` | None* | 100/min | Stripe webhook handler |

*Webhook uses Stripe signature verification instead of auth

### Dashboard & Data
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/dashboard/stats` | User | Summary metrics |
| GET | `/api/dashboard/analytics` | User | Chart data |
| GET | `/api/dashboard/accuracy` | User | Extraction accuracy stats |
| GET/POST/PUT/DELETE | `/api/products` | User | Product CRUD |
| GET/POST | `/api/vendors` | User | Vendor management |
| GET/POST/PUT | `/api/vendors/[id]/templates` | User | Template CRUD |
| GET/POST/PUT/DELETE | `/api/mappings` | User | Mapping management |
| GET | `/api/review-queue` | User | Review queue data |
| POST | `/api/seed` | Admin | 3/min | Seed demo data |

---

## Pages (18 routes)

### Public Pages
| Route | Type | Description |
|-------|------|-------------|
| `/` | Server | Marketing landing page (auth-aware nav) |
| `/login` | Client | Email/password login |
| `/signup` | Client | Registration + org creation → redirects to onboarding |
| `/terms` | Server | Terms of Service |
| `/privacy` | Server | Privacy Policy |

### Dashboard Pages (auth required)
| Route | Type | Description |
|-------|------|-------------|
| `/dashboard` | Client | Stats cards + charts + recent POs + quick actions |
| `/dashboard/onboarding` | Client | 4-step post-signup wizard |
| `/dashboard/upload` | Client | Multi-file PDF upload with batch processing |
| `/dashboard/review` | Client | Review queue list |
| `/dashboard/review/[id]` | Client | Split PDF viewer + editable data panel |
| `/dashboard/pos` | Client | All POs table with status filter + CSV export |
| `/dashboard/pos/[id]` | Client | Read-only PO detail |
| `/dashboard/products` | Client | Product catalog CRUD + CSV import |
| `/dashboard/vendors` | Client | Vendor list |
| `/dashboard/vendors/[id]/templates` | Client | Vendor template JSON editor |
| `/dashboard/mappings` | Client | Part number mapping management |
| `/dashboard/settings` | Client | Profile, org, billing, demo data |

### SEO & Meta
| Route | Type |
|-------|------|
| `/sitemap.xml` | Static |
| `/robots.txt` | Static |
| `/manifest.webmanifest` | Static |

---

## Design System

### Colors (Apple-inspired)
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | `#007AFF` | `#0A84FF` | Buttons, links, accents |
| `--background` | `#F5F5F7` | `#000000` | Page background |
| `--foreground` | `#1D1D1F` | `#F5F5F7` | Primary text |
| `--card` | `#FFFFFF` | `#1C1C1E` | Card backgrounds |
| `--muted` | `#F5F5F7` | `#2C2C2E` | Muted backgrounds |
| `--muted-foreground` | `#86868B` | `#98989D` | Secondary text |
| `--border` | `#E8E8ED` | `#3A3A3C` | Borders |
| `--destructive` | `#FF3B30` | `#FF453A` | Errors, delete actions |

### Typography
- Font: Inter (Google Fonts, `--font-inter`)
- Body: `text-[15px]` or `text-[13px]`
- Headings: `font-semibold tracking-tight`
- Hero: `text-5xl`/`6xl`/`7xl`

### Components
- Frosted glass: `bg-white/72 dark:bg-gray-950/72 backdrop-blur-xl`
- Cards: `rounded-2xl border border-border shadow-sm`
- Buttons: `rounded-xl` (dashboard) or `rounded-full` (landing page)
- Hover: `hover:bg-black/[0.04] dark:hover:bg-white/[0.06]`

### Dark Mode
- Managed by `next-themes` (ThemeProvider in providers.tsx)
- Toggle in header (Sun/Moon icons)
- All colors use CSS custom properties (auto-switch)
- Frosted glass elements need explicit `dark:` variants

---

## Security

### Headers (next.config.ts)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Rate Limiting (src/lib/rate-limit.ts)
- In-memory sliding window per IP
- Upload: 10/min, Checkout: 5/min, Webhook: 100/min, Seed: 3/min

### Auth
- Supabase Auth (email/password)
- Session managed via middleware (cookie-based)
- RLS on all tables via `organization_id`
- Service role key used only for webhooks/admin operations

---

## Billing (Stripe)

### Plans
| Tier | Price | PO Limit | Users |
|------|-------|----------|-------|
| Free | $0/mo | 50 | 1 |
| Starter | $299/mo | 200 | 2 |
| Professional | $599/mo | 500 | 5 |
| Enterprise | $1,299/mo | Unlimited | Unlimited |

### Flow
```
Settings page → POST /api/billing/checkout → Stripe Checkout (hosted) → Webhook → Update org
```

### Webhook Events Handled
- `checkout.session.completed` → activate subscription
- `customer.subscription.updated` → sync tier from price ID
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_failed` → mark as past_due

### Setup Required
1. Create Stripe account at https://dashboard.stripe.com
2. Create 3 products with monthly prices (Starter, Professional, Enterprise)
3. Copy price IDs to env vars: `STRIPE_STARTER_PRICE_ID`, `STRIPE_PROFESSIONAL_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`
4. Set up webhook endpoint: `https://po-processing-saas.vercel.app/api/billing/webhook`
5. Events to listen for: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## Testing

```bash
npm test              # Run all 36 tests
npm run test:watch    # Watch mode
npx tsc --noEmit      # Type check (expect 0 errors)
npm run build         # Full production build
```

### Test Coverage
| File | Tests | What it covers |
|------|-------|---------------|
| `vendor-detection.test.ts` | 9 | Email domain, keywords, vendor name detection |
| `prefix-normalizer.test.ts` | 16 | CMI-/BER-/LIN-/CMUC/CMD prefix stripping |
| `validation.test.ts` | 11 | PO number, quantity, price, math validation |

---

## Troubleshooting

### Blank screen / Turbopack crash
```bash
# Stop dev server, delete cache, restart
rm -rf .next
npm run dev
```

### TypeScript errors referencing .next/types
```bash
rm -rf .next
npx tsc --noEmit
```

### Supabase RLS blocking queries
- Check that `public.user_org_id()` function exists
- Verify user has `organization_id` set in `users` table
- For admin operations, use `createServiceClient()` (bypasses RLS)

### Auth redirect not working on Vercel
- Check Supabase Auth > URL Configuration > Redirect URLs includes `https://po-processing-saas.vercel.app/**`
- Check `site_url` is set to production URL

### Vercel deploy fails with git author error
- Push to GitHub and let auto-deploy trigger instead of `vercel --prod`
- Or use `vercel redeploy <deployment-url>` to rebuild existing deployment

### Rate limit errors in development
- Rate limiter is in-memory, resets on server restart
- For testing, restart dev server to clear limits

---

## Vendor Part Number Schemes

| Vendor | Prefix Pattern | Example Input | Normalized |
|--------|---------------|---------------|------------|
| SKD Supply | `CMI-` | CMI-B5662 | B5662 |
| SKD Supply | `BER-` | BER-5662 | 5662 |
| SKD Supply | `LIN-` | LIN-C315 | C315 |
| Linde | `CMUC`/`CMD` (no separator) | CMUC315-3545 | C315-3545 |
| Matheson | `CMD ` (with space) | CMD 4636001 | 046-36-001 |
| Powerweld | (none) | B422 | B422 |

---

## Key File Locations

| Purpose | Path |
|---------|------|
| Global styles | `src/app/globals.css` |
| Root layout | `src/app/layout.tsx` |
| Providers (Query + Theme) | `src/app/providers.tsx` |
| Auth middleware | `src/middleware.ts` |
| Supabase client (browser) | `src/lib/supabase/client.ts` |
| Supabase client (server) | `src/lib/supabase/server.ts` |
| Extraction pipeline | `src/lib/extraction/extraction-pipeline.ts` |
| Match engine | `src/lib/matching/match-engine.ts` |
| Stripe plans | `src/lib/stripe/plans.ts` |
| Rate limiter | `src/lib/rate-limit.ts` |
| DB types | `src/types/database.ts` |
| Extraction types | `src/types/extraction.ts` |
