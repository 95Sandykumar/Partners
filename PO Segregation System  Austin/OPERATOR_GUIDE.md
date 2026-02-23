# PO Processing System - Operator Guide

## For Non-Technical Staff

This guide explains how to use the PO Processing System without any technical knowledge.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HOW THE SYSTEM WORKS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   1. YOU UPLOAD A PO                                                    │
│      └─> Email or Web Form                                              │
│                                                                         │
│   2. SYSTEM EXTRACTS DATA                                               │
│      └─> AI reads the PDF, finds part numbers                           │
│                                                                         │
│   3. SYSTEM MATCHES PARTS                                               │
│      └─> Looks up vendor parts in our database                          │
│                                                                         │
│   4. YOU REVIEW (if needed)                                             │
│      └─> Check extractions, confirm or correct                          │
│                                                                         │
│   5. DATA GOES TO OUTPUT SHEET                                          │
│      └─> Ready for order processing                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Daily Tasks

### Task 1: Upload New POs

**Option A: Email Upload**
1. Forward PO emails to: `[configured email address]`
2. System processes automatically
3. Check the Review Queue for results

**Option B: Web Form Upload**
1. Go to: `[n8n form URL]`
2. Select the vendor (or let system detect)
3. Upload the PDF
4. Click Submit
5. Check the Review Queue for results

---

### Task 2: Review Extractions

Open the **Review Queue** sheet/table and look for items with status "pending_review"

| What You See | What To Do |
|--------------|------------|
| ✅ Green confidence (85%+) | Usually correct - quick verify |
| 🟡 Yellow confidence (60-84%) | Check carefully - may need correction |
| 🔴 Red confidence (<60%) | Needs manual review |

**For each item:**
1. Compare extracted data to the original PO
2. If correct: Change status to "Approved"
3. If wrong: Correct the data, change status to "Corrected"
4. Add any notes in the Notes column

---

### Task 3: Handle Unmatched Parts

When a part number doesn't match our database:

1. Check if it's a **typo** in our database
2. Check if it's a **new product** we sell
3. Check if it's a **competitor product** (Bernard, Lincoln, etc.)

**If it's our product but not in database:**
1. Go to the Vendor Mappings sheet
2. Add a new row:
   - Vendor ID: (which company sent it)
   - Vendor Part Number: (their code)
   - Internal SKU: (our code from product library)
   - Source: "manual"
   - Verified: Check the box

---

### Task 4: Give Feedback to Improve AI

When you correct an extraction, the system learns!

**In the Review Queue:**
- Use the "Correction Notes" column to explain what was wrong
- Examples:
  - "MFG part was in description, AI missed it"
  - "Quantity was on next line"
  - "New format from this vendor"

**System uses your corrections to:**
- Update vendor templates
- Improve extraction accuracy
- Reduce future errors

---

## Sheets/Tables You'll Use

### 1. Review Queue
Where new extractions wait for your approval

| Column | What It Means |
|--------|---------------|
| PO Number | The purchase order number |
| Vendor | Which company sent it |
| Confidence | How sure AI is (0-100%) |
| Status | pending_review / approved / corrected |
| Line Items | What was extracted (JSON) |
| Your Notes | Add comments here |

### 2. Vendor Mappings
The crosswalk between their part numbers and ours

| Column | What It Means |
|--------|---------------|
| Vendor Part | Their code (e.g., CMUC315-3545) |
| Our SKU | Our code (e.g., GUN-300A-15) |
| Vendor | Which company uses this code |
| Verified | Have you confirmed this mapping? |

### 3. Product Library
Your master list of ~2,000-3,000 products (existing sheet)

### 4. Processed POs
Successfully processed orders (view only)

### 5. Unknown Vendors
New companies we don't have templates for

---

## Common Scenarios

### Scenario: New Vendor
1. System puts PO in "Unknown Vendors" queue
2. You review the PO format
3. Tell the system admin to create a template
4. Once template exists, re-process the PO

### Scenario: Part Number Not Found
1. Check spelling in our database
2. If new product: Add to Product Library first
3. Then add the mapping in Vendor Mappings
4. Re-process the PO

### Scenario: Extraction Looks Wrong
1. Mark as "Corrected" in Review Queue
2. Enter the correct values
3. Add notes explaining what was wrong
4. System learns from your correction

### Scenario: Competitor Product (BER-, LIN- prefixes)
1. These are Bernard or Lincoln products, not ours
2. Mark as "Not Our Product" or create a separate category
3. May need manual handling for order fulfillment

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| PO stuck in queue | Check if vendor is known; may need new template |
| Wrong part number extracted | Correct it; add note; system will learn |
| Same error keeps happening | Report to admin for template update |
| Confidence always low | Vendor may have changed their PO format |
| Can't find our product | Check Product Library; may need to add it |

---

## Who To Contact

| Issue | Contact |
|-------|---------|
| System errors/crashes | [Admin name] |
| New vendor template needed | [Admin name] |
| Product not in database | [Inventory team] |
| Wrong pricing | [Sales team] |

---

## Quick Reference

**Status Values:**
- `pending_review` - Needs your attention
- `approved` - You verified it's correct
- `corrected` - You fixed errors
- `rejected` - Invalid/duplicate PO

**Confidence Levels:**
- 85%+ = High confidence (usually correct)
- 60-84% = Medium (check carefully)
- <60% = Low (needs manual review)

**Vendor Prefixes (SKD Supply):**
- `CMI-` = CM Industries (our products)
- `BER-` = Bernard (competitor)
- `LIN-` = Lincoln (competitor)
