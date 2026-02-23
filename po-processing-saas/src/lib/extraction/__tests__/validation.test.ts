import { describe, it, expect } from 'vitest';
import { validateExtraction } from '../validation';
import type { ExtractionResult } from '@/types/extraction';

function makeExtraction(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    extraction_metadata: {
      vendor_detected: 'test',
      template_used: null,
      pages_processed: 1,
      overall_confidence: 90,
      extraction_timestamp: new Date().toISOString(),
    },
    header: {
      po_number: 'PO-12345',
      po_date: '2026-01-15',
      vendor_name: 'Test Vendor',
      vendor_address: null,
      ship_to_name: 'Test Ship',
      ship_to_address: '123 Main St',
      payment_terms: null,
      currency: 'USD',
    },
    line_items: [
      {
        line_number: 1,
        vendor_part_number: 'B422',
        manufacturer_part_number: null,
        description: 'Trigger 600 V',
        quantity: 10,
        unit_price: 45.0,
        extended_price: 450.0,
        unit_of_measure: 'EA',
        confidence: 90,
        extraction_notes: null,
      },
    ],
    totals: {
      subtotal: 450.0,
      tax: 0,
      shipping: 0,
      total: 450.0,
    },
    extraction_issues: [],
    ...overrides,
  };
}

describe('validateExtraction', () => {
  it('returns no issues for valid extraction', () => {
    const issues = validateExtraction(makeExtraction());
    expect(issues).toHaveLength(0);
  });

  it('flags missing PO number', () => {
    const extraction = makeExtraction({
      header: { po_number: '', po_date: '', vendor_name: '', vendor_address: null, ship_to_name: null, ship_to_address: null, payment_terms: null, currency: 'USD' },
    });
    const issues = validateExtraction(extraction);
    expect(issues.some((i) => i.field === 'po_number')).toBe(true);
  });

  it('flags missing vendor part number', () => {
    const extraction = makeExtraction({
      line_items: [
        {
          line_number: 1,
          vendor_part_number: '',
          manufacturer_part_number: null,
          description: 'Test',
          quantity: 1,
          unit_price: 10,
          extended_price: 10,
          unit_of_measure: 'EA',
          confidence: 80,
          extraction_notes: null,
        },
      ],
    });
    const issues = validateExtraction(extraction);
    expect(issues.some((i) => i.field === 'vendor_part_number')).toBe(true);
  });

  it('flags invalid quantity (zero)', () => {
    const extraction = makeExtraction({
      line_items: [
        {
          line_number: 1,
          vendor_part_number: 'B422',
          manufacturer_part_number: null,
          description: 'Test',
          quantity: 0,
          unit_price: 10,
          extended_price: 0,
          unit_of_measure: 'EA',
          confidence: 80,
          extraction_notes: null,
        },
      ],
    });
    const issues = validateExtraction(extraction);
    expect(issues.some((i) => i.field === 'quantity' && i.severity === 'error')).toBe(true);
  });

  it('warns on unusually high quantity', () => {
    const extraction = makeExtraction({
      line_items: [
        {
          line_number: 1,
          vendor_part_number: 'B422',
          manufacturer_part_number: null,
          description: 'Test',
          quantity: 50000,
          unit_price: 1,
          extended_price: 50000,
          unit_of_measure: 'EA',
          confidence: 80,
          extraction_notes: null,
        },
      ],
    });
    const issues = validateExtraction(extraction);
    expect(issues.some((i) => i.field === 'quantity' && i.severity === 'warning')).toBe(true);
  });

  it('flags negative unit price', () => {
    const extraction = makeExtraction({
      line_items: [
        {
          line_number: 1,
          vendor_part_number: 'B422',
          manufacturer_part_number: null,
          description: 'Test',
          quantity: 1,
          unit_price: -5,
          extended_price: -5,
          unit_of_measure: 'EA',
          confidence: 80,
          extraction_notes: null,
        },
      ],
    });
    const issues = validateExtraction(extraction);
    expect(issues.some((i) => i.field === 'unit_price')).toBe(true);
  });

  it('warns on price math mismatch', () => {
    const extraction = makeExtraction({
      line_items: [
        {
          line_number: 1,
          vendor_part_number: 'B422',
          manufacturer_part_number: null,
          description: 'Test',
          quantity: 10,
          unit_price: 45,
          extended_price: 500, // should be 450
          unit_of_measure: 'EA',
          confidence: 80,
          extraction_notes: null,
        },
      ],
    });
    const issues = validateExtraction(extraction);
    expect(issues.some((i) => i.field === 'extended_price')).toBe(true);
  });

  it('warns on total mismatch', () => {
    const extraction = makeExtraction({
      totals: { subtotal: 450, tax: 0, shipping: 0, total: 999 },
    });
    const issues = validateExtraction(extraction);
    expect(issues.some((i) => i.field === 'total')).toBe(true);
  });

  it('flags low confidence extraction', () => {
    const extraction = makeExtraction({
      line_items: [
        {
          line_number: 1,
          vendor_part_number: 'B422',
          manufacturer_part_number: null,
          description: 'Test',
          quantity: 1,
          unit_price: 10,
          extended_price: 10,
          unit_of_measure: 'EA',
          confidence: 30,
          extraction_notes: null,
        },
      ],
    });
    const issues = validateExtraction(extraction);
    expect(issues.some((i) => i.field === 'confidence')).toBe(true);
  });

  it('info when part does not match vendor patterns', () => {
    const extraction = makeExtraction();
    const issues = validateExtraction(extraction, ['^CMUC\\d+']);
    expect(issues.some((i) => i.severity === 'info')).toBe(true);
  });

  it('no issue when part matches vendor pattern', () => {
    const extraction = makeExtraction({
      line_items: [
        {
          line_number: 1,
          vendor_part_number: 'CMUC3153545',
          manufacturer_part_number: null,
          description: 'Test',
          quantity: 1,
          unit_price: 10,
          extended_price: 10,
          unit_of_measure: 'EA',
          confidence: 90,
          extraction_notes: null,
        },
      ],
    });
    const issues = validateExtraction(extraction, ['^CMUC\\d+']);
    expect(issues.filter((i) => i.severity === 'info')).toHaveLength(0);
  });
});
