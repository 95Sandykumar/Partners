import { describe, it, expect } from 'vitest';
import { detectCorrections } from '../correction-tracker';
import type { ExtractionResult } from '@/types/extraction';
import type { POLineItem } from '@/types/database';
import type { LineItemEdit } from '@/types/po';

function makeExtraction(): ExtractionResult {
  return {
    extraction_metadata: {
      vendor_detected: 'Test',
      template_used: null,
      pages_processed: 1,
      overall_confidence: 90,
      extraction_timestamp: '2026-01-01T00:00:00Z',
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
        description: 'Trigger 600 V',
        quantity: 10,
        unit_price: 45.0,
        extended_price: 450.0,
        unit_of_measure: 'EA',
        confidence: 90,
        extraction_notes: null,
      },
      {
        line_number: 2,
        vendor_part_number: 'B5662',
        manufacturer_part_number: null,
        description: 'Trigger Assembly',
        quantity: 5,
        unit_price: 67.0,
        extended_price: 335.0,
        unit_of_measure: 'EA',
        confidence: 85,
        extraction_notes: null,
      },
    ],
    totals: { subtotal: 785, tax: 0, shipping: 0, total: 785 },
    extraction_issues: [],
  };
}

function makeDbItem(lineNumber: number, id: string): POLineItem {
  return {
    id,
    purchase_order_id: 'po-1',
    line_number: lineNumber,
    vendor_part_number: lineNumber === 1 ? 'B422' : 'B5662',
    manufacturer_part_number: null,
    description: lineNumber === 1 ? 'Trigger 600 V' : 'Trigger Assembly',
    quantity: lineNumber === 1 ? 10 : 5,
    unit_of_measure: 'EA',
    unit_price: lineNumber === 1 ? 45.0 : 67.0,
    extended_price: lineNumber === 1 ? 450.0 : 335.0,
    matched_internal_sku: null,
    match_confidence: null,
    match_method: null,
    is_matched: false,
    extraction_confidence: lineNumber === 1 ? 90 : 85,
    extraction_notes: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

describe('detectCorrections', () => {
  it('returns no corrections when nothing changed', () => {
    const extraction = makeExtraction();
    const dbItems = [makeDbItem(1, 'item-1'), makeDbItem(2, 'item-2')];
    const edits: LineItemEdit[] = [
      { id: 'item-1', vendor_part_number: 'B422', quantity: 10 },
    ];

    const corrections = detectCorrections(extraction, edits, dbItems);
    expect(corrections).toHaveLength(0);
  });

  it('detects corrected vendor part number', () => {
    const extraction = makeExtraction();
    const dbItems = [makeDbItem(1, 'item-1')];
    const edits: LineItemEdit[] = [
      { id: 'item-1', vendor_part_number: 'B423' },
    ];

    const corrections = detectCorrections(extraction, edits, dbItems);
    expect(corrections.length).toBeGreaterThanOrEqual(1);
    const partCorrection = corrections.find((c) => c.field_name === 'vendor_part_number');
    expect(partCorrection).toBeDefined();
    expect(partCorrection!.ai_extracted_value).toBe('B422');
    expect(partCorrection!.corrected_value).toBe('B423');
  });

  it('detects corrected quantity', () => {
    const extraction = makeExtraction();
    const dbItems = [makeDbItem(1, 'item-1')];
    const edits: LineItemEdit[] = [
      { id: 'item-1', quantity: 20 },
    ];

    const corrections = detectCorrections(extraction, edits, dbItems);
    const qtyCorrection = corrections.find((c) => c.field_name === 'quantity');
    expect(qtyCorrection).toBeDefined();
    expect(qtyCorrection!.ai_extracted_value).toBe('10');
    expect(qtyCorrection!.corrected_value).toBe('20');
  });

  it('detects multiple corrections on same line', () => {
    const extraction = makeExtraction();
    const dbItems = [makeDbItem(1, 'item-1')];
    const edits: LineItemEdit[] = [
      { id: 'item-1', vendor_part_number: 'NEW-PART', quantity: 99 },
    ];

    const corrections = detectCorrections(extraction, edits, dbItems);
    expect(corrections.length).toBe(2);
  });

  it('tracks corrections across multiple lines', () => {
    const extraction = makeExtraction();
    const dbItems = [makeDbItem(1, 'item-1'), makeDbItem(2, 'item-2')];
    const edits: LineItemEdit[] = [
      { id: 'item-1', quantity: 20 },
      { id: 'item-2', description: 'Changed Description' },
    ];

    const corrections = detectCorrections(extraction, edits, dbItems);
    expect(corrections.length).toBe(2);
    expect(corrections.some((c) => c.line_number === 1)).toBe(true);
    expect(corrections.some((c) => c.line_number === 2)).toBe(true);
  });

  it('ignores edits for unknown item IDs', () => {
    const extraction = makeExtraction();
    const dbItems = [makeDbItem(1, 'item-1')];
    const edits: LineItemEdit[] = [
      { id: 'nonexistent-id', quantity: 99 },
    ];

    const corrections = detectCorrections(extraction, edits, dbItems);
    expect(corrections).toHaveLength(0);
  });

  it('ignores fields not submitted in edit', () => {
    const extraction = makeExtraction();
    const dbItems = [makeDbItem(1, 'item-1')];
    // Only submit description, not quantity
    const edits: LineItemEdit[] = [
      { id: 'item-1', description: 'Trigger 600 V' }, // Same as original
    ];

    const corrections = detectCorrections(extraction, edits, dbItems);
    expect(corrections).toHaveLength(0);
  });

  it('includes extraction confidence in correction records', () => {
    const extraction = makeExtraction();
    const dbItems = [makeDbItem(1, 'item-1')];
    const edits: LineItemEdit[] = [
      { id: 'item-1', vendor_part_number: 'CORRECTED' },
    ];

    const corrections = detectCorrections(extraction, edits, dbItems);
    expect(corrections[0].extraction_confidence).toBe(90);
  });
});
