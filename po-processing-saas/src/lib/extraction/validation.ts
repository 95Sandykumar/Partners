import type { ExtractionResult } from '@/types/extraction';
import type { ValidationIssue } from '@/types/extraction';

export function validateExtraction(
  extraction: ExtractionResult,
  vendorPatterns?: string[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate header
  if (!extraction.header.po_number) {
    issues.push({
      line_number: null,
      field: 'po_number',
      message: 'Missing PO number',
      severity: 'error',
    });
  }

  // Validate each line item
  for (const item of extraction.line_items) {
    // Part number check
    if (!item.vendor_part_number) {
      issues.push({
        line_number: item.line_number,
        field: 'vendor_part_number',
        message: 'Missing vendor part number',
        severity: 'error',
      });
    }

    // Quantity sanity
    if (item.quantity <= 0) {
      issues.push({
        line_number: item.line_number,
        field: 'quantity',
        message: `Invalid quantity: ${item.quantity}`,
        severity: 'error',
      });
    } else if (item.quantity > 10000) {
      issues.push({
        line_number: item.line_number,
        field: 'quantity',
        message: `Unusually high quantity: ${item.quantity}`,
        severity: 'warning',
      });
    }

    // Price sanity
    if (item.unit_price < 0) {
      issues.push({
        line_number: item.line_number,
        field: 'unit_price',
        message: `Negative unit price: ${item.unit_price}`,
        severity: 'error',
      });
    }

    // Math check: qty * unit_price ~= extended_price
    if (item.unit_price > 0 && item.quantity > 0) {
      const expected = item.quantity * item.unit_price;
      const diff = Math.abs(expected - item.extended_price);
      if (diff > 0.02) {
        issues.push({
          line_number: item.line_number,
          field: 'extended_price',
          message: `Price math mismatch: ${item.quantity} x ${item.unit_price} = ${expected.toFixed(2)}, got ${item.extended_price}`,
          severity: 'warning',
        });
      }
    }

    // Vendor pattern check
    if (vendorPatterns && item.vendor_part_number) {
      const matchesAnyPattern = vendorPatterns.some((pattern) => {
        try {
          return new RegExp(pattern).test(item.vendor_part_number);
        } catch {
          return false;
        }
      });
      if (!matchesAnyPattern) {
        issues.push({
          line_number: item.line_number,
          field: 'vendor_part_number',
          message: `Part number "${item.vendor_part_number}" doesn't match expected vendor patterns`,
          severity: 'info',
        });
      }
    }

    // Low confidence flagging
    if (item.confidence < 60) {
      issues.push({
        line_number: item.line_number,
        field: 'confidence',
        message: `Low confidence extraction (${item.confidence}%)`,
        severity: 'warning',
      });
    }
  }

  // Total check
  if (extraction.totals.total > 0 && extraction.line_items.length > 0) {
    const lineTotal = extraction.line_items.reduce(
      (sum, item) => sum + item.extended_price,
      0
    );
    const diff = Math.abs(lineTotal - extraction.totals.total);
    if (diff > 1) {
      issues.push({
        line_number: null,
        field: 'total',
        message: `Line items sum (${lineTotal.toFixed(2)}) doesn't match stated total (${extraction.totals.total})`,
        severity: 'warning',
      });
    }
  }

  return issues;
}
