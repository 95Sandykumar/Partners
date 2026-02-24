import type { ExtractionResult } from '@/types/extraction';

const TIMEOUT_MS = 60_000;
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Pixtral Large pricing: $2/M input, $6/M output
const INPUT_COST_PER_MILLION = 2;
const OUTPUT_COST_PER_MILLION = 6;

export async function extractPOWithVision(
  pdfBase64: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ result: ExtractionResult; usage: { inputTokens: number; outputTokens: number }; cost: number }> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY is not configured');
  }

  let lastError: Error | null = null;

  // Single retry on retryable errors
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(MISTRAL_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'pixtral-large-latest',
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
            new Error(`Mistral API error ${response.status}: ${errorBody}`),
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

        // Extract text content from response
        const textContent = data.choices?.[0]?.message?.content;
        if (!textContent) {
          throw new Error('No text response from Mistral');
        }

        // Parse JSON from response
        const jsonStr = extractJson(textContent);
        const result: ExtractionResult = JSON.parse(jsonStr);

        // Calculate cost
        const inputTokens = data.usage?.prompt_tokens ?? 0;
        const outputTokens = data.usage?.completion_tokens ?? 0;
        const cost =
          (inputTokens * INPUT_COST_PER_MILLION + outputTokens * OUTPUT_COST_PER_MILLION) / 1_000_000;

        return {
          result,
          usage: { inputTokens, outputTokens },
          cost,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const statusCode = lastError && 'status' in lastError ? (lastError as Error & { status: number }).status : undefined;
      const isRetryable = statusCode !== undefined && RETRYABLE_STATUS_CODES.includes(statusCode);

      const isTimeout =
        error instanceof Error && error.name === 'AbortError';

      if ((isRetryable || isTimeout) && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Extraction failed after retries');
}

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

  throw new Error('Could not find JSON in Mistral response');
}
