import type { ExtractionResult } from '@/types/extraction';

export interface VisionProviderResult {
  result: ExtractionResult;
  usage: { inputTokens: number; outputTokens: number };
  cost: number;
  provider: 'deepseek' | 'mistral';
}

export interface VisionProvider {
  readonly name: 'deepseek' | 'mistral';
  extractPO(
    pdfBase64: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<VisionProviderResult>;
}

export type VisionProviderMode = 'hybrid' | 'deepseek' | 'mistral';

export function getProviderMode(): VisionProviderMode {
  const mode = process.env.VISION_PROVIDER?.toLowerCase();
  if (mode === 'deepseek' || mode === 'mistral') return mode;
  return 'hybrid';
}
