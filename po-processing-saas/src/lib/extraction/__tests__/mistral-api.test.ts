import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Set the env var before importing
vi.stubEnv('MISTRAL_API_KEY', 'test-key');

const { extractPOWithVision } = await import('../mistral-api');

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

function makeResponse(text: string, inputTokens = 1000, outputTokens = 500) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: text } }],
      usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens },
    }),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('extractPOWithVision', () => {
  it('extracts JSON from markdown code block', async () => {
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    const { result, usage, cost } = await extractPOWithVision('base64data', 'system', 'user');
    expect(result.header.po_number).toBe('PO-123');
    expect(usage.inputTokens).toBe(1000);
    expect(usage.outputTokens).toBe(500);
    expect(cost).toBeGreaterThan(0);
  });

  it('extracts raw JSON from response', async () => {
    mockFetch.mockResolvedValue(makeResponse(`Here is the data: ${VALID_JSON}`));

    const { result } = await extractPOWithVision('base64data', 'system', 'user');
    expect(result.header.po_number).toBe('PO-123');
  });

  it('throws when no text content in response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }], usage: { prompt_tokens: 0, completion_tokens: 0 } }),
    });

    await expect(extractPOWithVision('base64data', 'system', 'user')).rejects.toThrow('No text response');
  });

  it('throws when no JSON found in response', async () => {
    mockFetch.mockResolvedValue(makeResponse('No JSON here at all'));

    await expect(extractPOWithVision('base64data', 'system', 'user')).rejects.toThrow('Could not find JSON');
  });

  it('calculates cost correctly with Mistral pricing', async () => {
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    const { cost } = await extractPOWithVision('base64data', 'system', 'user');
    // (1000 * 2 + 500 * 6) / 1_000_000 = (2000 + 3000) / 1_000_000 = 0.005
    expect(cost).toBeCloseTo(0.005, 4);
  });

  it('tracks input and output token usage', async () => {
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``, 5000, 2000));

    const { usage } = await extractPOWithVision('base64data', 'system', 'user');
    expect(usage.inputTokens).toBe(5000);
    expect(usage.outputTokens).toBe(2000);
  });
});
