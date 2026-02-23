# Implementation Plan: Airtable + n8n + Claude Vision

## Overview

**Platform:** Airtable Team ($20/user × 2-3 users = $40-60/month)
**Total Monthly Cost:** ~$100-200 (Airtable + Claude API)
**Timeline:** 2 weeks to full handoff

---

## Phase 1: Airtable Setup (Day 1-2)

### Step 1.1: Create Airtable Account & Base

1. Go to [airtable.com](https://airtable.com)
2. Sign up for Team plan (14-day free trial available)
3. Create new base: **"PO Processing System"**

### Step 1.2: Create Tables

You'll create 6 tables. Here are the exact schemas:

---

#### Table 1: Products (Your Product Library)

Import from your existing Google Sheet.

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| internal_sku | Single line text (Primary) | Your part number |
| description | Long text | Product description |
| category | Single select | Product category |
| brand | Single select | CM Industries, etc. |
| unit_price | Currency | Standard price |
| is_active | Checkbox | Currently selling? |
| aliases | Long text | Alternative part numbers |
| created_at | Created time | Auto |
| updated_at | Last modified time | Auto |

**Import Process:**
1. Export Google Sheet as CSV
2. In Airtable: Add table → Import → CSV
3. Map columns to field types
4. Set "internal_sku" as primary field

---

#### Table 2: Vendors

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| vendor_id | Single line text (Primary) | e.g., "linde", "matheson" |
| vendor_name | Single line text | Full company name |
| email_domains | Single line text | Comma-separated domains |
| po_format_type | Single select | simple / complex |
| template_version | Single line text | e.g., "1.0.0" |
| total_pos | Count | Linked from Processed_POs |
| notes | Long text | Any notes |

**Initial Data:**
```
vendor_id | vendor_name | email_domains | po_format_type
powerweld | Powerweld Inc. | powerweldinc.com | simple
linde | Linde Gas & Equipment Inc. | linde.com | complex
matheson | Matheson Tri-Gas Inc. | mathesongas.com | complex
skd_supply | SKD Supply LLC | | simple
```

---

#### Table 3: Vendor_Mappings (THE CRITICAL TABLE)

This links vendor part numbers to your products.

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| id | Auto number (Primary) | Auto-generated |
| vendor | Link to Vendors | Which vendor uses this |
| vendor_part_number | Single line text | THEIR part number |
| mfg_part_number | Single line text | Manufacturer part (if different) |
| product | Link to Products | YOUR product |
| confidence | Number (0-100) | Match confidence |
| source | Single select | manual / extracted / verified |
| times_seen | Number | How often extracted |
| last_seen | Date | Last extraction date |
| verified | Checkbox | Human verified? |
| notes | Long text | Any notes |

---

#### Table 4: Review_Queue (Operators Work Here)

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| id | Auto number (Primary) | Auto-generated |
| po_number | Single line text | PO number |
| vendor | Link to Vendors | Which vendor |
| po_date | Date | Date on PO |
| extraction_confidence | Number | AI confidence (0-100) |
| status | Single select | pending / approved / corrected / rejected |
| line_items | Long text | Extracted data (JSON) |
| total_amount | Currency | PO total |
| issues | Long text | Validation issues |
| reviewer | Collaborator | Who reviewed |
| correction_notes | Long text | What was wrong (FEEDBACK) |
| pdf_attachment | Attachment | Original PDF |
| created_at | Created time | Auto |
| reviewed_at | Last modified time | Auto |

**Status Options:**
- `pending` - Needs review (Yellow)
- `approved` - Verified correct (Green)
- `corrected` - Fixed by operator (Blue)
- `rejected` - Invalid/duplicate (Red)

---

#### Table 5: Processed_POs (Completed Orders)

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| id | Auto number (Primary) | Auto-generated |
| po_number | Single line text | PO number |
| vendor | Link to Vendors | Which vendor |
| po_date | Date | Date on PO |
| total_lines | Number | Line item count |
| matched_lines | Number | Successfully matched |
| match_rate | Percent | % matched |
| total_amount | Currency | PO total |
| status | Single select | fully_matched / partial_match |
| processed_at | Created time | Auto |
| exported | Checkbox | Sent to ERP? |
| line_items | Long text | Final data (JSON) |

---

#### Table 6: Extraction_Log (Audit Trail)

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| id | Auto number (Primary) | Auto-generated |
| po_number | Single line text | PO number |
| vendor | Link to Vendors | Which vendor |
| extraction_confidence | Number | AI confidence |
| processing_time_ms | Number | How long it took |
| api_cost | Currency | Claude API cost |
| success | Checkbox | Extraction succeeded? |
| error_message | Long text | If failed |
| created_at | Created time | Auto |

---

## Phase 2: Airtable Views & Forms (Day 2-3)

### Step 2.1: Create Views for Review_Queue

**View 1: "Pending Review" (Default)**
- Filter: Status = "pending"
- Sort: Created (newest first)
- Group by: Vendor

**View 2: "Needs Correction"**
- Filter: Extraction Confidence < 70
- Highlight: Red background

**View 3: "My Reviews"**
- Filter: Reviewer = Current user
- Sort: Reviewed (newest first)

**View 4: "All Items"**
- No filter (admin view)

### Step 2.2: Create PO Upload Form

In Airtable:
1. Go to Review_Queue table
2. Click "Forms" in left sidebar
3. Create new form: "Upload PO for Processing"

**Form Fields:**
- Vendor (dropdown) - Optional, AI will detect
- PO Number (text) - Optional, AI will extract
- PDF Attachment (file upload) - Required
- Notes (text) - Optional

**Form Settings:**
- Show Airtable branding: Off
- Redirect after submit: Custom message "PO received! Check Review Queue for results."

---

## Phase 3: n8n Integration (Day 3-4)

### Step 3.1: Create Airtable API Credentials in n8n

1. In Airtable: Account → Developer hub → Personal access tokens
2. Create token with scopes: `data.records:read`, `data.records:write`
3. In n8n: Add Airtable credential with token

### Step 3.2: Updated n8n Workflow

The workflow changes slightly for Airtable:

```
[Webhook/Form Trigger]
        │
        v
[Create Record in Review_Queue] ← Status: "processing"
        │
        v
[Vendor Detection]
        │
        v
[Claude Vision Extraction]
        │
        v
[Part Number Matching] ← Query Vendor_Mappings table
        │
        v
[Update Review_Queue Record] ← Add extracted data + confidence
        │
        ├──► High Confidence
        │         │
        │         v
        │    [Create Processed_PO record]
        │    [Update status: "approved"]
        │
        └──► Low/Medium Confidence
                  │
                  v
             [Update status: "pending"]
             [Operator reviews in Airtable]
```

### Step 3.3: Key n8n Nodes

**Airtable: Create Record**
```
Table: Review_Queue
Fields:
- po_number: (from extraction)
- vendor: (link to Vendors table)
- extraction_confidence: (from AI)
- status: "pending"
- line_items: (JSON string)
- pdf_attachment: (file URL)
```

**Airtable: Search Records** (for matching)
```
Table: Vendor_Mappings
Filter: vendor_part_number = {extracted_part}
Return: product link (your internal SKU)
```

**Airtable: Update Record** (after processing)
```
Table: Review_Queue
Record ID: (from create step)
Fields:
- extraction_confidence: (final score)
- status: (pending/approved based on confidence)
- line_items: (full extraction JSON)
```

---

## Phase 4: Process Your 20 POs (Day 4-6)

### Step 4.1: Collect POs

Please share the 20 POs. I'll process each one:
1. Extract data using Claude Vision
2. Show you the results
3. You confirm/correct
4. Build vendor mappings as we go

### Step 4.2: Build Vendor Mappings

As we process POs, we'll populate the Vendor_Mappings table:

| vendor | vendor_part_number | mfg_part_number | product | source |
|--------|-------------------|-----------------|---------|--------|
| linde | CMUC315-3545 | C315-3545 | [Link to your product] | manual |
| matheson | CMD 4636001 | 046-36-001 | [Link to your product] | manual |
| powerweld | B422 | | [Link to your product] | manual |
| skd_supply | CMI-B5662 | B5662 | [Link to your product] | manual |

### Step 4.3: Identify Your Products

From the sample POs, I found these CM Industries (your) products:
- B422 - Trigger 600 V
- C315-3545 - Gun 300A 15FT TWECO DP
- 046-36-001 - CM Head Insulator
- B5662 - Trigger Assy

**You need to tell me:** What are YOUR internal SKUs for these products?

---

## Phase 5: Operator Training (Day 7)

### Training Agenda (30-60 minutes)

1. **Overview** (5 min)
   - What the system does
   - What operators need to do

2. **Uploading POs** (10 min)
   - Using the upload form
   - Email forwarding (if configured)

3. **Reviewing Extractions** (15 min)
   - Finding pending items
   - Understanding confidence scores
   - Approving correct extractions
   - Correcting errors

4. **Adding New Mappings** (10 min)
   - When a part isn't found
   - How to add to Vendor_Mappings

5. **Giving Feedback** (5 min)
   - Using correction_notes field
   - What information helps improve AI

6. **Q&A** (10 min)

---

## Phase 6: Handoff (Day 8+)

### Handoff Checklist

- [ ] Operators have Airtable accounts
- [ ] Operators can access the base
- [ ] Upload form is working
- [ ] n8n workflow is running
- [ ] Product library is imported
- [ ] Initial vendor mappings are populated
- [ ] Operators completed training
- [ ] Operators processed 5+ POs supervised
- [ ] Documentation provided
- [ ] Admin contact for issues established

---

## Cost Summary

| Item | Monthly Cost |
|------|--------------|
| Airtable Team (3 users) | $60 |
| Claude Vision API (~50 POs/day) | $50-150 |
| n8n (self-hosted or cloud) | $0-50 |
| **Total** | **$110-260/month** |

---

## Next Immediate Steps

1. **You:** Create Airtable account (use free trial first)
2. **You:** Share your 20 POs (folder link or upload)
3. **You:** Tell me your internal SKUs for the 4 CM Industries products found
4. **Me:** Create the Airtable base template you can duplicate
5. **Me:** Process your POs and build the mappings with you

Ready to proceed?
