import Anthropic from '@anthropic-ai/sdk';
import type { ExtractionResult } from '@/types/extraction';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TIMEOUT_MS = 60_000;
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

export async function extractPOWithVision(
  pdfBase64: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ result: ExtractionResult; usage: { inputTokens: number; outputTokens: number }; cost: number }> {
  let lastError: Error | null = null;

  // Single retry on retryable errors
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await anthropic.messages.create(
          {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: 'application/pdf',
                      data: pdfBase64,
                    },
                  },
                  {
                    type: 'text',
                    text: userPrompt,
                  },
                ],
              },
            ],
          },
          { signal: controller.signal }
        );

        clearTimeout(timeout);

        // Extract text content from response
        const textContent = response.content.find((block) => block.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from Claude');
        }

        // Parse JSON from response
        const jsonStr = extractJson(textContent.text);
        const result: ExtractionResult = JSON.parse(jsonStr);

        // Calculate cost (Claude Sonnet pricing: $3/M input, $15/M output)
        const cost =
          (response.usage.input_tokens * 3 + response.usage.output_tokens * 15) / 1_000_000;

        return {
          result,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          cost,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if retryable
      const isRetryable =
        error instanceof Anthropic.APIError &&
        RETRYABLE_STATUS_CODES.includes(error.status);

      const isTimeout =
        error instanceof Error && error.name === 'AbortError';

      if ((isRetryable || isTimeout) && attempt === 0) {
        // Exponential backoff: wait 2 seconds before retry
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

  throw new Error('Could not find JSON in Claude response');
}
