/**
 * Auto-mapping of CSV column headers to product fields.
 *
 * Each target field has a list of common aliases (lowercase, stripped of
 * special characters). The first matching alias wins.
 */

interface FieldAliases {
  field: string;
  label: string;
  required: boolean;
  aliases: string[];
}

export const PRODUCT_FIELD_ALIASES: FieldAliases[] = [
  {
    field: 'internal_sku',
    label: 'SKU / Part Number',
    required: true,
    aliases: [
      'sku',
      'internal_sku',
      'internal sku',
      'part number',
      'part_number',
      'part #',
      'part#',
      'partnumber',
      'partno',
      'part no',
      'item number',
      'item_number',
      'item #',
      'item#',
      'itemno',
      'item no',
      'product code',
      'product_code',
      'productcode',
      'item code',
      'item_code',
      'stock number',
      'stock_number',
      'stockno',
      'catalog number',
      'catalog_number',
      'catalog #',
      'id',
      'product id',
      'product_id',
    ],
  },
  {
    field: 'description',
    label: 'Description',
    required: false,
    aliases: [
      'description',
      'desc',
      'product name',
      'product_name',
      'productname',
      'name',
      'item description',
      'item_description',
      'product description',
      'product_description',
      'item name',
      'item_name',
      'title',
      'product title',
    ],
  },
  {
    field: 'category',
    label: 'Category',
    required: false,
    aliases: [
      'category',
      'cat',
      'type',
      'product type',
      'product_type',
      'group',
      'product_category',
      'product category',
      'class',
      'classification',
      'department',
      'dept',
    ],
  },
  {
    field: 'brand',
    label: 'Brand / Manufacturer',
    required: false,
    aliases: [
      'brand',
      'brand name',
      'brand_name',
      'manufacturer',
      'mfg',
      'mfr',
      'maker',
      'vendor',
      'supplier',
      'company',
    ],
  },
  {
    field: 'unit_price',
    label: 'Unit Price',
    required: false,
    aliases: [
      'price',
      'unit price',
      'unit_price',
      'unitprice',
      'cost',
      'unit cost',
      'unit_cost',
      'sell price',
      'sell_price',
      'list price',
      'list_price',
      'retail price',
      'retail_price',
      'msrp',
      'amount',
    ],
  },
];

/**
 * Normalize a header string for comparison: lowercase, trim, strip special chars.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\-./\\]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Auto-map CSV headers to product fields.
 *
 * Returns a record where keys are field names and values are the CSV column
 * index (0-based), or null if no match found.
 */
export function autoMapColumns(
  headers: string[],
): Record<string, number | null> {
  const normalizedHeaders = headers.map(normalizeHeader);
  const usedIndices = new Set<number>();
  const mapping: Record<string, number | null> = {};

  for (const { field, aliases } of PRODUCT_FIELD_ALIASES) {
    let matched: number | null = null;

    for (const alias of aliases) {
      const idx = normalizedHeaders.findIndex(
        (h, i) => !usedIndices.has(i) && h === alias,
      );
      if (idx !== -1) {
        matched = idx;
        break;
      }
    }

    // Fallback: partial match (header contains alias or alias contains header)
    if (matched === null) {
      for (const alias of aliases) {
        const idx = normalizedHeaders.findIndex(
          (h, i) =>
            !usedIndices.has(i) && (h.includes(alias) || alias.includes(h)),
        );
        if (idx !== -1) {
          matched = idx;
          break;
        }
      }
    }

    mapping[field] = matched;
    if (matched !== null) {
      usedIndices.add(matched);
    }
  }

  return mapping;
}

/**
 * Parse a CSV string into headers and rows.
 * Handles quoted fields containing commas and newlines.
 */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c !== '')) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else {
        currentField += char;
      }
    }
  }

  // Handle last field/row
  currentRow.push(currentField.trim());
  if (currentRow.some((c) => c !== '')) {
    lines.push(currentRow);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: lines[0],
    rows: lines.slice(1),
  };
}
