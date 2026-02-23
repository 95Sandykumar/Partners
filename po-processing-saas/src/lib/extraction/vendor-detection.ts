import type { VendorDetectionResult } from '@/types/extraction';
import type { Vendor, VendorTemplate } from '@/types/database';

interface VendorWithTemplate extends Vendor {
  templates?: VendorTemplate[];
}

export function detectVendor(
  pdfText: string,
  senderEmail: string | undefined,
  vendors: VendorWithTemplate[]
): VendorDetectionResult {
  // 1. Try email domain match (highest confidence)
  if (senderEmail) {
    const emailLower = senderEmail.toLowerCase();
    for (const vendor of vendors) {
      for (const domain of vendor.email_domains || []) {
        if (emailLower.includes(domain.toLowerCase())) {
          return {
            vendor_id: vendor.id,
            vendor_name: vendor.vendor_name,
            confidence: 95,
            matched_by: `email_domain:${domain}`,
            template_id: vendor.templates?.[0]?.id || null,
          };
        }
      }
    }
  }

  // 2. Try keyword match in PDF text
  const textLower = pdfText.toLowerCase();
  let bestMatch: VendorDetectionResult | null = null;
  let bestKeywordCount = 0;

  for (const vendor of vendors) {
    let keywordHits = 0;
    let matchedKeyword = '';

    for (const keyword of vendor.keywords || []) {
      if (textLower.includes(keyword.toLowerCase())) {
        keywordHits++;
        if (!matchedKeyword) matchedKeyword = keyword;
      }
    }

    // Also check vendor name
    if (textLower.includes(vendor.vendor_name.toLowerCase())) {
      keywordHits += 2;
      if (!matchedKeyword) matchedKeyword = vendor.vendor_name;
    }

    if (keywordHits > bestKeywordCount) {
      bestKeywordCount = keywordHits;
      bestMatch = {
        vendor_id: vendor.id,
        vendor_name: vendor.vendor_name,
        confidence: Math.min(80 + keywordHits * 5, 90),
        matched_by: `keyword:${matchedKeyword}`,
        template_id: vendor.templates?.[0]?.id || null,
      };
    }
  }

  if (bestMatch) return bestMatch;

  // 3. No match
  return {
    vendor_id: null,
    vendor_name: null,
    confidence: 0,
    matched_by: 'none',
    template_id: null,
  };
}
