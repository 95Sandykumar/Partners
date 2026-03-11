import type { ExtractionResult } from '@/types/extraction';
import type { VisionProvider, VisionProviderResult } from './vision-provider';

const TIMEOUT_MS = 90_000;
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

// Mistral OCR: $1 per 1000 pages (flat rate)
// Mistral Small chat: $0.10/M input, $0.30/M output
const OCR_COST_PER_PAGE = 0.001;
const CHAT_INPUT_COST_PER_MILLION = 0.10;
const CHAT_OUTPUT_COST_PER_MILLION = 0.30;

const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';
const CHAT_MODEL = 'mistral-small-latest';

interface MistralOCRPage {
  index: number;
  markdown: string;
}

interface MistralOCRResponse {
  pages: MistralOCRPage[];
  model: string;
  usage_info?: {
    pages_processed?: number;
  };
}

function getApiKey(): string {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    throw new Error('MISTRAL_API_KEY is not configured');
  }
  return key;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxAttempts: number = 2,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        const error = Object.assign(
          new Error(`Mistral API error ${response.status}: ${errorBody}`),
          { status: response.status },
        );

        if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < maxAttempts - 1) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }

      return response;
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

      if ((isRetryable || isTimeout) && attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Mistral request failed after retries');
}

/**
 * Step 1: Use Mistral OCR to extract markdown text from PDF.
 * The OCR endpoint natively accepts PDFs as base64.
 */
async function ocrExtract(
  apiKey: string,
  pdfBase64: string,
): Promise<{ markdown: string; pagesProcessed: number }> {
  const response = await fetchWithRetry(MISTRAL_OCR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        document_url: `data:application/pdf;base64,${pdfBase64}`,
      },
      include_image_base64: false,
    }),
  });

  const data: MistralOCRResponse = await response.json();

  if (!data.pages || data.pages.length === 0) {
    throw new Error('Mistral OCR returned no pages');
  }

  // Combine all page markdown with page separators
  const markdown = data.pages
    .map((p) => `--- Page ${p.index + 1} ---\n${p.markdown}`)
    .join('\n\n');

  return {
    markdown,
    pagesProcessed: data.pages.length,
  };
}

/**
 * Step 2: Use Mistral chat model to parse OCR markdown into structured JSON.
 */
async function chatParse(
  apiKey: string,
  ocrMarkdown: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{
  result: ExtractionResult;
  inputTokens: number;
  outputTokens: number;
}> {
  // Prepend the OCR text to the user prompt
  const enhancedUserPrompt = `## DOCUMENT TEXT (extracted via OCR):\n\n${ocrMarkdown}\n\n---\n\n${userPrompt}`;

  const response = await fetchWithRetry(MISTRAL_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: enhancedUserPrompt },
      ],
      max_tokens: 8192,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();

  const textContent = data.choices?.[0]?.message?.content;
  if (!textContent) {
    throw new Error('No text response from Mistral chat model');
  }

  const jsonStr = extractJson(textContent);
  const result: ExtractionResult = JSON.parse(jsonStr);

  return {
    result,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

export const mistralProvider: VisionProvider = {
  name: 'mistral',

  async extractPO(
    pdfBase64: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<VisionProviderResult> {
    const apiKey = getApiKey();

    // Step 1: OCR - extract markdown from PDF
    const { markdown, pagesProcessed } = await ocrExtract(apiKey, pdfBase64);

    // Step 2: Chat - parse markdown into structured JSON
    const { result, inputTokens, outputTokens } = await chatParse(
      apiKey,
      markdown,
      systemPrompt,
      userPrompt,
    );

    // Calculate combined cost
    const ocrCost = pagesProcessed * OCR_COST_PER_PAGE;
    const chatCost =
      (inputTokens * CHAT_INPUT_COST_PER_MILLION +
        outputTokens * CHAT_OUTPUT_COST_PER_MILLION) /
      1_000_000;

    return {
      result,
      usage: { inputTokens, outputTokens },
      cost: ocrCost + chatCost,
      provider: 'mistral',
    };
  },
};

// Keep backward-compatible export for existing code
export async function extractPOWithVision(
  pdfBase64: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<VisionProviderResult> {
  return mistralProvider.extractPO(pdfBase64, systemPrompt, userPrompt);
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

  throw new Error('Could not find JSON in Mistral response');
}
