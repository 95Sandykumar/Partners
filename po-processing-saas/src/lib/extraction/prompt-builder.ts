import type { VendorTemplate } from '@/types/database';

const SYSTEM_PROMPT = `You are a highly accurate Purchase Order data extraction system. Your task is to extract structured data from PO documents with maximum precision. Part numbers and quantities are critical - accuracy is more important than speed.

RULES:
1. Extract EXACTLY what you see - do not guess or infer
2. If a value is unclear, set confidence lower and note the issue
3. Part numbers must be extracted character-by-character accurately
4. Distinguish between the vendor's internal part number and manufacturer part numbers
5. Return valid JSON only`;

const VENDOR_SPECIFIC_ADDITIONS: Record<string, string> = {
  powerweld: `POWERWELD-SPECIFIC:
- Look for "OUR PT. #" column - this is Powerweld's internal part number
- "VEND PT #" column may reference your part number
- Format is text-based with dashed line separators
- Single page document typically`,

  linde: `LINDE-SPECIFIC:
- Look for "Item Number" column - starts with "CMUC" prefix usually
- MFG # is embedded in description on a separate line: "MFG # : XXXXX"
- Line numbers use decimal format: 1.000, 2.000
- Ignore pages 2-10 (legal terms, not line items)
- Watch for "DROPSHIPFREIGHT" lines - these are service charges, not products`,

  matheson: `MATHESON-SPECIFIC:
- Document has a watermark - focus on text, ignore background
- Look for "ITEM" column - contains codes like "CMD 4636001"
- "SUP" column indicates supplier code (CMD = CM Industries)
- MFG PART # appears on separate line: "MFG PART #:    XXX-XX-XXX"
- Colored header row may appear - extract column headers from it`,

  skd_supply: `SKD SUPPLY-SPECIFIC:
- Clean tabular format
- "Item" column contains prefixed part numbers:
  - CMI- prefix = CM Industries (your company)
  - BER- prefix = Bernard products
  - LIN- prefix = Lincoln products
- UOM is embedded in Qty column (e.g., "4 ea" = quantity 4, UOM "ea")
- Extract BOTH the full prefixed part (for their reference) and the base part number (after the prefix)`,
};

export function buildExtractionPrompt(
  vendorTemplate: VendorTemplate | null,
  vendorId?: string
): { systemPrompt: string; userPrompt: string } {
  const templateData = vendorTemplate?.template_data as Record<string, unknown> | undefined;

  let vendorContext = '';
  if (templateData) {
    const extractionRules = templateData.extraction_rules as Record<string, unknown> | undefined;
    const lineItems = extractionRules?.line_items as Record<string, unknown> | undefined;

    vendorContext = `
## VENDOR CONTEXT (use this to guide extraction):
- Vendor: ${templateData.vendor_name || 'Unknown'}
- Expected format: ${(templateData.po_format as Record<string, unknown>)?.type || 'unknown'}
- Part number column: ${lineItems?.part_number_column || 'unknown'}
- Expected columns: ${JSON.stringify(lineItems?.column_headers || [])}`;

    if (lineItems?.mfg_part_pattern) {
      vendorContext += `\n- MFG Part Pattern: Look for "${lineItems.mfg_part_pattern}" in descriptions`;
    }

    if (templateData.part_number_prefixes) {
      vendorContext += `\n- Known prefixes: ${JSON.stringify(templateData.part_number_prefixes)}`;
    }
  }

  // Add vendor-specific instructions
  const vendorSlug = vendorId || (templateData?.vendor_id as string);
  const specificInstructions = vendorSlug ? VENDOR_SPECIFIC_ADDITIONS[vendorSlug] || '' : '';

  const userPrompt = `Extract all line items from this Purchase Order document.
${vendorContext}

${specificInstructions ? `## VENDOR-SPECIFIC INSTRUCTIONS:\n${specificInstructions}\n` : ''}
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
- extended_price: Total price for line (qty x unit price)
- confidence: Your confidence in this extraction (0-100)

## OUTPUT FORMAT (JSON only, no markdown):
{
  "extraction_metadata": {
    "vendor_detected": "string",
    "template_used": "string or null",
    "pages_processed": 1,
    "overall_confidence": 85,
    "extraction_timestamp": "ISO datetime"
  },
  "header": {
    "po_number": "string",
    "po_date": "YYYY-MM-DD",
    "vendor_name": "string",
    "vendor_address": "string or null",
    "ship_to_name": "string or null",
    "ship_to_address": "string or null",
    "payment_terms": "string or null",
    "currency": "USD"
  },
  "line_items": [
    {
      "line_number": 1,
      "vendor_part_number": "string",
      "manufacturer_part_number": "string or null",
      "description": "string",
      "quantity": 1,
      "unit_of_measure": "EA",
      "unit_price": 0.00,
      "extended_price": 0.00,
      "confidence": 90,
      "extraction_notes": "string or null"
    }
  ],
  "totals": {
    "subtotal": null,
    "tax": null,
    "shipping": null,
    "total": 0.00
  },
  "extraction_issues": []
}

## CONFIDENCE SCORING:
- 95-100: Crystal clear, perfectly readable, matches expected patterns
- 85-94: Clear but minor uncertainty
- 70-84: Readable but some ambiguity
- 50-69: Partially readable, some guessing
- Below 50: Very unclear, flag for review

## IMPORTANT:
- If you cannot confidently read a part number, set confidence to 60 or below
- Always include extraction_notes for any line with confidence < 85
- Never fabricate or guess part numbers - accuracy is critical
- Watch for 0 vs O, 1 vs l vs I, 5 vs S, 8 vs B in part numbers`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
