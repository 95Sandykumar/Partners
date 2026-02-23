import { describe, it, expect } from 'vitest';
import { calculateConfidence } from '../confidence-scoring';
import type { ExtractionResult, ValidationIssue } from '@/types/extraction';

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
      po_number: 'PO-123',
      po_date: '2026-01-01',
      vendor_name: 'Test',
      vendor_address: null,
      ship_to_name: null,
      ship_to_address: null,
      payment_terms: null,
      currency: 'USD',
    },
    line_items: [
      {
        line_number: 1,
        vendor_part_number: 'B422',
        manufacturer_part_number: null,
        description: 'Test',
        quantity: 10,
        unit_price: 45,
        extended_price: 450,
        unit_of_measure: 'EA',
        confidence: 90,
        extraction_notes: null,
      },
    ],
    totals: { subtotal: 450, tax: 0, shipping: 0, total: 450 },
    extraction_issues: [],
    ...overrides,
  };
}

describe('calculateConfidence', () => {
  it('blends Claude overall (40%) with line-item average (60%)', () => {
    const extraction = makeExtraction();
    // overall = 90, line avg = 90
    // blended = 90*0.4 + 90*0.6 = 90
    const confidence = calculateConfidence(extraction, []);
    expect(confidence).toBe(90);
  });

  it('weights line items at 60%', () => {
    const extraction = makeExtraction({
      extraction_metadata: {
        vendor_detected: 'test',
        template_used: null,
        pages_processed: 1,
        overall_confidence: 80,
        extraction_timestamp: new Date().toISOString(),
      },
      line_items: [
        {
          line_number: 1, vendor_part_number: 'B422', manufacturer_part_number: null,
          description: 'Test', quantity: 10, unit_price: 45, extended_price: 450,
          unit_of_measure: 'EA', confidence: 100, extraction_notes: null,
        },
      ],
    });
    // 80*0.4 + 100*0.6 = 32 + 60 = 92
    const confidence = calculateConfidence(extraction, []);
    expect(confidence).toBe(92);
  });

  it('applies error penalty (-15 per error)', () => {
    const issues: ValidationIssue[] = [
      { line_number: 1, field: 'quantity', message: 'Invalid', severity: 'error' },
    ];
    const confidence = calculateConfidence(makeExtraction(), issues);
    expect(confidence).toBe(90 - 15); // 75
  });

  it('applies warning penalty (-5 per warning)', () => {
    const issues: ValidationIssue[] = [
      { line_number: 1, field: 'total', message: 'Mismatch', severity: 'warning' },
    ];
    const confidence = calculateConfidence(makeExtraction(), issues);
    expect(confidence).toBe(90 - 5); // 85
  });

  it('applies template adjustments', () => {
    const adjustments = { simple_format_bonus: 10, single_page_bonus: 5 };
    const confidence = calculateConfidence(makeExtraction(), [], adjustments);
    // 90 + 10 + 5 = 105, clamped to 100
    expect(confidence).toBe(100);
  });

  it('applies negative template adjustments', () => {
    const adjustments = { complex_format_penalty: -5, watermark_penalty: -10 };
    const confidence = calculateConfidence(makeExtraction(), [], adjustments);
    // 90 - 5 - 10 = 75
    expect(confidence).toBe(75);
  });

  it('clamps to minimum of 0', () => {
    const issues: ValidationIssue[] = Array.from({ length: 10 }, (_, i) => ({
      line_number: 1,
      field: `field${i}`,
      message: 'Error',
      severity: 'error' as const,
    }));
    // 90 - 150 = -60, clamped to 0
    const confidence = calculateConfidence(makeExtraction(), issues);
    expect(confidence).toBe(0);
  });

  it('clamps to maximum of 100', () => {
    const adjustments = { simple_format_bonus: 50, single_page_bonus: 50 };
    const confidence = calculateConfidence(makeExtraction(), [], adjustments);
    expect(confidence).toBe(100);
  });
});
