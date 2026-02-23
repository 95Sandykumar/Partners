const KNOWN_PREFIXES = ['CMI-', 'BER-', 'LIN-', 'CMUC', 'CMD ', 'CMD'];

export function normalizePartNumber(partNumber: string): string {
  if (!partNumber) return '';
  return partNumber
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .trim();
}

export function stripKnownPrefix(partNumber: string): string {
  if (!partNumber) return '';
  const upper = partNumber.toUpperCase().trim();

  for (const prefix of KNOWN_PREFIXES) {
    if (upper.startsWith(prefix.replace(/[\s-]/g, '')) || upper.startsWith(prefix.trim())) {
      // For dash-separated prefixes (CMI-, BER-, LIN-)
      const dashIdx = partNumber.indexOf('-');
      if (dashIdx > 0 && dashIdx <= 4) {
        return partNumber.substring(dashIdx + 1).trim();
      }
      // For space/attached prefixes (CMUC, CMD)
      return partNumber.substring(prefix.trim().length).trim();
    }
  }

  return partNumber;
}

export function extractPrefix(partNumber: string): string | null {
  if (!partNumber) return null;
  const upper = partNumber.toUpperCase().trim();

  for (const prefix of KNOWN_PREFIXES) {
    const cleanPrefix = prefix.replace(/[\s-]/g, '');
    if (upper.startsWith(cleanPrefix) || upper.startsWith(prefix.trim())) {
      return prefix.trim().replace(/-$/, '');
    }
  }

  return null;
}
