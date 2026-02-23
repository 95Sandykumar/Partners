import type { ExtractionResult, ValidationIssue } from '@/types/extraction';

interface ConfidenceAdjustments {
  simple_format_bonus?: number;
  single_page_bonus?: number;
  complex_format_penalty?: number;
  watermark_penalty?: number;
  mfg_part_found_bonus?: number;
  cmuc_prefix_match_bonus?: number;
  cmd_prefix_match_bonus?: number;
  clean_format_bonus?: number;
  known_prefix_bonus?: number;
  unknown_prefix_penalty?: number;
}

export function calculateConfidence(
  extraction: ExtractionResult,
  validationIssues: ValidationIssue[],
  templateAdjustments?: ConfidenceAdjustments
): number {
  // Start with Claude's reported confidence
  let confidence = extraction.extraction_metadata.overall_confidence;

  // Average line item confidences
  if (extraction.line_items.length > 0) {
    const avgLineConfidence =
      extraction.line_items.reduce((sum, item) => sum + item.confidence, 0) /
      extraction.line_items.length;
    // Blend Claude's overall with line-level average
    confidence = confidence * 0.4 + avgLineConfidence * 0.6;
  }

  // Apply validation issue penalties
  const errorCount = validationIssues.filter((i) => i.severity === 'error').length;
  const warningCount = validationIssues.filter((i) => i.severity === 'warning').length;
  confidence -= errorCount * 15;
  confidence -= warningCount * 5;

  // Apply template-specific adjustments
  if (templateAdjustments) {
    for (const [key, value] of Object.entries(templateAdjustments)) {
      if (typeof value === 'number') {
        confidence += value;
      }
    }
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(confidence)));
}
