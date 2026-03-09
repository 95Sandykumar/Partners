# POFlow User Guide

A complete guide to using POFlow for automated purchase order processing.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Uploading Purchase Orders](#uploading-purchase-orders)
3. [How AI Extraction Works](#how-ai-extraction-works)
4. [How Part Matching Works](#how-part-matching-works)
5. [Reviewing and Approving POs](#reviewing-and-approving-pos)
6. [Managing Your Product Catalog](#managing-your-product-catalog)
7. [Managing Vendors](#managing-vendors)
8. [Part Number Mappings](#part-number-mappings)
9. [Dashboard and Analytics](#dashboard-and-analytics)
10. [Billing and Plans](#billing-and-plans)
11. [Exporting Data](#exporting-data)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating Your Account

1. Visit the POFlow login page and click **Sign Up**.
2. Enter your email address and choose a password.
3. You will be prompted to create your organization. Enter your company name.
4. Your organization is created with the **Free plan** (50 POs/month, 1 user).

### First-Time Setup

After signing up, follow these steps to get the most out of POFlow:

1. **Import your product catalog** -- Go to the **Products** page and either add products manually or upload a CSV file with your internal SKUs, descriptions, and categories.

2. **Add your vendors** -- Go to the **Vendors** page and register each vendor you receive POs from. Include their email domain (e.g., `powerweld.com`) so POFlow can auto-detect which vendor sent a PO.

3. **Upload your first PO** -- Go to the **Upload** page, drag and drop a PDF, and watch POFlow extract the data automatically.

4. **Review the results** -- Check the **Review Queue** to verify the extracted data is correct. Approve it if everything looks good.

The in-app **Guide** page (accessible from the sidebar) includes a video walkthrough and FAQ.

---

## Uploading Purchase Orders

### Supported Formats

- **File type**: PDF only
- **Maximum size**: 10 MB per file
- **Content**: Text-based PDFs work best. Scanned/image-only PDFs may produce lower confidence results.
- **Pages**: Single and multi-page POs are both supported.

### How to Upload

1. Navigate to the **Upload** page from the sidebar.
2. Drag and drop one or more PDF files into the upload zone, or click to browse.
3. Optionally enter the sender's email address. This helps POFlow detect the vendor automatically.
4. Click **Upload** to start processing.

### What Happens After Upload

1. The PDF is securely stored in your organization's storage bucket.
2. AI extraction runs immediately, pulling out PO header data, line items, quantities, prices, and totals.
3. Extracted part numbers are matched against your product catalog.
4. If the extraction confidence is **85% or higher** and all validations pass, the PO is **auto-approved**.
5. Otherwise, the PO is sent to the **Review Queue** for manual verification.

### Upload Limits

Your monthly PO upload limit depends on your plan:

| Plan | Monthly PO Limit |
|------|-----------------|
| Free | 50 |
| Starter | 200 |
| Professional | 500 |
| Enterprise | Unlimited |

A usage counter is displayed on the Upload page. When you reach your limit, you will need to upgrade your plan to continue processing.

---

## How AI Extraction Works

POFlow uses AI vision models to read your PDF purchase orders and extract structured data. The extraction pipeline works in several stages:

### Stage 1: Vendor Detection

Before extraction begins, POFlow identifies which vendor sent the PO by checking:

- The sender's email domain (if provided)
- Keywords found in the PDF text
- Known vendor names in your vendor list

Identifying the vendor allows POFlow to use vendor-specific templates that improve extraction accuracy.

### Stage 2: AI Vision Extraction

The PDF is sent to an AI model that reads the document visually and extracts:

- **PO Header**: PO number, date, ship-to address, vendor info
- **Line Items**: Part numbers, descriptions, quantities, unit prices, extended prices
- **Totals**: Subtotal, tax, shipping, grand total

POFlow uses a **hybrid extraction mode** by default: it tries the primary AI provider first, and if the confidence is below 75%, it automatically falls back to a secondary provider and uses whichever result is more accurate.

### Stage 3: Validation

After extraction, POFlow validates the results:

- Are all required fields present (PO number, at least one line item)?
- Do quantities and prices multiply correctly?
- Do line item totals sum to the grand total?
- Do part numbers match expected patterns for the detected vendor?

Any validation issues are flagged and factored into the confidence score.

### Stage 4: Confidence Scoring

Each extraction receives a confidence score from 0-100%:

- **85-100%**: High confidence. PO may be auto-approved.
- **70-84%**: Medium confidence. Sent to review queue.
- **Below 70%**: Low confidence. Sent to review queue with high priority.

The confidence score considers: AI model confidence, validation results, vendor template match quality, and historical accuracy for similar POs.

---

## How Part Matching Works

After extraction, POFlow matches each vendor part number to your internal product catalog using a 4-stage cascade. It stops at the first successful match.

### Stage 1: Exact Vendor Mapping (100% confidence)

POFlow checks your **vendor mappings** table for an exact match. If a mapping exists from a previous PO or manual entry, it uses that directly.

Example: Vendor part `B422` maps directly to internal SKU `B422`.

### Stage 2: Manufacturer Part Number Match (95% confidence)

If no exact mapping exists, POFlow looks for a match by manufacturer part number in your product catalog.

Example: Vendor part `CMUC315-3545` contains manufacturer part `C315-3545`, which matches a product in your catalog.

### Stage 3: Prefix-Normalized Match (85% confidence)

Many vendors add prefixes to part numbers. POFlow strips known vendor-specific prefixes and tries matching the normalized number.

Common prefix patterns:
- SKD Supply: `CMI-B5662` becomes `B5662`
- Linde: `CMUC315-3545` becomes `C315-3545`
- Matheson: `CMD 4636001` becomes `046-36-001`

### Stage 4: Fuzzy Match (70-75% confidence)

As a last resort, POFlow performs approximate string matching to catch typos and formatting variations.

Example: `B-422` fuzzy-matches to `B422`.

### Building Better Matches Over Time

When you correct a match in the review queue, POFlow creates a new vendor mapping that will be used for exact matching in the future. This means accuracy improves with every PO you process.

---

## Reviewing and Approving POs

### The Review Queue

POs that are not auto-approved appear in the **Review Queue** (accessible from the sidebar). Each item shows:

- PO number and vendor name
- Extraction confidence percentage
- Number of matched vs. unmatched parts
- Reason for review (low confidence, validation errors, unmatched parts)
- Priority level

### Reviewing a PO

Click on a review queue item to open the review page. This shows:

**Left Panel**: The original PDF document, rendered in the browser. You can scroll through pages and zoom in.

**Right Panel**: The extracted data, including:
- PO header information (PO number, date, vendor, ship-to)
- Line items table with part numbers, quantities, prices
- Match status for each line item (matched, unmatched, or fuzzy)
- Confidence scores per line item

### Editing Extracted Data

If the AI got something wrong, you can edit directly in the review panel:

- Click on any field to edit its value
- Correct part numbers, quantities, or prices
- Select the correct internal SKU from a dropdown for unmatched parts

Your corrections are saved automatically and used to improve future extractions.

### Approving or Rejecting

After reviewing:

- **Approve**: Marks the PO as approved. It will appear in the POs list and can be exported.
- **Reject**: Marks the PO as rejected. You can add a rejection reason for your records.

---

## Managing Your Product Catalog

The **Products** page is where you manage your internal SKU catalog. POFlow uses this catalog for part number matching.

### Adding Products

You can add products in two ways:

1. **Manual entry**: Click "Add Product" and fill in the SKU, description, category, brand, and unit of measure.

2. **CSV Import**: Click "Import CSV" and upload a file with columns for SKU, description, category, brand, and UOM. The system auto-maps common column names.

### Searching Products

The product catalog supports full-text search across SKU, description, category, and brand fields. Use the search bar to quickly find products.

### Best Practices

- Use consistent SKU formats across your catalog
- Include manufacturer part numbers where available (improves matching)
- Add category and brand information for better organization
- Keep descriptions detailed enough to distinguish similar products

---

## Managing Vendors

The **Vendors** page lets you configure the vendors you receive POs from.

### Adding a Vendor

When adding a vendor, provide:

- **Vendor Name**: The display name (e.g., "Powerweld LLC")
- **Vendor ID**: A short code (e.g., "POWERWELD")
- **Email Domains**: Email domains used by this vendor (e.g., "powerweld.com"). Used for auto-detection.
- **Keywords**: Words that appear on this vendor's POs (e.g., "Powerweld", "PWD"). Used for detection when email is not available.
- **PO Format Type**: Simple, complex, or multi-page. Helps the AI understand the document layout.

### Vendor Templates

Each vendor can have a **template** that tells the AI where to find specific fields on that vendor's PO format. Templates improve extraction accuracy significantly.

To manage templates, click on a vendor and then "Manage Templates". Templates include:

- Field location hints (where to find PO number, dates, line items)
- Part number format patterns (regex patterns for validation)
- Confidence adjustments (boost or reduce confidence based on vendor reliability)

Templates are versioned, so you can roll back if a new version performs worse.

---

## Part Number Mappings

The **Mappings** page shows all known translations between vendor part numbers and your internal SKUs.

### How Mappings Work

Each mapping records:
- **Vendor Part Number**: What the vendor calls the part
- **Manufacturer Part Number**: The manufacturer's designation
- **Internal SKU**: Your internal product code
- **Confidence**: How confident the system is in this mapping (0-100%)
- **Source**: How the mapping was created (manual, extracted, verified, auto)
- **Times Seen**: How many times this mapping has been used
- **Verified**: Whether a human has confirmed this mapping

### Adding Mappings Manually

Click "Add Mapping" to create a new translation. This is useful when you know how a vendor refers to your products.

### Automatic Mapping

Every time you approve a PO and confirm the part matches, POFlow automatically creates or updates mappings. Over time, this eliminates the need for manual review of known parts.

---

## Dashboard and Analytics

The main **Dashboard** page shows real-time metrics:

### Key Metrics

- **POs Processed**: Total POs processed this month
- **Average Confidence**: Mean extraction confidence across recent POs
- **Match Rate**: Percentage of line items successfully matched
- **Review Queue Size**: Number of POs awaiting review

### Charts

- **Processing Volume**: POs processed over time (daily/weekly/monthly)
- **Confidence Trends**: How extraction accuracy is changing
- **Match Rate by Vendor**: Which vendors produce the best/worst matches
- **Cost Tracking**: API costs per PO

---

## Billing and Plans

### Available Plans

| Feature | Free | Starter ($299/mo) | Professional ($599/mo) | Enterprise ($1,299/mo) |
|---------|------|-------------------|----------------------|----------------------|
| Monthly POs | 50 | 200 | 500 | Unlimited |
| Users | 1 | 2 | 5 | Unlimited |
| Support | Email | Priority | Priority | Dedicated |
| API Access | No | Yes | Yes | Yes |
| Custom Templates | No | No | Yes | Yes |
| Custom Integrations | No | No | No | Yes |
| SLA | No | No | No | Yes |

### Upgrading Your Plan

1. Go to **Settings** from the sidebar.
2. Scroll to the **Billing & Subscription** section.
3. Choose a plan and click the upgrade button.
4. You will be redirected to a secure Stripe checkout page.
5. After payment, your plan is activated immediately.

### Managing Your Subscription

If you are on a paid plan, click **Manage Billing** in Settings to:
- View invoices and payment history
- Update your payment method
- Change or cancel your subscription

### What Happens When You Cancel

- Your account reverts to the **Free** plan (50 POs/month, 1 user).
- All your data is retained. Nothing is deleted.
- You can resubscribe at any time.

---

## Exporting Data

### CSV Export

Approved POs can be exported as CSV files:

1. Go to the **Purchase Orders** page.
2. Use filters to narrow down the POs you want to export (by status, vendor, date range).
3. Click **Export CSV**.
4. The downloaded file includes: PO number, date, vendor, all line items with part numbers, quantities, prices, matched SKUs, and totals.

### Export Format

The CSV export includes these columns:

| Column | Description |
|--------|-------------|
| po_number | Purchase order number |
| po_date | Order date |
| vendor_name | Vendor who sent the PO |
| line_number | Line item sequence |
| vendor_part_number | Part number as listed on the PO |
| internal_sku | Matched internal product code |
| description | Item description |
| quantity | Ordered quantity |
| unit_price | Price per unit |
| extended_price | Quantity x unit price |
| match_confidence | Confidence of the part match (%) |
| match_method | How the match was found (exact/mfg/prefix/fuzzy) |

---

## Troubleshooting

### "Extraction failed" after upload

- Verify the PDF is not password-protected or corrupted.
- Ensure the PDF contains readable text (not just scanned images).
- Check that the file is under 10 MB.
- Try uploading the file again. Transient API errors can cause one-time failures.

### Low confidence scores

- Add a **vendor template** for the vendor. Templates significantly improve accuracy.
- Ensure your **product catalog** is up to date. Missing products cannot be matched.
- Check that vendor part numbers are correctly formatted in your **mappings**.

### Parts not matching

- Go to the **Mappings** page and add manual mappings for problematic parts.
- Check if the vendor uses prefixes or suffixes that differ from your catalog (e.g., "CMI-B5662" vs. "B5662").
- Approve POs with corrections -- POFlow learns from every correction.

### "Monthly PO limit reached"

Your current plan's monthly limit has been reached. Upgrade your plan in Settings to process more POs. The limit resets on the first of each month.

### PDF not displaying in the review panel

- Ensure your browser supports PDF rendering (Chrome, Firefox, Edge all work).
- Try refreshing the page.
- If the PDF was recently uploaded, it may take a moment to be available.

### Billing issues

- If a payment fails, your subscription status changes to "past due". Update your payment method in Settings > Manage Billing.
- If you do not resolve payment within Stripe's retry window, your account may be downgraded to the Free plan.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Drag & Drop | Upload PDFs on the Upload page |
| Enter | Confirm edits in the review panel |
| Escape | Cancel editing |

---

## Security and Data Privacy

- All data is encrypted at rest and in transit (TLS/SSL).
- Row-level security (RLS) ensures organizations can only access their own data.
- PDF files are stored in isolated, organization-scoped storage buckets.
- Authentication is handled via Supabase Auth with JWT sessions.
- No PO data is shared between organizations.
- Extraction API calls do not store your data beyond the processing request.

---

## Getting Help

- **In-app Guide**: Click "Guide" in the sidebar for a video walkthrough and FAQ.
- **Email Support**: Available for all plans (priority support for Starter and above).
- **Documentation**: This guide and the technical documentation cover all features.

---

*Last updated: March 2026*
