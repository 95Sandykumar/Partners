# Initial Seed Data - Extracted from Sample POs

This document contains all part numbers extracted from your 5 sample POs. Use this to populate your initial Vendor_Mappings table.

## Summary of Extractions

| PO Source | PO Number | Vendor | Lines | Parts Extracted |
|-----------|-----------|--------|-------|-----------------|
| 3805_001.pdf | V322045 | Powerweld | 1 | B422 |
| PO_77666645_OD.pdf | 77666645 | Linde | 2 | CMUC315-3545, DROPSHIPFREIGHT |
| poemailtemp08690060.pdf | 4647948 | Matheson | 1 | CMD 4636001 |
| doc06249120250805100332.pdf | 2183 | SKD Supply | 11 | CMI-B5662, BER-L4A-15, etc. |

---

## Detailed Extractions

### 1. Powerweld PO (V322045)

**File:** 3805_001.pdf
**PO Number:** V322045
**Date:** 08/05/25
**Total:** $341.12

| Line | Their Part (OUR PT #) | Vend PT # | Description | Qty | UOM | Unit Price | Extended |
|------|----------------------|-----------|-------------|-----|-----|------------|----------|
| 1 | B422 | B422 | TRIGGER 600 V | 8 | EA | 42.64 | 341.12 |

**Notes:**
- In Powerweld POs, "OUR PT #" is their internal code
- "VEND PT #" references your product (same as theirs in this case)
- Location code: BB7

---

### 2. Linde PO (77666645)

**File:** PO_77666645_OD.pdf
**PO Number:** 77666645
**Date:** 8/5/2025
**Total:** $155.70

| Line | Their Part (Item Number) | MFG Part | Description | Qty | UOM | Unit Price | Extended |
|------|-------------------------|----------|-------------|-----|-----|------------|----------|
| 1.000 | CMUC315-3545 | C315-3545 | GUN 300A 15FT TWECO DP | 1 | EA | 155.70 | 155.70 |
| 2.000 | DROPSHIPFREIGHT | - | SHIPPING AND HANDLING CHARGE | 2 | EA | 0.00 | 0.00 |

**Notes:**
- Linde uses "CMUC" prefix for their item codes
- MFG # embedded in description: "MFG # : C315-3545"
- DROPSHIPFREIGHT is a service line, not a product
- Ship-to: H&M PALLET LLC, HOLTON MI

---

### 3. Matheson PO (4647948)

**File:** poemailtemp08690060.pdf
**PO Number:** 4647948
**Date:** 08/06/25
**Vendor Num:** U617
**Total:** $656.00

| Line | SUP | Their Part (ITEM) | MFG Part # | Description | Qty | UOM | Unit Price | Extended |
|------|-----|------------------|------------|-------------|-----|-----|------------|----------|
| 002 | CMD | 4636001 | 046-36-001 | CM HEAD INSULATOR 046-36-001 | 200 | EA | 3.28 | 656.00 |

**Notes:**
- Matheson uses watermarked background
- "SUP" column = CMD indicates CM Industries (your company) as supplier
- MFG PART # on separate line: "046-36-001"
- Large quantity order (200 units)
- Ship-to: MATHESON TRI-GAS INC, OMAHA NE

---

### 4. SKD Supply PO (2183)

**File:** doc06249120250805100332.pdf
**PO Number:** 2183
**Date:** 8/5/2025
**Total:** $1,428.13

| Line | Their Part (Item) | Prefix | Base Part | Description | Qty | UOM | Rate | Amount |
|------|-------------------|--------|-----------|-------------|-----|-----|------|--------|
| 1 | CMI-B5662 | CMI | B5662 | Trigger Assy | 1 | ea | 17.15 | 17.15 |
| 2 | BER-L4A-15 | BER | L4A-15 | Liner .045-1/16 15' | 4 | ea | 13.61 | 54.44 |
| 3 | BER-L7A-15 | BER | L7A-15 | Liner 15' 3/32 | 4 | ea | 16.86 | 67.44 |
| 4 | BER-T1116 | BER | T1116 | 1/16 Quik Tip | 200 | ea | 0.89 | 178.00 |
| 5 | BER-N1C12Q | BER | N1C12Q | Nozzle 1/2" Bore | 10 | ea | 9.31 | 93.10 |
| 6 | BER-N2C38HQ | BER | N2C38HQ | Tapered Nozzle 3/8 | 40 | ea | 16.94 | 677.60 |
| 7 | BER-N1C34HQ | BER | N1C34HQ | HD Nozzle 3/4" Bore | 20 | ea | 12.99 | 259.80 |
| 8 | LIN-KP2742-1-50R | LIN | KP2742-1-50R | Nozzle 1/2" Bore (Recessed Tip) | 5 | ea | 10.00 | 50.00 |
| 9 | LIN-KP2744-035T | LIN | KP2744-035T | Contact Tip .035 | 30 | ea | 0.78 | 23.40 |
| 10 | LIN-KP2744-035 | LIN | KP2744-035 | Contact Tip .035 | 10 | ea | 0.72 | 7.20 |

**Notes:**
- SKD uses manufacturer prefixes: CMI (CM Industries), BER (Bernard), LIN (Lincoln)
- UOM embedded in Qty column (e.g., "4 ea")
- Ship-to: SKD Supply LLC, York PA (same as billing)
- Mix of your products (CMI-) and competitor products (BER-, LIN-)

---

## Vendor Mappings Table (Ready to Import)

Copy this data into your Vendor_Mappings sheet:

```csv
id,vendor_id,vendor_part_number,manufacturer_part,internal_sku,confidence,source,times_seen,last_seen_at,verified,notes
1,powerweld,B422,,YOUR_SKU_HERE,100,manual,1,2026-01-25,FALSE,Trigger 600V
2,linde,CMUC315-3545,C315-3545,YOUR_SKU_HERE,100,manual,1,2026-01-25,FALSE,Gun 300A 15FT TWECO DP
3,linde,C315-3545,,YOUR_SKU_HERE,95,manual,1,2026-01-25,FALSE,MFG part - maps to same product as CMUC315-3545
4,matheson,CMD 4636001,046-36-001,YOUR_SKU_HERE,100,manual,1,2026-01-25,FALSE,CM Head Insulator
5,matheson,046-36-001,,YOUR_SKU_HERE,95,manual,1,2026-01-25,FALSE,MFG part - maps to same product
6,skd_supply,CMI-B5662,B5662,YOUR_SKU_HERE,100,manual,1,2026-01-25,FALSE,Trigger Assy - YOUR product
7,skd_supply,BER-L4A-15,L4A-15,NOT_YOUR_PRODUCT,50,manual,1,2026-01-25,FALSE,Bernard product - may need to stock or refer
8,skd_supply,BER-L7A-15,L7A-15,NOT_YOUR_PRODUCT,50,manual,1,2026-01-25,FALSE,Bernard product
9,skd_supply,BER-T1116,T1116,NOT_YOUR_PRODUCT,50,manual,1,2026-01-25,FALSE,Bernard product
10,skd_supply,BER-N1C12Q,N1C12Q,NOT_YOUR_PRODUCT,50,manual,1,2026-01-25,FALSE,Bernard product
11,skd_supply,BER-N2C38HQ,N2C38HQ,NOT_YOUR_PRODUCT,50,manual,1,2026-01-25,FALSE,Bernard product
12,skd_supply,BER-N1C34HQ,N1C34HQ,NOT_YOUR_PRODUCT,50,manual,1,2026-01-25,FALSE,Bernard product
13,skd_supply,LIN-KP2742-1-50R,KP2742-1-50R,NOT_YOUR_PRODUCT,50,manual,1,2026-01-25,FALSE,Lincoln product
14,skd_supply,LIN-KP2744-035T,KP2744-035T,NOT_YOUR_PRODUCT,50,manual,1,2026-01-25,FALSE,Lincoln product
15,skd_supply,LIN-KP2744-035,KP2744-035,NOT_YOUR_PRODUCT,50,manual,1,2026-01-25,FALSE,Lincoln product
```

---

## Action Required: Your Internal SKUs

You need to fill in `YOUR_SKU_HERE` with your actual internal product SKUs. Based on the product descriptions, here's what I identified as YOUR products (CM Industries):

| Vendor Part | Description | Likely Your Product? | Action Needed |
|-------------|-------------|---------------------|---------------|
| B422 | Trigger 600 V | YES | Provide your SKU |
| CMUC315-3545 / C315-3545 | Gun 300A 15FT TWECO DP | YES | Provide your SKU |
| CMD 4636001 / 046-36-001 | CM Head Insulator | YES | Provide your SKU |
| CMI-B5662 | Trigger Assy | YES | Provide your SKU |
| BER-* products | Bernard brand | NO | Mark as competitor or stock |
| LIN-* products | Lincoln brand | NO | Mark as competitor or stock |

---

## Unique Part Numbers by Vendor

### Your Products (CM Industries) - Need SKU Mapping:
1. **B422** - Trigger 600 V
2. **C315-3545** - Gun 300A 15FT TWECO DP
3. **046-36-001** - CM Head Insulator
4. **B5662** - Trigger Assy

### Competitor Products (for reference only):
- Bernard: L4A-15, L7A-15, T1116, N1C12Q, N2C38HQ, N1C34HQ
- Lincoln: KP2742-1-50R, KP2744-035T, KP2744-035

---

## Next Steps

1. **Provide your internal SKUs** for the 4 CM Industries products identified above
2. **Create your Products table** with these items
3. **Import the Vendor_Mappings data** with correct SKUs
4. **Decide how to handle competitor products** (Bernard, Lincoln) - flag for review? auto-reject?
