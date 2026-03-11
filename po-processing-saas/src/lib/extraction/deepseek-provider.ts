import type { VisionProvider, VisionProviderResult } from './vision-provider';

/**
 * DeepSeek provider - currently unsupported for vision/OCR tasks.
 *
 * The DeepSeek hosted API (api.deepseek.com) only offers `deepseek-chat` and
 * `deepseek-reasoner` models, neither of which supports image/PDF input.
 * The DeepSeek-VL and DeepSeek-VL2 vision models are only available as
 * locally-hosted models (via Hugging Face), not through the cloud API.
 *
 * If DeepSeek adds vision support to their API in the future, this provider
 * can be re-enabled. For now, use `VISION_PROVIDER=mistral` in .env.local.
 *
 * To use DeepSeek for extraction with a self-hosted VL2 endpoint, set:
 *   DEEPSEEK_ENDPOINT=http://your-server:8000/v1/chat/completions
 *   VISION_PROVIDER=deepseek
 */
export const deepseekProvider: VisionProvider = {
  name: 'deepseek',

  async extractPO(
    _pdfBase64: string,
    _systemPrompt: string,
    _userPrompt: string,
  ): Promise<VisionProviderResult> {
    // Only allow if a self-hosted endpoint is configured (DeepSeek-VL2 local deployment)
    const endpoint = process.env.DEEPSEEK_ENDPOINT;
    if (!endpoint) {
      throw new Error(
        'DeepSeek cloud API does not support vision/OCR. ' +
        'Set VISION_PROVIDER=mistral in .env.local, or configure ' +
        'DEEPSEEK_ENDPOINT for a self-hosted DeepSeek-VL2 instance.',
      );
    }

    // Self-hosted DeepSeek-VL2 endpoint - forward the request
    return extractWithSelfHosted(endpoint, _pdfBase64, _systemPrompt, _userPrompt);
  },
};

const TIMEOUT_MS = 90_000;
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

async function extractWithSelfHosted(
  endpoint: string,
  pdfBase64: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<VisionProviderResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY || '';

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: 'deepseek-vl2',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:application/pdf;base64,${pdfBase64}`,
                  },
                },
                { type: 'text', text: userPrompt },
              ],
            },
          ],
          max_tokens: 4096,
          temperature: 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        const error = Object.assign(
          new Error(`DeepSeek self-hosted error ${response.status}: ${errorBody}`),
          { status: response.status },
        );

        if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt === 0) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }

      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content;
      if (!textContent) {
        throw new Error('No text response from DeepSeek self-hosted');
      }

      const jsonStr = extractJson(textContent);
      const result = JSON.parse(jsonStr);

      return {
        result,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
        cost: 0, // Self-hosted = zero API cost
        provider: 'deepseek',
      };
    } catch (error: unknown) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error(String(error));

      const statusCode =
        lastError && 'status' in lastError
          ? (lastError as Error & { status: number }).status
          : undefined;
      const isRetryable =
        statusCode !== undefined && RETRYABLE_STATUS_CODES.includes(statusCode);
      const isTimeout = error instanceof Error && error.name === 'AbortError';

      if ((isRetryable || isTimeout) && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('DeepSeek extraction failed after retries');
}

function extractJson(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return text.substring(startIdx, endIdx + 1);
  }

  throw new Error('Could not find JSON in DeepSeek response');
}
