# Google Sheets Database Setup Guide

## Overview

This guide helps you set up the Google Sheets database for the PO Processing System. You'll need to create one Google Spreadsheet with multiple sheets (tabs).

## Step 1: Create the Spreadsheet

1. Go to Google Sheets (sheets.google.com)
2. Create a new spreadsheet
3. Name it: **"PO Processing Database"**
4. Note the spreadsheet ID from the URL (the long string between /d/ and /edit)

## Step 2: Create the Required Sheets (Tabs)

Create the following sheets in your spreadsheet:

---

### Sheet 1: "Products" (Your Internal Product Database)

**Columns:**

| Column | Header | Type | Description | Example |
|--------|--------|------|-------------|---------|
| A | internal_sku | Text | Your unique product identifier | TRIG-600V |
| B | description | Text | Product description | Trigger 600 Volt |
| C | category | Text | Product category | Triggers |
| D | brand | Text | Brand/manufacturer | CM Industries |
| E | unit_price | Number | Standard unit price | 42.64 |
| F | is_active | Checkbox | Is product currently sold? | TRUE |
| G | created_at | Date | When added | 2026-01-25 |
| H | updated_at | Date | Last update | 2026-01-25 |
| I | notes | Text | Any additional notes | |

**Sample Data to Add:**
```
internal_sku | description | category | brand | unit_price | is_active
TRIG-600V | Trigger 600 Volt | Triggers | CM Industries | 42.64 | TRUE
GUN-300A-15 | Gun 300A 15FT TWECO DP | Guns | CM Industries | 155.70 | TRUE
HEAD-INS-046 | Head Insulator 046-36-001 | Insulators | CM Industries | 3.28 | TRUE
```

---

### Sheet 2: "Vendor_Mappings" (Part Number Crosswalk)

This is the CRITICAL sheet that maps vendor part numbers to your internal SKUs.

**Columns:**

| Column | Header | Type | Description | Example |
|--------|--------|------|-------------|---------|
| A | id | Number | Auto-increment ID | 1 |
| B | vendor_id | Text | Vendor identifier | linde |
| C | vendor_part_number | Text | THEIR part number | CMUC315-3545 |
| D | manufacturer_part | Text | MFG part if different | C315-3545 |
| E | internal_sku | Text | YOUR part number | GUN-300A-15 |
| F | confidence | Number | Match confidence (0-100) | 100 |
| G | source | Text | How this mapping was created | manual |
| H | times_seen | Number | How many times extracted | 5 |
| I | last_seen_at | Date | Last time this appeared | 2026-01-25 |
| J | verified | Checkbox | Human verified? | TRUE |
| K | notes | Text | Any notes | |

**Source values:** manual, extracted, verified, auto

---

### Sheet 3: "Vendors" (Company Information)

**Columns:**

| Column | Header | Type | Description | Example |
|--------|--------|------|-------------|---------|
| A | vendor_id | Text | Unique vendor identifier | linde |
| B | vendor_name | Text | Full company name | Linde Gas & Equipment Inc. |
| C | email_domains | Text | Email domains (comma-separated) | linde.com |
| D | po_format_type | Text | simple or complex | complex |
| E | template_version | Text | Current template version | 1.0.0 |
| F | total_pos_processed | Number | Count of POs processed | 0 |
| G | avg_extraction_confidence | Number | Average confidence score | 0 |
| H | last_po_date | Date | Last PO received | |
| I | notes | Text | Any notes | |

**Initial Data:**
```
vendor_id | vendor_name | email_domains | po_format_type | template_version
powerweld | Powerweld Inc. | powerweldinc.com | simple | 1.0.0
linde | Linde Gas & Equipment Inc. | linde.com | complex | 1.0.0
matheson | Matheson Tri-Gas Inc. | mathesongas.com | complex | 1.0.0
skd_supply | SKD Supply LLC | | simple | 1.0.0
```

---

### Sheet 4: "Review_Queue" (Human Review Required)

**Columns:**

| Column | Header | Type | Description | Example |
|--------|--------|------|-------------|---------|
| A | id | Number | Auto-increment ID | 1 |
| B | po_number | Text | Purchase order number | 77666645 |
| C | vendor_id | Text | Vendor identifier | linde |
| D | confidence | Number | Extraction confidence | 72 |
| E | issues | Text | Validation issues found | Line 2: Missing part number |
| F | line_items_json | Text | Full extracted data (JSON) | [{"line":1,...}] |
| G | status | Text | Review status | pending_review |
| H | reviewer | Text | Who reviewed | |
| I | review_notes | Text | Reviewer's notes | |
| J | created_at | DateTime | When added to queue | |
| K | reviewed_at | DateTime | When reviewed | |

**Status values:** pending_review, approved, corrected, rejected

---

### Sheet 5: "Processed_POs" (Successfully Processed)

**Columns:**

| Column | Header | Type | Description | Example |
|--------|--------|------|-------------|---------|
| A | id | Number | Auto-increment ID | 1 |
| B | po_number | Text | Purchase order number | V322045 |
| C | vendor_id | Text | Vendor identifier | powerweld |
| D | po_date | Date | Date on the PO | 2025-08-05 |
| E | total_lines | Number | Number of line items | 1 |
| F | matched_lines | Number | Lines successfully matched | 1 |
| G | match_rate | Number | Percentage matched | 100 |
| H | total_amount | Number | PO total value | 341.12 |
| I | status | Text | Processing status | fully_matched |
| J | extraction_confidence | Number | Vision AI confidence | 95 |
| K | processed_at | DateTime | When processed | |
| L | exported | Checkbox | Exported to ERP? | FALSE |
| M | export_date | DateTime | When exported | |

**Status values:** fully_matched, partial_match, manual_review

---

### Sheet 6: "Unknown_Vendors" (New Vendors Needing Templates)

**Columns:**

| Column | Header | Type | Description | Example |
|--------|--------|------|-------------|---------|
| A | id | Number | Auto-increment ID | 1 |
| B | file_name | Text | Original file name | newvendor_po.pdf |
| C | sender_email | Text | Email sender | orders@newcompany.com |
| D | received_at | DateTime | When received | |
| E | status | Text | Current status | needs_template |
| F | assigned_vendor_id | Text | After template created | |
| G | notes | Text | Any notes | |

**Status values:** needs_template, template_created, processed

---

### Sheet 7: "Extraction_Log" (Audit Trail)

**Columns:**

| Column | Header | Type | Description | Example |
|--------|--------|------|-------------|---------|
| A | id | Number | Auto-increment ID | 1 |
| B | po_number | Text | Purchase order number | 77666645 |
| C | vendor_id | Text | Vendor identifier | linde |
| D | extraction_confidence | Number | Overall confidence | 92 |
| E | line_count | Number | Lines extracted | 2 |
| F | matched_count | Number | Lines matched | 2 |
| G | unmatched_count | Number | Lines unmatched | 0 |
| H | validation_issues | Text | Any issues found | |
| I | processing_time_ms | Number | How long it took | 3500 |
| J | api_cost | Number | Vision API cost | 0.02 |
| K | processed_at | DateTime | Timestamp | |

---

## Step 3: Set Up Data Validation

### In Vendor_Mappings sheet:
- Column B (vendor_id): Data validation → List from Vendors!A:A
- Column F (confidence): Data validation → Number between 0 and 100
- Column G (source): Data validation → List: manual, extracted, verified, auto

### In Review_Queue sheet:
- Column G (status): Data validation → List: pending_review, approved, corrected, rejected

### In Processed_POs sheet:
- Column I (status): Data validation → List: fully_matched, partial_match, manual_review

---

## Step 4: Create Named Ranges (Optional but Recommended)

For easier formula references:
- `Products` → Products!A:I
- `VendorMappings` → Vendor_Mappings!A:K
- `Vendors` → Vendors!A:I

---

## Step 5: Connect to n8n

1. In n8n, add a Google Sheets credential
2. Authorize access to your Google account
3. In the workflow, replace `YOUR_GOOGLE_SHEET_ID` with your actual spreadsheet ID

---

## Usage Notes

### Adding New Vendor Mappings

When a new part number is extracted and matched, the system will:
1. Check if mapping exists in Vendor_Mappings
2. If not found, add to Review_Queue for human verification
3. Human creates mapping in Vendor_Mappings
4. Next time, auto-match occurs

### Reviewing Extractions

1. Check Review_Queue sheet for pending items
2. Review the extracted data in line_items_json column
3. Update status to 'approved' or 'corrected'
4. If corrected, add the correct mapping to Vendor_Mappings

### Monitoring System Health

Use Extraction_Log to track:
- Average confidence scores over time
- Most problematic vendors (low confidence)
- API costs
- Processing volume
