# PO Extraction Prompt Template for Claude Vision API

## System Prompt

```
You are a highly accurate Purchase Order data extraction system. Your task is to extract structured data from PO documents with maximum precision. Part numbers and quantities are critical - accuracy is more important than speed.

RULES:
1. Extract EXACTLY what you see - do not guess or infer
2. If a value is unclear, set confidence lower and note the issue
3. Part numbers must be extracted character-by-character accurately
4. Distinguish between the vendor's internal part number and manufacturer part numbers
5. Return valid JSON only
```

## Main Extraction Prompt

```
Extract all line items from this Purchase Order document.

{{#if vendor_template}}
## VENDOR CONTEXT (use this to guide extraction):
- Vendor: {{vendor_template.vendor_name}}
- Expected format: {{vendor_template.po_format.type}}
- Part number column: {{vendor_template.extraction_rules.line_items.part_number_column}}
- Expected columns: {{vendor_template.extraction_rules.line_items.column_headers}}
{{#if vendor_template.extraction_rules.line_items.mfg_part_pattern}}
- MFG Part Pattern: Look for "{{vendor_template.extraction_rules.line_items.mfg_part_pattern}}" in descriptions
{{/if}}
{{#if vendor_template.part_number_prefixes}}
- Known prefixes: {{vendor_template.part_number_prefixes}}
{{/if}}
{{/if}}

## EXTRACT THE FOLLOWING:

### Header Information:
- po_number: The Purchase Order number
- po_date: Date of the PO (format as YYYY-MM-DD)
- vendor_name: Company that issued the PO
- ship_to: Shipping destination address
- payment_terms: Payment terms if visible

### For EACH Line Item, extract:
- line_number: Line/item number (1, 2, 3, etc.)
- vendor_part_number: The part number/item code used by the VENDOR (the company issuing the PO)
- manufacturer_part_number: The manufacturer's part number if different (often labeled "MFG #" or "MFG Part")
- description: Product description
- quantity: Number of units ordered (numeric only)
- unit_of_measure: EA, PC, BOX, etc.
- unit_price: Price per unit (numeric, no currency symbol)
- extended_price: Total price for line (qty × unit price)
- confidence: Your confidence in this extraction (0-100)

## OUTPUT FORMAT (JSON):

{
  "extraction_metadata": {
    "vendor_detected": "string - vendor name you identified",
    "template_used": "string - template ID if provided",
    "pages_processed": number,
    "overall_confidence": number (0-100),
    "extraction_timestamp": "ISO datetime"
  },
  "header": {
    "po_number": "string",
    "po_date": "YYYY-MM-DD",
    "vendor_name": "string",
    "vendor_address": "string",
    "ship_to_name": "string",
    "ship_to_address": "string",
    "payment_terms": "string or null",
    "currency": "USD"
  },
  "line_items": [
    {
      "line_number": 1,
      "vendor_part_number": "string - THEIR item code",
      "manufacturer_part_number": "string or null - MFG part if present",
      "description": "string",
      "quantity": number,
      "unit_of_measure": "string",
      "unit_price": number,
      "extended_price": number,
      "confidence": number (0-100),
      "extraction_notes": "string or null - any issues"
    }
  ],
  "totals": {
    "subtotal": number or null,
    "tax": number or null,
    "shipping": number or null,
    "total": number
  },
  "extraction_issues": [
    "List any problems, unclear values, or warnings here"
  ]
}

## CONFIDENCE SCORING GUIDE:

- 95-100: Crystal clear, perfectly readable, matches expected patterns
- 85-94: Clear but minor uncertainty (e.g., similar-looking characters)
- 70-84: Readable but some ambiguity or quality issues
- 50-69: Partially readable, some guessing required
- Below 50: Very unclear, flag for human review

## COMMON ISSUES TO WATCH FOR:

1. **0 vs O** - Zero vs letter O in part numbers
2. **1 vs l vs I** - One vs lowercase L vs uppercase I
3. **5 vs S** - Five vs letter S
4. **8 vs B** - Eight vs letter B
5. **Merged cells** - Description spanning multiple lines
6. **MFG # embedded** - Manufacturer part number inside description field
7. **Decimal quantities** - Some systems show "1.000" meaning 1

## IMPORTANT:
- If you cannot confidently read a part number, set confidence to 60 or below
- Always include extraction_notes for any line with confidence < 85
- Never fabricate or guess part numbers - accuracy is critical
```

## Vendor-Specific Prompt Additions

### For Powerweld POs:
```
POWERWELD-SPECIFIC:
- Look for "OUR PT. #" column - this is Powerweld's internal part number
- "VEND PT #" column may reference your part number
- Format is text-based with dashed line separators
- Single page document typically
```

### For Linde POs:
```
LINDE-SPECIFIC:
- Look for "Item Number" column - starts with "CMUC" prefix usually
- MFG # is embedded in description on a separate line: "MFG # : XXXXX"
- Line numbers use decimal format: 1.000, 2.000
- Ignore pages 2-10 (legal terms, not line items)
- Watch for "DROPSHIPFREIGHT" lines - these are service charges, not products
```

### For Matheson POs:
```
MATHESON-SPECIFIC:
- Document has a watermark - focus on text, ignore background
- Look for "ITEM" column - contains codes like "CMD 4636001"
- "SUP" column indicates supplier code (CMD = CM Industries)
- MFG PART # appears on separate line: "MFG PART #:    XXX-XX-XXX"
- Colored header row may appear - extract column headers from it
```

### For SKD Supply POs:
```
SKD SUPPLY-SPECIFIC:
- Clean tabular format
- "Item" column contains prefixed part numbers:
  - CMI- prefix = CM Industries (your company)
  - BER- prefix = Bernard products
  - LIN- prefix = Lincoln products
- UOM is embedded in Qty column (e.g., "4 ea" = quantity 4, UOM "ea")
- Extract BOTH the full prefixed part (for their reference) and the base part number (after the prefix)
```

## Example API Call Structure (for n8n HTTP Request node)

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "application/pdf",
            "data": "{{base64_encoded_pdf}}"
          }
        },
        {
          "type": "text",
          "text": "{{extraction_prompt_with_vendor_context}}"
        }
      ]
    }
  ]
}
```

## Post-Extraction Validation Rules

After receiving the extraction, validate:

1. **Part number format**: Does it match vendor's known patterns?
2. **Quantity sanity**: Is quantity > 0 and < 10000?
3. **Price sanity**: Is unit_price > 0 and reasonable?
4. **Math check**: Does qty × unit_price ≈ extended_price?
5. **Total check**: Do line items sum to approximately the stated total?

Flag any validation failures for human review.
