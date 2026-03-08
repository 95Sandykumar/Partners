import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VisionProviderResult } from '../vision-provider';

// Mock the dependencies
vi.mock('../vision-provider', () => ({
  getProviderMode: vi.fn(),
}));

vi.mock('../deepseek-provider', () => ({
  deepseekProvider: {
    name: 'deepseek',
    extractPO: vi.fn(),
  },
}));

vi.mock('../mistral-api', () => ({
  mistralProvider: {
    name: 'mistral',
    extractPO: vi.fn(),
  },
}));

const { getProviderMode } = await import('../vision-provider');
const { deepseekProvider } = await import('../deepseek-provider');
const { mistralProvider } = await import('../mistral-api');
const { extractWithProvider } = await import('../extraction-pipeline');

const mockedGetProviderMode = vi.mocked(getProviderMode);
const mockedDeepseek = vi.mocked(deepseekProvider.extractPO);
const mockedMistral = vi.mocked(mistralProvider.extractPO);

function makeResult(
  provider: 'deepseek' | 'mistral',
  confidence: number,
  cost: number
): VisionProviderResult {
  return {
    result: {
      extraction_metadata: {
        vendor_detected: 'Test',
        template_used: null,
        pages_processed: 1,
        overall_confidence: confidence,
        extraction_timestamp: '2026-01-01T00:00:00Z',
      },
      header: {
        po_number: `PO-${provider}`,
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
    },
    usage: { inputTokens: 1000, outputTokens: 500 },
    cost,
    provider,
  };
}

beforeEach(() => {
  mockedGetProviderMode.mockReset();
  mockedDeepseek.mockReset();
  mockedMistral.mockReset();
});

describe('extractWithProvider', () => {
  describe('single provider modes', () => {
    it('uses Mistral exclusively when mode is "mistral"', async () => {
      mockedGetProviderMode.mockReturnValue('mistral');
      const expected = makeResult('mistral', 90, 0.00125);
      mockedMistral.mockResolvedValue(expected);

      const result = await extractWithProvider('base64', 'sys', 'usr');

      expect(result).toBe(expected);
      expect(mockedMistral).toHaveBeenCalledWith('base64', 'sys', 'usr');
      expect(mockedDeepseek).not.toHaveBeenCalled();
    });

    it('uses DeepSeek exclusively when mode is "deepseek"', async () => {
      mockedGetProviderMode.mockReturnValue('deepseek');
      const expected = makeResult('deepseek', 90, 0.00082);
      mockedDeepseek.mockResolvedValue(expected);

      const result = await extractWithProvider('base64', 'sys', 'usr');

      expect(result).toBe(expected);
      expect(mockedDeepseek).toHaveBeenCalledWith('base64', 'sys', 'usr');
      expect(mockedMistral).not.toHaveBeenCalled();
    });
  });

  describe('hybrid mode', () => {
    beforeEach(() => {
      mockedGetProviderMode.mockReturnValue('hybrid');
    });

    it('returns DeepSeek result when confidence >= 75%', async () => {
      const deepseekResult = makeResult('deepseek', 85, 0.00082);
      mockedDeepseek.mockResolvedValue(deepseekResult);

      const result = await extractWithProvider('base64', 'sys', 'usr');

      expect(result).toBe(deepseekResult);
      expect(mockedDeepseek).toHaveBeenCalledOnce();
      expect(mockedMistral).not.toHaveBeenCalled();
    });

    it('falls back to Mistral when DeepSeek confidence < 75% and Mistral is better', async () => {
      const deepseekResult = makeResult('deepseek', 60, 0.00082);
      const mistralResult = makeResult('mistral', 80, 0.00125);
      mockedDeepseek.mockResolvedValue(deepseekResult);
      mockedMistral.mockResolvedValue(mistralResult);

      const result = await extractWithProvider('base64', 'sys', 'usr');

      expect(result.provider).toBe('mistral');
      expect(result.result.header.po_number).toBe('PO-mistral');
      // Cost should be sum of both providers
      expect(result.cost).toBeCloseTo(0.00082 + 0.00125, 6);
      expect(mockedDeepseek).toHaveBeenCalledOnce();
      expect(mockedMistral).toHaveBeenCalledOnce();
    });

    it('returns DeepSeek result when both have low confidence but DeepSeek is better', async () => {
      const deepseekResult = makeResult('deepseek', 65, 0.00082);
      const mistralResult = makeResult('mistral', 50, 0.00125);
      mockedDeepseek.mockResolvedValue(deepseekResult);
      mockedMistral.mockResolvedValue(mistralResult);

      const result = await extractWithProvider('base64', 'sys', 'usr');

      expect(result.provider).toBe('deepseek');
      expect(result.result.header.po_number).toBe('PO-deepseek');
      // Cost should still be sum of both
      expect(result.cost).toBeCloseTo(0.00082 + 0.00125, 6);
    });

    it('returns DeepSeek result when Mistral fallback fails', async () => {
      const deepseekResult = makeResult('deepseek', 50, 0.00082);
      mockedDeepseek.mockResolvedValue(deepseekResult);
      mockedMistral.mockRejectedValue(new Error('Mistral API error'));

      const result = await extractWithProvider('base64', 'sys', 'usr');

      expect(result).toBe(deepseekResult);
      expect(result.cost).toBe(0.00082);
    });

    it('uses Mistral as sole provider when DeepSeek fails completely', async () => {
      const mistralResult = makeResult('mistral', 90, 0.00125);
      mockedDeepseek.mockRejectedValue(new Error('DeepSeek API error'));
      mockedMistral.mockResolvedValue(mistralResult);

      const result = await extractWithProvider('base64', 'sys', 'usr');

      expect(result).toBe(mistralResult);
      expect(mockedDeepseek).toHaveBeenCalledOnce();
      expect(mockedMistral).toHaveBeenCalledOnce();
    });

    it('throws when both providers fail', async () => {
      mockedDeepseek.mockRejectedValue(new Error('DeepSeek down'));
      mockedMistral.mockRejectedValue(new Error('Mistral down'));

      await expect(
        extractWithProvider('base64', 'sys', 'usr')
      ).rejects.toThrow('Mistral down');
    });

    it('treats exactly 75% confidence as passing (no fallback)', async () => {
      const deepseekResult = makeResult('deepseek', 75, 0.00082);
      mockedDeepseek.mockResolvedValue(deepseekResult);

      const result = await extractWithProvider('base64', 'sys', 'usr');

      expect(result).toBe(deepseekResult);
      expect(mockedMistral).not.toHaveBeenCalled();
    });

    it('triggers fallback at 74% confidence', async () => {
      const deepseekResult = makeResult('deepseek', 74, 0.00082);
      const mistralResult = makeResult('mistral', 85, 0.00125);
      mockedDeepseek.mockResolvedValue(deepseekResult);
      mockedMistral.mockResolvedValue(mistralResult);

      const result = await extractWithProvider('base64', 'sys', 'usr');

      expect(result.provider).toBe('mistral');
      expect(mockedMistral).toHaveBeenCalledOnce();
    });
  });
});
