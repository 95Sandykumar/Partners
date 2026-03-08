import type { ExtractionResult } from '@/types/extraction';
import type { VisionProvider, VisionProviderResult } from './vision-provider';

const TIMEOUT_MS = 90_000;
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

// DeepSeek API pricing: $0.27/M input, $1.10/M output (vision)
const INPUT_COST_PER_MILLION = 0.27;
const OUTPUT_COST_PER_MILLION = 1.10;

function getApiUrl(): string {
  // Support self-hosted endpoint or DeepSeek cloud API
  return process.env.DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
}

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }
  return key;
}

export const deepseekProvider: VisionProvider = {
  name: 'deepseek',

  async extractPO(
    pdfBase64: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<VisionProviderResult> {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'deepseek-ocr',
              messages: [
                {
                  role: 'system',
                  content: systemPrompt,
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:application/pdf;base64,${pdfBase64}`,
                      },
                    },
                    {
                      type: 'text',
                      text: userPrompt,
                    },
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
              new Error(`DeepSeek API error ${response.status}: ${errorBody}`),
              { status: response.status }
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
            throw new Error('No text response from DeepSeek');
          }

          const jsonStr = extractJson(textContent);
          const result: ExtractionResult = JSON.parse(jsonStr);

          const inputTokens = data.usage?.prompt_tokens ?? 0;
          const outputTokens = data.usage?.completion_tokens ?? 0;

          // Self-hosted endpoint = zero cost
          const isSelfHosted = !!process.env.DEEPSEEK_ENDPOINT;
          const cost = isSelfHosted
            ? 0
            : (inputTokens * INPUT_COST_PER_MILLION + outputTokens * OUTPUT_COST_PER_MILLION) / 1_000_000;

          return {
            result,
            usage: { inputTokens, outputTokens },
            cost,
            provider: 'deepseek',
          };
        } finally {
          clearTimeout(timeout);
        }
      } catch (error: unknown) {
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
  },
};

function extractJson(text: string): string {
  // Try markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // Try to find raw JSON
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return text.substring(startIdx, endIdx + 1);
  }

  throw new Error('Could not find JSON in DeepSeek response');
}
