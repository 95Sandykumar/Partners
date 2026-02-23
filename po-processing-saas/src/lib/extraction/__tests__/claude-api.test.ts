import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Anthropic SDK
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
    constructor() {}
  }
  // Also mock static properties used for error checking
  (MockAnthropic as unknown as Record<string, unknown>).APIError = class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  };
  return { default: MockAnthropic };
});

// Dynamic import after mock is set up
const { extractPOWithVision } = await import('../claude-api');

const VALID_JSON = JSON.stringify({
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
  line_items: [],
  totals: { subtotal: 0, tax: 0, shipping: 0, total: 0 },
  extraction_issues: [],
});

function makeResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: 1000, output_tokens: 500 },
  };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe('extractPOWithVision', () => {
  it('extracts JSON from markdown code block', async () => {
    mockCreate.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    const { result, usage, cost } = await extractPOWithVision('base64data', 'system', 'user');
    expect(result.header.po_number).toBe('PO-123');
    expect(usage.inputTokens).toBe(1000);
    expect(usage.outputTokens).toBe(500);
    expect(cost).toBeGreaterThan(0);
  });

  it('extracts raw JSON from response', async () => {
    mockCreate.mockResolvedValue(makeResponse(`Here is the data: ${VALID_JSON}`));

    const { result } = await extractPOWithVision('base64data', 'system', 'user');
    expect(result.header.po_number).toBe('PO-123');
  });

  it('throws when no text content in response', async () => {
    mockCreate.mockResolvedValue({ content: [], usage: { input_tokens: 0, output_tokens: 0 } });

    await expect(extractPOWithVision('base64data', 'system', 'user')).rejects.toThrow('No text response');
  });

  it('throws when no JSON found in response', async () => {
    mockCreate.mockResolvedValue(makeResponse('No JSON here at all'));

    await expect(extractPOWithVision('base64data', 'system', 'user')).rejects.toThrow('Could not find JSON');
  });

  it('calculates cost correctly', async () => {
    mockCreate.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    const { cost } = await extractPOWithVision('base64data', 'system', 'user');
    // (1000 * 3 + 500 * 15) / 1_000_000 = (3000 + 7500) / 1_000_000 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 4);
  });

  it('tracks input and output token usage', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: `\`\`\`json\n${VALID_JSON}\n\`\`\`` }],
      usage: { input_tokens: 5000, output_tokens: 2000 },
    });

    const { usage } = await extractPOWithVision('base64data', 'system', 'user');
    expect(usage.inputTokens).toBe(5000);
    expect(usage.outputTokens).toBe(2000);
  });
});
