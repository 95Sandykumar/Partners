# PO Processing SaaS - Complete Project Guide

## Mission: Launch & Scale a Profitable SaaS Business

**Product:** AI-powered purchase order processing that eliminates manual data entry
**Objective:** Build, launch, and scale to $50K MRR in 12 months
**Status:** MVP Complete | Pre-Launch Phase | $0 MRR → Target: $1K MRR Month 1
**Last Updated:** February 20, 2026

---

## Table of Contents

### Business Strategy
- [Product Vision & Positioning](#product-vision--positioning)
- [Competitive Analysis](#competitive-analysis)
- [Go-to-Market Strategy](#go-to-market-strategy)
- [Pricing & Revenue Model](#pricing--revenue-model)
- [Sales Playbook](#sales-playbook)
- [Marketing Strategy](#marketing-strategy)

### Operations
- [Current Priorities](#current-priorities)
- [Success Metrics](#success-metrics)
- [Customer Research](#customer-research)
- [Roadmap](#roadmap)

### Technical Documentation
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Development Patterns](#development-patterns)
- [Deployment](#deployment)

---

# BUSINESS STRATEGY

## Product Vision & Positioning

### What We're Building
An AI-powered purchase order processing system that extracts PO data from PDFs with industry-leading accuracy, automatically matches parts against vendor catalogs, and eliminates manual data entry for procurement teams.

**Originally built for:** CM Industries (welding supply manufacturer) - internal tool
**Pivoting to:** Commercial SaaS product for the broader market

### Core Value Proposition
> "Process purchase orders 80% faster with AI that actually understands your vendor catalogs - no templates, no training, just upload and go."

### Target Customer (ICP)
**Company Profile:**
- Industry: Industrial distribution, manufacturing, construction supply, wholesale
- Company size: 10-200 employees
- Annual revenue: $5M-50M
- PO volume: 200-2000 per month
- Current process: Manual data entry from PDF POs into ERP/accounting system

**Buyer Persona:**
- Title: Procurement Manager, Operations Manager, Controller, Office Manager
- Pain: Spending 10-20 hours/week on manual PO processing
- Budget authority: $200-1000/month software spend (no approval needed for this range)
- Tech savviness: Medium (uses QuickBooks, Excel, basic SaaS tools)
- Trigger event: Hiring issues, error-caused delays, scaling pain

## Competitive Analysis

### Market Landscape
- **Market Size:** $9.81B in 2026, growing at 13.5% CAGR
- **Enterprise Tier:** SAP Ariba, Coupa, Oracle ($500K+ annually) - complex, slow implementation (6+ months)
- **Mid-Market:** Procurify, Precoro, Fraxion ($10K-50K annually) - better UX but still expensive for SMBs
- **Small Business:** Fragmented solutions, many still using Excel + QuickBooks

**See:** [competitor-feature-gaps.md](./competitor-feature-gaps.md) for detailed competitive analysis

### Our Strategic Position: "The Stripe of PO Processing"
We win by being:
1. **Simpler:** Consumer-grade UX vs. enterprise complexity (Coupa users complain about "redundant pages")
2. **Faster to implement:** Days vs. months (competitors take 6+ months for ERP integration)
3. **AI-first:** Claude Vision API = superior OCR without rigid templates (competitors struggle with format variability)
4. **Transparent pricing:** Public pricing on website vs. "contact sales"
5. **SMB-focused:** $200-500/mo vs. $50K+ enterprise licenses

### Top 5 Competitor Pain Points We Exploit

**1. Poor OCR Accuracy** (Our Moat)
- **Problem:** Competitors use template-based OCR that fails with format changes
- **User Quote:** "Even minor variations impact extraction accuracy"
- **Our Solution:** Claude Vision API handles format variability without templates

**2. Complex User Interfaces**
- **Problem:** SAP Ariba requires "weeks of training," Coupa has "redundant pages"
- **User Quote:** "The interface is complex, took time to figure out how to click through"
- **Our Solution:** Radically simple dashboards, role-based views, minimal clicks

**3. Slow, Expensive Implementation**
- **Problem:** ERP integration takes 6+ months, requires major IT investment
- **User Quote:** "Implementation stretched beyond six months"
- **Our Solution:** Self-service onboarding in days, not months

**4. Manual Approval Bottlenecks**
- **Problem:** Approval workflows have single points of failure, lack visibility
- **User Quote:** "Requisition-to-PO cycle times over 19 hours in some industries"
- **Our Solution:** Intelligent routing, mobile approvals, real-time status

**5. Expensive for SMBs**
- **Problem:** Enterprise solutions exclude small businesses with high pricing
- **User Quote:** "Can be expensive for smaller businesses"
- **Our Solution:** Accessible $200-500/mo pricing with transparent tiers

### Unique Advantages We Already Have
✅ **Intelligent Vendor Normalization** - Already handles CMI-/BER-/LIN-/CMUC/CMD prefix variations
✅ **4-Stage Part Matching** - Exact → MFG → Prefix-Normalized → Fuzzy cascade
✅ **Multi-Tenant Architecture** - RLS-based, ready for multiple customers
✅ **Modern Stack** - Fast, cheap to operate, easy to iterate

---

## Go-to-Market Strategy

### Phase 1: Pre-Launch (Weeks 1-4) - Get to $1 in Revenue
**Goal:** 5 paying customers @ $200-500/mo = $1,000-2,500 MRR

**Critical Path:**
1. ✅ **MVP Complete** (DONE)
2. ⏳ **Branding** (1 week)
   - Product name brainstorm (20 options → test with 5 prospects)
   - Domain purchase + DNS setup
   - Logo design (Fiverr $50-200 or 99designs $299)
   - Brand colors, typography system in Tailwind config
3. ⏳ **Legal Foundation** (3 days)
   - Terms of Service (template from Termly $10/mo)
   - Privacy Policy (GDPR/CCPA compliant)
   - Data Processing Agreement (for enterprise prospects)
4. ⏳ **Pricing Finalized** (2 days)
   - Stripe integration
   - Pricing page with comparison table
5. ⏳ **Landing Page** (1 week)
   - Hero: Value prop + demo video
   - Features: Before/after comparison
   - Social proof: Early testimonials
   - Pricing table
   - CTA: "Start 14-Day Free Trial"
6. ⏳ **Get Real Anthropic API Key** (1 day)
   - Production key from Anthropic
   - Usage monitoring/alerts setup
   - Cost per extraction calculation

**Week 1-2 Actions:**
- [ ] Talk to 10 potential customers (even before branding is done!)
- [ ] Record 5-minute demo video showing PO upload → extraction → matching
- [ ] Set up basic analytics (PostHog or Google Analytics)
- [ ] Create LinkedIn company page
- [ ] Draft 3 initial blog posts (publish after branding)

### Phase 2: Launch & Iterate (Weeks 5-12) - Get to $10K MRR
**Goal:** 20-30 paying customers

**Channel Strategy (Prioritized):**

**1. Direct Outreach** (Weeks 1-4) - Highest ROI
- LinkedIn Sales Navigator: 100 target companies
- Personalized outreach: "I noticed [company] processes ~500 POs/month. Our customers cut processing time from 2 hours to 15 minutes. Worth a 15-min demo?"
- Target: 50 conversations → 10 demos → 5 customers

**2. Content Marketing** (Weeks 2-12) - Compound Effect
- **Blog Posts:**
  - "The Hidden Cost of Manual PO Processing" (calculator tool)
  - "Purchase Order Automation: Ultimate Guide for Distributors"
  - "How to Choose PO Software Without Getting Burned"
- **SEO Targets:**
  - "purchase order automation software" (390 searches/mo)
  - "PO processing software small business" (210 searches/mo)
  - "automated purchase order system" (480 searches/mo)

**3. Industry Communities** (Ongoing) - Low Cost, High Trust
- Reddit: r/procurement, r/smallbusiness, r/manufacturing
- LinkedIn Groups: Procurement & Supply Chain Professionals
- Forums: Spiceworks, APICS
- Strategy: Answer questions, provide value, soft product mentions

**4. Partnerships** (Month 2-3) - Force Multiplier
- QuickBooks App Store listing
- Xero Marketplace listing
- ERP/accounting consultant affiliate program (20% recurring commission)

**Success Metrics (90 Days):**
- [ ] $10,000 MRR (20-30 customers)
- [ ] 200 trial signups
- [ ] 2,000 POs processed through platform
- [ ] <10% monthly churn
- [ ] 1-2 customer referrals

---

### Phase 3: Scale (Month 4-12) - Get to $50K MRR
**Goal:** Product-market fit, repeatable acquisition channels

**Key Initiatives:**
1. **Paid Acquisition** (when we have $5K+ monthly budget)
   - Google Ads: Search campaigns for high-intent keywords
   - LinkedIn Ads: Target job titles (Procurement Manager, etc.)
   - Target metrics: <$500 CAC, >$1500 LTV, >3:1 LTV:CAC ratio

2. **Product-Led Growth**
   - Self-service free trial (14 days, no credit card)
   - In-app onboarding flow
   - Email drip campaign (value-focused, not sales-y)

3. **Enterprise Expansion**
   - Add SSO, advanced audit logs, custom workflows
   - Tiered pricing: $1,000-2,500/mo for enterprise features
   - Partner with implementation consultants

---

## Pricing & Revenue Model

### Recommended: Hybrid Model (Simplicity + Usage Alignment)

```
┌─────────────────────────────────────────────────────────────┐
│ STARTER                                        $199/month   │
│ • Up to 100 POs/month                                       │
│ • 2 users                                                   │
│ • Email support                                             │
│ • Basic analytics                                           │
│ Target: Small distributors, 20-50 employees                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROFESSIONAL (Most Popular)                    $499/month   │
│ • Up to 500 POs/month                                       │
│ • 10 users                                                  │
│ • Priority support                                          │
│ • Advanced analytics + custom reports                       │
│ • API access                                                │
│ Target: Mid-sized manufacturers, 50-150 employees           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ENTERPRISE                                     $999/month   │
│ • Unlimited POs                                             │
│ • Unlimited users                                           │
│ • Dedicated support + onboarding                            │
│ • SSO (SAML)                                                │
│ • Custom workflows                                          │
│ • SLA guarantee                                             │
│ Target: Large distributors, 150+ employees                  │
└─────────────────────────────────────────────────────────────┘
```

### Alternative: Pure Usage-Based (Lower Barrier)
- **Free Tier:** 10 POs/month (freemium onboarding, credit card required for 11+)
- **Pay-as-you-go:** $2.00 per PO processed
- **Volume Discounts:**
  - 500+ POs/month: $1.50/PO ($750/mo for 500)
  - 1000+ POs/month: $1.00/PO ($1,000/mo for 1000)

**Decision Factors:**
- Hybrid = More predictable revenue, easier forecasting
- Usage-based = Lower friction, better for seasonal businesses
- **Recommendation:** Start with Hybrid, test usage-based if conversion is low

### Unit Economics (Estimated)
```
Average Customer: $499/mo Professional plan
COGS per customer:
  - Supabase: ~$25/mo (database + storage)
  - Anthropic API: ~$50/mo (500 POs × $0.10/PO)
  - Infrastructure: ~$10/mo (Vercel, monitoring)
  Total COGS: ~$85/mo

Gross Margin: ($499 - $85) / $499 = 83%
CAC Target: <$500 (1 month payback)
Churn Target: <5% monthly (>20 month LTV)
LTV: $499 × 20 months = $9,980
LTV:CAC Ratio: $9,980 / $500 = 20:1 (excellent)
```

---

## Sales Playbook

### Outbound Prospecting (LinkedIn + Email)

**Step 1: Build Target List (100 companies)**
- Tool: LinkedIn Sales Navigator or ZoomInfo
- Filters: Industrial distribution, manufacturing, 10-200 employees
- Find 2-3 decision-makers per company (Procurement, Ops, Finance)

**Step 2: LinkedIn Connection Request (Non-Salesy)**
```
Hi [Name],

I work with procurement teams at distributors like [similar company].
Noticed [company] likely processes a high volume of POs -
thought it might be relevant to connect.

Best,
[Your Name]
```

**Step 3: Follow-Up Message (Value-First)**
```
Hi [Name],

Quick question - how much time does your team spend manually
entering PO data from PDFs each week?

We built an AI system that cuts that time by 80%. Happy to show
you a quick 2-minute example if you're curious.

[Loom video link - 2 min demo]

No pressure either way!
```

### Demo Script (15 Minutes)

**Minutes 0-3: Discovery**
- "Walk me through your current PO process - from receiving the PDF to data in your system"
- "How many POs per week?" "How long does each one take?" "Who does this work?"
- "What's the biggest frustration with the current process?"

**Minutes 3-10: Demo (Use THEIR vendor if possible)**
1. Upload sample PO PDF (ideally from a vendor they use)
2. Show AI extraction in real-time (30 seconds)
3. Show extracted data in review screen
4. Show part matching intelligence (vendor prefix normalization)
5. Show dashboard with analytics

**Minutes 10-13: ROI Calculation (On The Spot)**
```
"You mentioned [X] POs per week at [Y] minutes each.
That's [X × Y × 4] minutes per month = [Z] hours.

At $30/hr (loaded cost), that's $[Z × 30] monthly in labor.
Our software is $499/mo.

So you save $[Z × 30 - 499] every month, plus fewer errors and faster processing."
```

**Minutes 13-15: Close**
- "Does this solve your PO processing problem?"
- "Want to try it with 10 of your real POs this week?" (free trial)
- "I can get you set up in the next 10 minutes" (strike while iron is hot)
- Offer: "Founding customer discount - 50% off first 3 months if you sign up today"

### Common Objections & Responses

| Objection | Response |
|-----------|----------|
| **"We already have a system (Excel/ERP)"** | "How much time does your team spend manually entering PO data each week? [Pause for answer] We integrate with [their ERP] - you keep your system, we just automate the data entry." |
| **"Too expensive"** | "Let's do the math: You process [X] POs/month. At 2 hours each, that's [Y] hours at $30/hr = $[Z]. We're $499/mo. So you're saving $[Z-499] every month, plus you eliminate data entry errors." |
| **"We need to think about it"** | "Absolutely - what specific concerns do you have? [Uncover real objection] Would a 2-week free trial help? Upload 10 POs, see the time savings yourself." |
| **"How accurate is the AI?"** | "95%+ accuracy on standard formats. You review/approve before any data goes to your system. Way more accurate than rushed manual typing, and you still have full control." |
| **"Security/data privacy concerns"** | "SOC 2 infrastructure, encrypted at rest and in transit. Your data never used for AI training. We can sign a BAA/DPA for HIPAA or GDPR compliance if needed." |
| **"What if it doesn't work with our vendors?"** | "We handle all major vendor formats - show me a sample PO and I'll process it right now. [Live demo]. Our AI learns without templates, so even new vendor formats work." |

### Email Templates

**Initial Outreach (LinkedIn or Email)**
```
Subject: Quick question about PO processing at [Company]

Hi [Name],

I noticed [Company] likely processes 500+ POs per month.

Quick question: how much time does your team spend manually entering
PO data from PDFs into your system?

Our customers (similar distributors in [industry]) were spending 10-15
hours/week on this. We built an AI that cut that to under 2 hours.

Worth a 15-minute demo? I can show you exactly how it works with your
actual vendor POs.

[Calendar link]

Best,
[Your Name]

P.S. Here's a 2-minute video showing the process: [Loom link]
```

**Follow-Up (Day 3)**
```
Subject: Re: Quick question about PO processing

Hi [Name],

Following up on my note below about automating PO processing.

I put together a quick ROI calculator - if you process 500 POs/month
and each takes 15 minutes of manual work, you're spending $3,750/month
in labor on data entry.

Our software is $499/month, so you'd save $3,251/month.

Happy to show you how it works - no obligation.

[Calendar link]

Best,
[Your Name]
```

**Trial Conversion (Day 10 of 14-day trial)**
```
Subject: How's your trial going at [Company]?

Hi [Name],

You're 10 days into your trial - wanted to check in.

I see you've processed [X] POs so far. How's it comparing to your
old manual process?

Any questions I can answer? I'm here to help make sure you're getting
the most value.

Also - reminder that we're offering 50% off for the first 3 months
for early customers. That ends this Friday.

Want to hop on a quick call to discuss?

Best,
[Your Name]
```

---

## Marketing Strategy

### Content Marketing (SEO + Thought Leadership)

**Pillar Content (Long-form guides)**
1. **"Ultimate Guide to Purchase Order Automation for Distributors"** (3,000 words)
   - Target keyword: "purchase order automation"
   - Include: Process breakdown, ROI calculator, vendor comparison table
   - CTA: Download free "PO Process Audit Checklist"

2. **"Manual PO Processing Cost Calculator"** (Interactive tool)
   - Input: # of POs/month, minutes per PO, hourly wage
   - Output: Annual cost, time wasted, recommended solution
   - CTA: "See how much you could save with [Product]"

3. **"How to Choose Purchase Order Software (Without Getting Burned)"** (2,500 words)
   - Target keyword: "best purchase order software"
   - Include: Feature checklist, questions to ask vendors, pricing comparison
   - CTA: Compare top 5 solutions (position ourselves as #1)

**Supporting Content (Weekly blog posts)**
- Case studies: "[Company] Cut PO Processing Time by 85%"
- How-tos: "How to Audit Your PO Process for Inefficiencies"
- Industry insights: "2026 Procurement Automation Trends"
- Pain points: "7 Hidden Costs of Manual PO Processing"

### Social Media Strategy

**LinkedIn (Primary Channel)**
- **Frequency:** 3-5 posts/week
- **Content Mix:**
  - 40% Educational (how-to's, industry insights)
  - 30% Company updates (new features, customer wins)
  - 20% Customer stories (testimonials, case studies)
  - 10% Culture/behind-the-scenes
- **Hashtags:** #procurement #supplychain #automation #AI #manufacturing

**Twitter/X (Secondary)**
- **Frequency:** 1-2 posts/day
- **Content:** Quick tips, industry news commentary, product updates
- **Goal:** Build thought leadership, not direct sales

### YouTube/Video Content
1. **Product Demos** (3-5 minutes each)
   - "How to Process a PO in Under 2 Minutes"
   - "Setting Up Vendor Templates in [Product]"
   - "Understanding the Part Matching Algorithm"

2. **Customer Testimonials** (2-3 minutes)
   - Interview format: "How [Company] Saved 15 Hours/Week"

3. **Educational Content** (5-10 minutes)
   - "Procurement Automation Explained"
   - "The Future of PO Processing"

### Email Marketing Sequences

**Welcome Sequence (Trial Signup)**
- Day 0: "Welcome! Here's how to get started" + tutorial video
- Day 2: "3 tips to get the most from your trial"
- Day 5: "Case study: How [Company] saved $4K/month"
- Day 7: "Need help? Schedule a quick call"
- Day 10: "Your trial ends in 4 days - questions?"
- Day 13: "Last day! Lock in founding customer pricing"

**Nurture Sequence (Waitlist/Not Ready to Buy)**
- Week 1: "The hidden cost of manual PO processing" (blog post)
- Week 2: "5 signs you need purchase order automation" (checklist)
- Week 3: "[Company] case study - 85% time savings" (social proof)
- Week 4: "New feature: AI-powered part matching" (product update)
- Week 6: "Special offer for early supporters" (discount)

---

## Current Priorities

### This Week (Week of Feb 17, 2026)
**Goal:** Complete pre-launch checklist

**Monday-Tuesday: Branding**
- [ ] Product name decision (brainstorm 20, narrow to 3, test with 5 prospects)
- [ ] Domain purchase (.com preferred, .ai okay)
- [ ] Logo design brief (Fiverr or 99designs)

**Wednesday: Legal + Pricing**
- [ ] Terms of Service (use Termly template)
- [ ] Privacy Policy (GDPR/CCPA compliant)
- [ ] Finalize pricing tiers (Hybrid model recommended)
- [ ] Set up Stripe account + test payments

**Thursday-Friday: Landing Page**
- [ ] Write hero copy (value prop + subheadline)
- [ ] Record 2-minute demo video
- [ ] Design pricing comparison table
- [ ] Build waitlist/trial signup form
- [ ] Deploy to custom domain

### Next Week (Week of Feb 24, 2026)
**Goal:** First 5 customers

**Outreach Blitz:**
- [ ] Build list of 100 target companies (LinkedIn Sales Navigator)
- [ ] Send 50 LinkedIn connection requests (personalized)
- [ ] Send 50 cold emails (personalized, includes Loom demo)
- [ ] Schedule 10 demo calls
- [ ] Close 5 paying customers @ $200-500/mo

**Content Creation:**
- [ ] Publish landing page + blog
- [ ] Write 3 initial blog posts (publish 1/week)
- [ ] Set up Google Analytics + PostHog
- [ ] Create LinkedIn company page + first 5 posts

### Next 30 Days (March 2026)
**Goal:** $2,500 MRR, validate product-market fit

- [ ] 10-15 paying customers
- [ ] 50+ trial signups
- [ ] 1,000 POs processed
- [ ] First customer testimonial
- [ ] First case study published
- [ ] QuickBooks integration (if customers request)

---

## Success Metrics

### North Star Metric: Monthly Recurring Revenue (MRR)
**Targets:**
- End of Month 1 (Mar 2026): $1,000 MRR (5 customers)
- End of Month 3 (May 2026): $10,000 MRR (20-30 customers)
- End of Month 6 (Aug 2026): $25,000 MRR (50-75 customers)
- End of Month 12 (Feb 2027): $50,000 MRR (100-150 customers)

### Key Performance Indicators (KPIs)

**Acquisition Metrics:**
- Website visitors (goal: 1,000/month by Month 3)
- Trial signups (goal: 50/month by Month 3)
- Trial-to-paid conversion rate (goal: >20%)
- Customer Acquisition Cost (CAC) (goal: <$500)
- Payback period (goal: <2 months)

**Retention Metrics:**
- Monthly churn rate (goal: <5%)
- Net Revenue Retention (goal: >100%)
- Customer lifetime (goal: >20 months)
- Lifetime Value (LTV) (goal: >$10,000)
- LTV:CAC ratio (goal: >3:1)

**Product Metrics:**
- POs processed per customer (usage indicator)
- Time to first PO processed (onboarding metric - goal: <1 day)
- Extraction accuracy (goal: >95%)
- Part match rate (goal: >85%)
- Support tickets per customer (goal: <2/month)

**Leading Indicators:**
- Demo requests (pipeline)
- Content downloads (lead gen)
- Email list growth (awareness)
- Social media engagement (brand building)
- Customer referrals (satisfaction)

---

## Customer Research

### Customer Interview Template

**Before Demo (5 min Discovery):**
1. "Tell me about your current PO process - from receiving the PDF to data in your system"
2. "How many POs do you process per week/month?"
3. "How long does each PO take to process manually?"
4. "Who on your team does this work?"
5. "What's the biggest frustration with your current process?"
6. "Have you looked at other solutions? What stopped you from buying?"

**After Demo (5 min Feedback):**
1. "What did you like most about what you saw?"
2. "What concerns do you have?"
3. "What would prevent you from using this?"
4. "What features are missing that you'd need?"
5. "How much would you expect to pay for something like this?"

**Document Insights:**
- Create `/customer-interviews/[company-name]-[date].md` for each conversation
- Tag common themes: pricing concerns, feature requests, integration needs
- Share insights in weekly team review

### Common Themes to Watch For
- **Integration requests:** QuickBooks, Xero, NetSuite, SAP (prioritize based on frequency)
- **Approval workflows:** Custom routing, mobile approvals, delegations
- **Reporting needs:** Specific analytics or export formats
- **Security requirements:** SOC 2, HIPAA, specific compliance needs
- **Pricing sensitivity:** What's their budget range?

---

## Roadmap

### Now (Weeks 1-4): Pre-Launch
- [x] MVP Complete
- [ ] Branding & legal foundation
- [ ] Landing page live
- [ ] First 5 paying customers
- [ ] Customer feedback collected

### Next (Months 2-3): Product-Market Fit
- [ ] 20-30 paying customers
- [ ] First integration (QuickBooks or Xero)
- [ ] Mobile approvals
- [ ] Advanced analytics dashboard
- [ ] Referral program

### Later (Months 4-6): Growth & Scale
- [ ] Self-service onboarding
- [ ] API for integrations
- [ ] Advanced workflow builder
- [ ] SSO (SAML) for enterprise
- [ ] Paid acquisition channels (Google Ads, LinkedIn)

### Future (Months 7-12): Enterprise Expansion
- [ ] Custom approval workflows
- [ ] Advanced audit logs & compliance features
- [ ] Multi-entity support
- [ ] White-label option
- [ ] Predictive analytics

**Feature Prioritization Framework:**
1. **Will this help close the next 5 customers?** (Yes = Do now, No = Backlog)
2. **Is this a gap vs. competitors?** (Check [competitor-feature-gaps.md](./competitor-feature-gaps.md))
3. **How much dev time?** (Small = 1 day, Medium = 3 days, Large = 1 week+)
4. **What's the impact on churn?** (High retention impact = prioritize)

**See:** [competitor-advanced-features.md](./competitor-advanced-features.md) for full feature ideas backlog

---

# TECHNICAL DOCUMENTATION

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4, shadcn/ui components |
| Database | Supabase (PostgreSQL 17 with RLS) |
| Auth | Supabase Auth (email/password) |
| AI Extraction | Anthropic Claude Vision API (`@anthropic-ai/sdk`) |
| State | React Query (`@tanstack/react-query`) for server state |
| Charts | Recharts v3 (BarChart, LineChart, PieChart) |
| Fuzzy Search | Fuse.js for part number fuzzy matching |
| Testing | Vitest + Testing Library + jsdom |
| PDF | pdfjs-dist + react-pdf for PDF viewing |

## Deployment Status

- **Supabase Project**: `yispbrxqydfdyoxlclyd` (us-east-1)
- **URL**: `https://yispbrxqydfdyoxlclyd.supabase.co`
- **Database**: PostgreSQL 17, 10 tables + 28 RLS policies deployed
- **Storage**: `po-pdfs` bucket (private) with org-scoped RLS
- **Migrations**: 001_initial_schema + 002_seed_data applied
- **Build**: Clean (25 routes), 36 tests passing, 0 TypeScript errors
- **Status**: ✅ MVP Complete | ⚠️ Missing Real Anthropic API Key

---

## Architecture

### Database Schema (10 Tables)
```
organizations          # Multi-tenant org records
organization_users     # User-org membership (many-to-many)
vendors                # Supplier/vendor master data
vendor_templates       # Vendor-specific extraction rules
products               # Part/SKU catalog
purchase_orders        # PO header records
po_line_items          # PO line-level detail
extraction_jobs        # Claude Vision API job tracking
extraction_headers     # Extracted PO header data
extraction_line_items  # Extracted PO line data
```

### Multi-Tenancy Pattern (Critical!)
- **Function:** `public.user_org_id()` - Returns current user's org_id from JWT
  - **MUST** be in `public` schema (not `auth`) - Supabase `db push` limitation
- **RLS:** All tables filtered by `organization_id = user_org_id()`
- **Auth:** Supabase JWT contains `app_metadata.organization_id`
- **Storage:** Bucket RLS uses `user_org_id()` for path-based access control

### Extraction Pipeline (src/lib/extraction/)
AI-powered document processing with 5-stage pipeline:

1. **Vendor Detection** (`vendor-detection.ts`)
   - Match sender email domain → keywords → vendor name
   - Example: `orders@powerweld.com` → Powerweld vendor

2. **Prompt Building** (`prompt-builder.ts`)
   - Load vendor template from database
   - Inject vendor-specific extraction rules
   - Format instructions for Claude Vision API

3. **Claude Vision Extraction** (`claude-api.ts`)
   - Convert PDF pages to images
   - Send to Anthropic API with structured output schema
   - Extract: PO number, dates, line items (part #, desc, qty, price)

4. **Validation** (`validation.ts`)
   - Check required fields (PO #, vendor, line items)
   - Validate quantities > 0, prices > 0
   - Verify line total = qty × price
   - Flag missing/invalid data

5. **Confidence Scoring** (`confidence-scoring.ts`)
   - Calculate extraction confidence (0-100%)
   - Route: >85% = auto-approve, <85% = review queue
   - Score factors: completeness, validation errors, AI confidence

### Part Matching Engine (src/lib/matching/)
4-stage cascade with early exit on high-confidence match:

**Stage 1: Exact Vendor Mapping (Confidence: 100)**
- Lookup in `vendor_mappings` table
- Exact match on vendor_id + vendor_part_number

**Stage 2: Manufacturer Part Match (Confidence: 95)**
- If MFG part # was extracted, match on `manufacturer_part_number`

**Stage 3: Prefix-Normalized Match (Confidence: 85)**
- Strip vendor prefixes: CMI-/BER-/LIN-/CMUC/CMD
- Handles vendor part numbering schemes (see table below)

**Stage 4: Fuzzy Match (Confidence: varies)**
- Fuse.js fuzzy matching with Levenshtein distance
- Threshold: 0.3 (higher = stricter)
- Returns best match with confidence score

### Vendor Part Number Schemes (Critical for Matching!)
| Vendor   | Prefix           | Example Input   | Normalized  | Maps To (Product SKU) |
|----------|------------------|-----------------|-------------|-----------------------|
| SKD      | CMI-, BER-, LIN- | CMI-B5662       | B5662       | B5662                 |
| Linde    | CMUC, CMD        | CMUC315-3545    | 315-3545    | C315-3545             |
| Matheson | CMD + space      | CMD 4636001     | 4636001     | 046-36-001            |
| Powerweld| (none)           | B422            | B422        | B422                  |

**Why this matters:**
- Same physical part has different part numbers across vendors
- Part matching must normalize prefixes to find the right internal SKU
- Without normalization, match rate would be <30% instead of 85%+

---

## Development Patterns

### API Route Pattern (All 25 Routes Follow This)
```typescript
export async function GET/POST(request: NextRequest) {
  const supabase = createClient() // RLS-scoped client

  // 1. Auth check (return 401 if not authenticated)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. RLS-scoped query (automatic filtering by org_id)
  const { data, error } = await supabase
    .from('table_name')
    .select('*')  // RLS automatically filters by user's org

  // 3. Return JSON with proper status codes
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
```

**Important:**
- Use `createClient()` (RLS-scoped) for normal routes
- Use `createServiceClient()` (bypasses RLS) ONLY for seed/admin operations
- Never expose service role key to client!

### Dashboard Page Pattern (All Pages Follow This)
```tsx
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Table, Dialog, Button } from '@/components/ui'

export default function DashboardPage() {
  const queryClient = useQueryClient()

  // Fetch data with React Query (no useState for server data!)
  const { data, isLoading, error } = useQuery({
    queryKey: ['resource'],
    queryFn: () => fetch('/api/resource').then(r => r.json())
  })

  // Mutations for writes
  const createMutation = useMutation({
    mutationFn: (newData) => fetch('/api/resource', {
      method: 'POST',
      body: JSON.stringify(newData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource'] })
      toast.success('Created successfully')
    }
  })

  if (isLoading) return <Skeleton />
  if (error) return <div>Error: {error.message}</div>

  return (
    <Card>
      <Table data={data} />
      <Dialog>{/* Create/Edit form */}</Dialog>
    </Card>
  )
}
```

**Key Patterns:**
- All pages are `'use client'` (Next.js 16 App Router)
- React Query for data fetching (not `useState` for server state!)
- shadcn/ui components (Card, Table, Dialog, Button, etc.)
- Toast notifications via `sonner`
- Icons from `lucide-react`

### Critical TypeScript Gotchas (Read This!)

**1. Recharts v3 Type Issues**
```tsx
// ❌ DON'T: Explicit type annotation causes errors
const formatter: TooltipFormatter = (value) => value

// ✅ DO: Let TypeScript infer, use String() cast
const formatter = (value: any) => String(value)
```

**2. Supabase Join Type Casting**
```typescript
// ❌ Single cast fails on nested joins
const vendor = po.vendors as Vendor

// ✅ Double cast pattern for Supabase joins
const vendor = po.vendors as unknown as Vendor | null
```

**3. Component Props (React Resizable Panels v4)**
```tsx
// ❌ Wrong prop name (v3 syntax)
<ResizablePanelGroup direction="horizontal">

// ✅ Correct prop name for v4
<ResizablePanelGroup orientation="horizontal">
```

**4. Type Mismatches (Database vs. Application Types)**
- `ExtractionLineItem` uses `unit_of_measure` (not `uom`)
- `ExtractionHeader` uses `ship_to_name`/`ship_to_address` (not `ship_to`/`bill_to`)
- `POWithDetails` uses `Omit<PurchaseOrder, 'vendor' | ...>` to avoid interface conflicts

### Environment Variables (Critical!)
```bash
# .env.local - ALL must be valid URLs even for build!
NEXT_PUBLIC_SUPABASE_URL=https://yispbrxqydfdyoxlclyd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # Real anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # Server-only, never expose!
ANTHROPIC_API_KEY=sk-ant-...         # ⚠️ STILL PLACEHOLDER - GET REAL KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_ACCESS_TOKEN=sbp_...        # For CLI operations
```

**Why valid URLs matter:**
- Supabase client validates URL format at import time
- Build will fail with invalid URLs, even if not used

---

## Project Structure

```
po-processing-saas/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login, signup pages
│   │   ├── (dashboard)/         # All authenticated pages (shared layout with sidebar)
│   │   │   ├── page.tsx            # Dashboard: stats + charts + recent POs + quick actions
│   │   │   ├── upload/             # Multi-file PDF upload with batch processing
│   │   │   ├── review/             # Review queue list + [id] detail with PDF viewer
│   │   │   ├── pos/                # PO list table + [id] detail view
│   │   │   ├── products/           # Product catalog CRUD + CSV import
│   │   │   ├── vendors/            # Vendor list + [id]/templates editor
│   │   │   ├── mappings/           # Part number mapping management
│   │   │   └── settings/           # Profile, org settings, demo data seeding
│   │   ├── api/
│   │   │   ├── auth/setup/         # POST: Create org + user on first signup
│   │   │   ├── dashboard/
│   │   │   │   ├── stats/          # GET: Summary metrics (today's POs, pending, confidence, match rate)
│   │   │   │   └── analytics/      # GET: Chart data (volume, confidence dist, vendor breakdown, match trend)
│   │   │   ├── po/                 # CRUD for purchase orders
│   │   │   │   ├── route.ts           # GET (list with vendor join), POST (create)
│   │   │   │   ├── upload/route.ts    # POST: PDF upload + extraction pipeline
│   │   │   │   ├── export/route.ts    # GET: CSV export with status/vendor/date filters
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts       # GET (detail with line items), PUT (update)
│   │   │   │       └── approve/       # POST: Approve/reject PO
│   │   │   ├── products/           # GET (search/paginated), POST (single/bulk), PUT, DELETE
│   │   │   ├── vendors/            # GET (list with templates), POST (create)
│   │   │   │   └── [id]/templates/ # GET, POST, PUT for vendor extraction templates
│   │   │   ├── mappings/           # GET, POST, PUT, DELETE + /match endpoint
│   │   │   ├── review-queue/       # GET: Review queue with joined PO data
│   │   │   └── seed/               # POST: Demo data seeder (admin only, ?reset=true)
│   │   └── providers.tsx        # React Query provider
│   ├── components/
│   │   ├── layout/              # Sidebar, Header
│   │   ├── po-review/           # PO review: split PDF viewer + data panel (ResizablePanelGroup)
│   │   ├── shared/              # EmptyState, LoadingSpinner
│   │   ├── upload/              # Multi-file PDF dropzone with per-file progress
│   │   └── ui/                  # shadcn/ui primitives (30+ components)
│   ├── hooks/
│   │   └── use-po-review.ts     # React Query hook for PO review page
│   ├── lib/
│   │   ├── extraction/          # AI extraction pipeline
│   │   │   ├── extraction-pipeline.ts  # Main orchestrator
│   │   │   ├── claude-api.ts           # Claude Vision API calls
│   │   │   ├── prompt-builder.ts       # Vendor-specific prompt construction
│   │   │   ├── vendor-detection.ts     # Email/keyword/name vendor detection
│   │   │   ├── validation.ts           # Post-extraction validation rules
│   │   │   └── confidence-scoring.ts   # Confidence score calculation
│   │   ├── matching/            # Part number matching engine
│   │   │   ├── match-engine.ts         # 4-stage matching orchestrator
│   │   │   ├── prefix-normalizer.ts    # CMI-/BER-/LIN-/CMUC/CMD prefix handling
│   │   │   └── fuzzy-matcher.ts        # Fuse.js fuzzy matching
│   │   ├── storage/             # PDF upload/URL generation
│   │   └── supabase/            # Client, server, middleware helpers
│   ├── types/
│   │   ├── database.ts          # All DB entity interfaces
│   │   ├── extraction.ts        # Extraction pipeline types
│   │   └── po.ts                # PO-specific composite types
│   └── middleware.ts            # Supabase auth middleware
├── supabase/
│   ├── .temp/project-ref        # Linked project: yispbrxqydfdyoxlclyd
│   └── migrations/
│       ├── 001_initial_schema.sql  # 10 tables + RLS + triggers + functions
│       └── 002_seed_data.sql       # Seed data migration
├── vitest.config.ts
├── .env.example
└── CLAUDE.md                    # This file
```

## Complete Route Map (25 routes)

### API Routes (17 dynamic)
| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/auth/setup | Create org + user on signup |
| GET | /api/dashboard/analytics | Charts: PO volume, confidence dist, vendor breakdown, match rate |
| GET | /api/dashboard/stats | Summary: pos_today, pending_reviews, avg_confidence, match_rate |
| GET/POST | /api/po | List POs (with vendor join), Create PO |
| GET/PUT | /api/po/[id] | Single PO detail (with line items + vendor), Update PO |
| POST | /api/po/[id]/approve | Approve/reject PO |
| GET | /api/po/export | CSV export with filters (status, vendor_id, from, to) |
| POST | /api/po/upload | PDF upload + full extraction pipeline |
| GET/POST/PUT/DELETE | /api/products | Product CRUD (POST supports bulk array for CSV import) |
| GET | /api/review-queue | Review queue with joined PO data |
| POST | /api/seed | Seed demo data (?reset=true to clear first) |
| GET/POST | /api/vendors | Vendor list/create |
| GET/POST/PUT | /api/vendors/[id]/templates | Template CRUD |
| GET/POST/PUT/DELETE | /api/mappings | Mapping management |
| POST | /api/mappings/match | Trigger part number matching |

### Page Routes (13 pages)
| Route | Type | Description |
|-------|------|-------------|
| / | Dynamic | Dashboard: 4 stat cards, recent POs, quick actions, 4 Recharts analytics |
| /login | Static | Email/password login |
| /signup | Static | Registration with org creation |
| /upload | Static | Multi-file PDF drag-and-drop with batch processing |
| /review | Static | Review queue list |
| /review/[id] | Dynamic | PO review: split PDF viewer + data panel |
| /pos | Static | All POs table with status filter + CSV export |
| /pos/[id] | Dynamic | Read-only PO detail with line items |
| /products | Static | Product catalog: search, CRUD, CSV import |
| /vendors | Static | Vendor list |
| /vendors/[id]/templates | Dynamic | Vendor template JSON editor |
| /mappings | Static | Part number mapping management |
| /settings | Static | Profile, org settings, demo data seeding |

## Key Architecture Decisions

### Multi-tenancy
- Every table has `organization_id` with RLS policies (28 total + 2 storage)
- `public.user_org_id()` SQL function resolves current user's org (MUST be in `public` schema, not `auth`)
- Vendor templates are scoped through vendor -> organization chain

### Extraction Pipeline (src/lib/extraction/)
1. **Vendor Detection**: Match sender email domain -> keywords -> vendor name
2. **Prompt Building**: Load vendor template, inject vendor-specific extraction rules
3. **Claude Vision**: Send PDF pages as images to Claude API
4. **Validation**: Check PO number, quantities, prices, math, confidence
5. **Confidence Scoring**: Route to auto-approve (>85%) or review queue

### Part Matching Engine (src/lib/matching/)
4-stage cascade with early exit on high-confidence match:
1. **Exact vendor mapping** (confidence 100) - lookup in vendor_mappings table
2. **Manufacturer part match** (confidence 95) - if MFG part was extracted
3. **Prefix-normalized match** (confidence 85) - strip CMI-/BER-/LIN-/CMUC/CMD prefixes
4. **Fuzzy match** (confidence varies) - Fuse.js with threshold 0.3

### Vendor Part Number Schemes
| Vendor | Prefix | Example | Maps To |
|--------|--------|---------|---------|
| Linde | CMUC/CMD | CMUC315-3545 | C315-3545 |
| Matheson | CMD (space) | CMD 4636001 | 046-36-001 |
| Powerweld | (none) | B422 | B422 |
| SKD Supply | CMI-/BER-/LIN- | CMI-B5662 | B5662 |

## Patterns and Conventions

### API Routes
- All routes check `supabase.auth.getUser()` first
- Use `createClient()` (RLS-scoped) for normal queries
- Use `createServiceClient()` (bypasses RLS) only for seed/admin operations
- Return `NextResponse.json()` with appropriate status codes
- Error pattern: `catch (error: unknown) { const message = error instanceof Error ? error.message : 'Failed' }`

### Dashboard Pages
- All pages are `'use client'` with React Query for data fetching
- Pattern: `useQuery` for reads, `useMutation` for writes, `queryClient.invalidateQueries` to refresh
- UI: shadcn/ui Card wrapping Table, with Dialog for create/edit forms
- Toast notifications via `sonner`
- Loading states use `Skeleton` components
- Icons from `lucide-react`
- Charts: Recharts `ResponsiveContainer` wrapping `BarChart`/`LineChart`/`PieChart`

### Database Types
- All interfaces in `src/types/database.ts` mirror the SQL schema
- Extraction types in `src/types/extraction.ts` (`ExtractionLineItem` uses `unit_of_measure` not `uom`)
- `POWithDetails` uses `Omit<PurchaseOrder, 'vendor' | 'review_queue_item' | 'line_items'>` to avoid type conflicts
- Use `as const` for string literal types in API data

### TypeScript Gotchas
- `ResizablePanelGroup`: prop is `orientation` not `direction` (react-resizable-panels v4)
- Recharts formatters: avoid explicit type annotations, use `String(d)` casts
- Supabase join casts: `(po.vendors as unknown as { vendor_name: string } | null)`
- Double cast pattern: `(data as unknown as TargetType)` when single cast fails

## Testing

```bash
npm test            # Run all tests (vitest)
npm run test:watch  # Watch mode
npm run test:coverage
```

Test files live in `__tests__/` directories next to source files:
- `src/lib/extraction/__tests__/validation.test.ts` (11 tests)
- `src/lib/extraction/__tests__/vendor-detection.test.ts` (9 tests)
- `src/lib/matching/__tests__/prefix-normalizer.test.ts` (16 tests)

Total: **36 tests**, all passing.

Vitest config: jsdom environment, `@/` path alias to `./src`.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL (must be valid URL, even for build)
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY     # Supabase service role key (server-only)
ANTHROPIC_API_KEY             # Claude API key for extraction (currently placeholder)
NEXT_PUBLIC_APP_URL           # App URL (default: http://localhost:3000)
SUPABASE_ACCESS_TOKEN         # Supabase CLI access token (for migrations/management)
```

## Seed Data

The seed system (`POST /api/seed`, admin-only) creates:
- **4 vendors** with extraction templates (Powerweld, Linde, Matheson, SKD Supply)
- **20 products** across 9 categories (Triggers, Guns, Tips, Nozzles, etc.)
- **15 vendor mappings** showing cross-vendor part number translations
- **3 sample POs** in the review queue at different confidence levels:
  - Powerweld V24-1087: 92.5% confidence (high - simple format)
  - Linde 4500892147: 75% confidence (medium - complex multi-page)
  - Matheson 7700234: 55% confidence (low - watermark issues)

Use `POST /api/seed?reset=true` to clear and re-seed all org data.

The Settings page has a "Demo Data" card (admin-only) with buttons for seeding.

## Supabase Deployment Notes

### Migration Limitations
- `db push` runs as `postgres` role but **cannot** create functions in `auth` schema (use `public` instead)
- `db push` **cannot** access `storage` schema - create buckets and storage RLS via:
  - Storage API: `POST https://{ref}.supabase.co/storage/v1/bucket`
  - Management API: `POST https://api.supabase.com/v1/projects/{ref}/database/query`
- New projects may have unhealthy storage service initially - pause and restore the project to fix
- Use `gen_random_uuid()` (built-in PG13+), NOT `uuid_generate_v4()` (requires extension)

### Useful Commands
```bash
npx supabase link --project-ref yispbrxqydfdyoxlclyd
npx supabase migration list          # Check local vs remote migration status
echo "Y" | npx supabase db push --include-all  # Push migrations
npx supabase migration repair --status applied <version>  # Fix migration state
```

## Getting Started

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in Supabase + Anthropic keys
3. `npm run dev` to start dev server
4. Sign up at `/signup` to create account + organization
5. Go to Settings > Demo Data to seed sample data
6. Upload POs at `/upload` or explore seeded data

---

## Supabase Deployment Notes

### Migration Limitations (Critical Gotchas!)
⚠️ **`db push` runs as `postgres` role but has limitations:**

**1. Cannot Create Functions in `auth` Schema**
- Use `public` schema instead: `public.user_org_id()`
- Error if you try: "permission denied for schema auth"

**2. Cannot Access `storage` Schema**
- Create buckets via Storage API or Management API
- Storage RLS policies must be added via API, not migrations
- Example: `POST https://api.supabase.com/v1/projects/{ref}/database/query`

**3. New Projects May Have Unhealthy Storage**
- Symptom: Storage service shows "UNHEALTHY" in dashboard
- Fix: Pause project, wait 30 seconds, restore project
- Verify: Check `https://{ref}.supabase.co/storage/v1/bucket` returns 200

**4. Use Built-in Functions**
- ✅ `gen_random_uuid()` (built-in PostgreSQL 13+)
- ❌ `uuid_generate_v4()` (requires uuid-ossp extension)

### Supabase CLI Commands
```bash
# Login (use access token from memory)
npx supabase login --token sbp_adaea4003dd73ff20c6b12a46cf58641ac4462d8

# Link to project
npx supabase link --project-ref yispbrxqydfdyoxlclyd

# Check migration status
npx supabase migration list

# Push migrations (auto-confirm with echo)
echo "Y" | npx supabase db push --include-all

# Fix migration state if needed
npx supabase migration repair --status applied <version>

# Create new migration from schema changes
npx supabase db diff -f migration_name
```

---

## Working with Claude Code (Agent Instructions)

### Before Starting Any Task
1. ✅ **Read this CLAUDE.md first** - Don't guess at patterns
2. ✅ **Check [competitor-feature-gaps.md](./competitor-feature-gaps.md)** - Feature might already be analyzed
3. ✅ **Check [competitor-advanced-features.md](./competitor-advanced-features.md)** - Future roadmap items
4. ✅ **Review recent git commits** - Understand what changed recently
5. ✅ **Search for TODOs** - Task might already be documented

### Code Modification Rules (Non-Negotiable)
- ✅ **TypeScript strict mode** - Never use `any`, use proper types or `unknown` + guards
- ✅ **Supabase RLS always** - Don't bypass with service keys in client routes
- ✅ **React Query for data** - Don't use `useState` for server state
- ✅ **Test before committing** - Run `npm run build` to catch errors
- ❌ **Never skip auth checks** - All API routes must check `supabase.auth.getUser()`
- ❌ **Never expose service role key** - Only use in server-side code, never client
- ❌ **No hardcoded values** - Use environment variables for config

### Git Workflow (Follow Strictly)
- ✅ Create new commits (don't amend unless explicitly requested)
- ✅ Co-authored-by: `Claude Sonnet 4.5 <noreply@anthropic.com>`
- ✅ Commit message format: `feat|fix|docs|refactor: description`
- ❌ Never force push to `main` (will lose work!)
- ❌ Never use `--no-verify` (respect pre-commit hooks)
- ❌ Never use `-i` flag in git commands (interactive mode not supported)

### Feature Prioritization Framework
When user requests a feature, ask these questions:

**1. Business Impact**
- Will this help close the next 5 customers? (Yes = High Priority)
- Is this a competitor gap we exploit? (Check competitor-feature-gaps.md)
- What's the retention impact? (Reduces churn = High Priority)

**2. Development Effort**
- Small = 1 day (e.g., add a field, simple UI tweak)
- Medium = 3 days (e.g., new dashboard page, API integration)
- Large = 1 week+ (e.g., new matching algorithm, major refactor)

**3. Decision Matrix**
```
High Impact + Small Effort = DO NOW
High Impact + Large Effort = PLAN & DO NEXT
Low Impact + Small Effort = BACKLOG (quick wins later)
Low Impact + Large Effort = DON'T DO (wrong priorities)
```

### Communication Style
- Be concise - no fluff, just facts and next steps
- Link to files: `[filename.ts:42](src/path/to/file.ts#L42)`
- Don't use emojis unless user explicitly requests
- Show code diffs for changes, not just "I updated the file"
- When presenting options, use `AskUserQuestion` tool with specific choices

### Asking for Clarification
**Product Questions:**
1. Check this CLAUDE.md (Product Vision, Roadmap)
2. Check competitor analysis docs
3. If still unclear, use `AskUserQuestion` with 2-4 specific options

**Technical Questions:**
1. Check Development Patterns section
2. Check Next.js/Supabase official docs
3. Search codebase for similar patterns
4. If stuck, ask user with specific context

**Business Questions:**
1. Check Go-to-Market Strategy, Pricing sections
2. Check Sales Playbook for objection handling
3. If customer-facing, ask user for their preference

---

## Quick Reference

### Common Commands
```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run type-check       # Check TypeScript errors
npm run lint             # Check ESLint errors
npm run build            # Production build test (run before committing!)

# Testing
npm test                 # Run all tests (vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Supabase
npm run supabase:start   # Start local Supabase (optional)
npm run supabase:stop    # Stop local Supabase
npm run supabase:reset   # Reset local DB + run migrations
```

### Key Files to Know
| File | Purpose |
|------|---------|
| `app/api/extract/route.ts` | Claude Vision API integration |
| `lib/extraction/extraction-pipeline.ts` | Main extraction orchestrator |
| `lib/matching/match-engine.ts` | 4-stage part matching |
| `lib/matching/prefix-normalizer.ts` | Vendor prefix handling (CMI-/BER-/etc.) |
| `lib/supabase/middleware.ts` | Auth middleware |
| `lib/types.ts` | Shared TypeScript types |
| `supabase/migrations/` | Database migrations |
| `components/ui/` | shadcn/ui primitives (30+ components) |

### Route Map (25 Total Routes)
**Most Important API Routes:**
- `POST /api/po/upload` - PDF upload + full extraction pipeline
- `GET /api/po/[id]` - Single PO detail with line items + vendor
- `GET /api/review-queue` - Review queue with joined PO data
- `GET /api/dashboard/stats` - Summary metrics for dashboard
- `POST /api/seed` - Demo data seeder (admin only)

**Most Important Pages:**
- `/` - Dashboard with stats, charts, recent POs
- `/upload` - Multi-file PDF drag-and-drop
- `/review/[id]` - PO review: split PDF viewer + data panel
- `/products` - Product catalog with search, CRUD, CSV import
- `/settings` - Profile, org settings, demo data

### Vendor Prefix Quick Reference
| Vendor | Prefixes | Example | Normalized |
|--------|----------|---------|------------|
| SKD | CMI-, BER-, LIN- | CMI-B5662 | B5662 |
| Linde | CMUC, CMD (no space) | CMUC315-3545 | 315-3545 |
| Matheson | CMD + space | CMD 4636001 | 4636001 |
| Powerweld | (none) | B422 | B422 |

---

## Biggest Risks & Mitigations

### Risk 1: Building Without Customer Validation
**Problem:** Building features in vacuum, no actual customer feedback
**Impact:** Waste time on features nobody wants
**Mitigation:**
- Talk to 10 potential customers THIS WEEK (even before branding)
- Every feature request: "Will this help close next 5 customers?"
- Ship fast, iterate based on feedback (not assumptions)

### Risk 2: Anthropic API Costs Unknown
**Problem:** Don't know actual cost per PO extraction yet
**Impact:** Could be unprofitable at current pricing
**Mitigation:**
- Get real Anthropic API key ASAP
- Process 100 sample POs, measure actual costs
- Calculate: Avg tokens per PO × $X per 1000 tokens = cost/PO
- Adjust pricing if needed (should be <$0.50/PO for 80%+ margin)

### Risk 3: Market Timing / Competition
**Problem:** Competitors (Coupa, Procurify) adding AI features rapidly
**Impact:** Our AI advantage could erode
**Mitigation:**
- Ship fast - get to market before competitors catch up
- Focus on SMB market (competitors focused on enterprise)
- Differentiate on simplicity, not just AI (UX moat)
- Build customer relationships (harder to copy than features)

### Risk 4: No Branding / No Landing Page
**Problem:** Can't drive traffic, collect leads, or sell without brand/website
**Impact:** Delays revenue by weeks
**Mitigation:**
- Branding is THIS WEEK'S top priority
- Use templates/contractors to move fast (Fiverr, 99designs)
- Don't overthink it - get something live, iterate based on customer feedback

---

## Critical Next Actions (This Week!)

### Must Do Before Launch
1. ⚠️ **Get Real Anthropic API Key** (Blocks: Testing extraction properly)
2. ⚠️ **Product Name + Domain** (Blocks: Landing page, marketing, sales)
3. ⚠️ **Pricing Finalized** (Blocks: Stripe integration, can't sell)
4. ⚠️ **Landing Page Live** (Blocks: Can't drive traffic, collect leads)
5. ⚠️ **Legal Docs** (Blocks: Can't accept payments without ToS/Privacy Policy)

### Quick Wins (Do After Must-Dos)
- Record 2-minute demo video (use Loom)
- Set up Google Analytics / PostHog
- Create LinkedIn company page
- Write first blog post (publish after branding)
- Build list of 100 target companies (LinkedIn Sales Navigator)

### When Adding New Features
1. Check competitor analysis - is this a gap or advanced feature?
2. Estimate dev time (small/medium/large)
3. Ask: "Will this help close next 5 customers?"
4. If yes → prioritize, if no → backlog
5. Update this CLAUDE.md with any new patterns or gotchas learned

---

## Success Criteria (How We Know We're Winning)

### 30-Day Goals (March 2026)
- [ ] $1,000-2,500 MRR (5-10 customers)
- [ ] 50+ trial signups
- [ ] 1,000 POs processed through system
- [ ] <5 bugs reported (quality signal)
- [ ] 1 customer referral (satisfaction signal)
- [ ] First testimonial published

### 90-Day Goals (May 2026)
- [ ] $10,000 MRR (20-30 customers)
- [ ] 200+ trial signups
- [ ] 5,000+ POs processed
- [ ] <5% monthly churn
- [ ] 3+ customer case studies
- [ ] First integration live (QuickBooks or Xero)

### 12-Month Goals (February 2027)
- [ ] $50,000 MRR (100-150 customers)
- [ ] Profitable (revenue > costs)
- [ ] Repeatable acquisition channel (not just founder hustle)
- [ ] 2-3 person team (hire first employee)
- [ ] Product-market fit validated (NPS > 40, churn < 5%)

---

## Remember: Revenue > Features

**The Goal is Money, Not Code**
- A $200/mo customer using 80% of features beats 0 customers with 100% of features
- Ship fast, talk to customers, iterate based on feedback
- Don't build enterprise features until enterprise customers are asking (and paying)
- Every week without revenue is a week closer to running out of runway

**When in Doubt:**
- Check this CLAUDE.md first
- Check competitor analysis docs second
- Ask user with specific options third
- Don't guess or build speculatively

**Questions? Problems? Stuck?**
- Read relevant section of this doc
- Check official docs (Next.js, Supabase, Anthropic)
- Search codebase for similar patterns
- Use `AskUserQuestion` tool with 2-4 specific options

**Let's build something people pay for.** 🚀
