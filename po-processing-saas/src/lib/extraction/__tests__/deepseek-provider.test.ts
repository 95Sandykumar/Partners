import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.stubEnv('DEEPSEEK_API_KEY', 'test-key');

const { deepseekProvider } = await import('../deepseek-provider');

const VALID_JSON = JSON.stringify({
  extraction_metadata: {
    vendor_detected: 'Test',
    template_used: null,
    pages_processed: 1,
    overall_confidence: 90,
    extraction_timestamp: '2026-01-01T00:00:00Z',
  },
  header: {
    po_number: 'PO-456',
    po_date: '2026-01-01',
    vendor_name: 'Test Vendor',
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
  delete process.env.DEEPSEEK_ENDPOINT;
});

describe('deepseekProvider', () => {
  it('has name "deepseek"', () => {
    expect(deepseekProvider.name).toBe('deepseek');
  });

  it('extracts JSON from markdown code block', async () => {
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    const { result, provider } = await deepseekProvider.extractPO('base64data', 'system', 'user');
    expect(result.header.po_number).toBe('PO-456');
    expect(provider).toBe('deepseek');
  });

  it('extracts raw JSON from response', async () => {
    mockFetch.mockResolvedValue(makeResponse(`Here is the data: ${VALID_JSON}`));

    const { result } = await deepseekProvider.extractPO('base64data', 'system', 'user');
    expect(result.header.po_number).toBe('PO-456');
  });

  it('throws when no text content in response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }], usage: { prompt_tokens: 0, completion_tokens: 0 } }),
    });

    await expect(deepseekProvider.extractPO('base64data', 'system', 'user')).rejects.toThrow('No text response');
  });

  it('calculates cost with DeepSeek pricing ($0.27/$1.10)', async () => {
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    const { cost } = await deepseekProvider.extractPO('base64data', 'system', 'user');
    // (1000 * 0.27 + 500 * 1.10) / 1_000_000 = (270 + 550) / 1_000_000 = 0.00082
    expect(cost).toBeCloseTo(0.00082, 6);
  });

  it('returns zero cost for self-hosted endpoint', async () => {
    process.env.DEEPSEEK_ENDPOINT = 'http://localhost:8000/v1/chat/completions';
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    const { cost } = await deepseekProvider.extractPO('base64data', 'system', 'user');
    expect(cost).toBe(0);
  });

  it('uses deepseek-ocr model', async () => {
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    await deepseekProvider.extractPO('base64data', 'system', 'user');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('deepseek-ocr');
  });

  it('uses custom endpoint when DEEPSEEK_ENDPOINT is set', async () => {
    process.env.DEEPSEEK_ENDPOINT = 'http://my-gpu:8000/v1/chat/completions';
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    await deepseekProvider.extractPO('base64data', 'system', 'user');

    expect(mockFetch.mock.calls[0][0]).toBe('http://my-gpu:8000/v1/chat/completions');
  });

  it('uses default DeepSeek API when no endpoint set', async () => {
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``));

    await deepseekProvider.extractPO('base64data', 'system', 'user');

    expect(mockFetch.mock.calls[0][0]).toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('tracks token usage', async () => {
    mockFetch.mockResolvedValue(makeResponse(`\`\`\`json\n${VALID_JSON}\n\`\`\``, 3000, 1500));

    const { usage } = await deepseekProvider.extractPO('base64data', 'system', 'user');
    expect(usage.inputTokens).toBe(3000);
    expect(usage.outputTokens).toBe(1500);
  });
});
