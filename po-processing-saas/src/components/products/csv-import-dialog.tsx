'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import {
  autoMapColumns,
  parseCSV,
  PRODUCT_FIELD_ALIASES,
} from '@/lib/products/csv-column-aliases';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onImportComplete: (count: number) => void;
}

type Step = 'mapping' | 'preview' | 'importing' | 'done';

interface ImportResult {
  inserted: number;
  skipped: number;
  error?: string;
}

const NOT_MAPPED = '__not_mapped__';

export function CSVImportDialog({
  open,
  onOpenChange,
  file,
  onImportComplete,
}: CSVImportDialogProps) {
  const [step, setStep] = useState<Step>('mapping');
  const [mappings, setMappings] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  // Parse CSV when file changes
  const parsed = useMemo(() => {
    if (!file) return null;

    // Reset state when file changes
    setStep('mapping');
    setResult(null);

    // We need to read the file synchronously for useMemo
    // Since we can't do async in useMemo, we'll use a state approach
    return null;
  }, [file]);

  // Use separate state for parsed data since file reading is async
  const [parsedData, setParsedData] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);

  // Read file when it changes
  useMemo(() => {
    if (!file) {
      setParsedData(null);
      return;
    }

    file.text().then((text) => {
      const data = parseCSV(text);
      setParsedData(data);

      // Auto-map columns
      const autoMapped = autoMapColumns(data.headers);
      setMappings(autoMapped);
      setStep('mapping');
      setResult(null);
    });
  }, [file]);

  // Build preview rows from mappings
  const previewRows = useMemo(() => {
    if (!parsedData) return [];

    return parsedData.rows.map((row) => {
      const mapped: Record<string, string> = {};
      for (const { field } of PRODUCT_FIELD_ALIASES) {
        const colIdx = mappings[field];
        mapped[field] = colIdx !== null && colIdx !== undefined ? (row[colIdx] || '') : '';
      }
      return mapped;
    });
  }, [parsedData, mappings]);

  const validRows = previewRows.filter((r) => r.internal_sku?.trim());
  const skippedRows = previewRows.length - validRows.length;

  function updateMapping(field: string, value: string) {
    setMappings((prev) => ({
      ...prev,
      [field]: value === NOT_MAPPED ? null : parseInt(value, 10),
    }));
  }

  async function handleImport() {
    if (validRows.length === 0) return;

    setStep('importing');

    const products = validRows.map((row) => ({
      internal_sku: row.internal_sku.trim(),
      description: row.description || '',
      category: row.category || '',
      brand: row.brand || '',
      unit_price: parseFloat(row.unit_price?.replace(/[^0-9.]/g, '') || '0') || 0,
    }));

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      });

      if (!res.ok) throw new Error('Import failed');
      const data = await res.json();

      setResult({
        inserted: data.inserted || products.length,
        skipped: skippedRows,
      });
      setStep('done');
      onImportComplete(data.inserted || products.length);
    } catch {
      setResult({
        inserted: 0,
        skipped: 0,
        error: 'Import failed. Please check your CSV format and try again.',
      });
      setStep('done');
    }
  }

  function handleClose() {
    setStep('mapping');
    setResult(null);
    setParsedData(null);
    onOpenChange(false);
  }

  if (!parsedData || !file) return null;

  const hasSkuMapping = mappings.internal_sku !== null && mappings.internal_sku !== undefined;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Products from CSV
          </DialogTitle>
          <DialogDescription>
            {file.name} - {parsedData.rows.length} rows detected
          </DialogDescription>
        </DialogHeader>

        {/* Step: Column Mapping */}
        {step === 'mapping' && (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Map your CSV columns to product fields. We auto-detected what we could.
              </p>

              <div className="space-y-3">
                {PRODUCT_FIELD_ALIASES.map(({ field, label, required }) => {
                  const colIdx = mappings[field];
                  const isAutoMapped = colIdx !== null && colIdx !== undefined;

                  return (
                    <div
                      key={field}
                      className="flex items-center gap-3"
                    >
                      <div className="w-40 shrink-0 flex items-center gap-1.5">
                        {isAutoMapped ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : required ? (
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        ) : (
                          <div className="h-4 w-4 shrink-0" />
                        )}
                        <span className="text-sm font-medium">{label}</span>
                        {required && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Required
                          </Badge>
                        )}
                      </div>

                      <Select
                        value={colIdx !== null && colIdx !== undefined ? String(colIdx) : NOT_MAPPED}
                        onValueChange={(v) => updateMapping(field, v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Not mapped" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NOT_MAPPED}>
                            <span className="text-muted-foreground">Not mapped</span>
                          </SelectItem>
                          {parsedData.headers.map((header, idx) => (
                            <SelectItem key={idx} value={String(idx)}>
                              {header}
                              {parsedData.rows[0]?.[idx] && (
                                <span className="text-muted-foreground ml-2">
                                  (e.g. &quot;{parsedData.rows[0][idx].slice(0, 30)}&quot;)
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={!hasSkuMapping}
              >
                Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="default">{validRows.length} ready</Badge>
                {skippedRows > 0 && (
                  <Badge variant="destructive">{skippedRows} skipped (no SKU)</Badge>
                )}
              </div>

              <div className="border rounded-lg overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      {PRODUCT_FIELD_ALIASES.map(({ field, label }) => (
                        <TableHead key={field}>{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(0, 10).map((row, idx) => {
                      const hasSku = row.internal_sku?.trim();
                      return (
                        <TableRow
                          key={idx}
                          className={hasSku ? '' : 'bg-destructive/5 text-muted-foreground'}
                        >
                          <TableCell className="text-xs">{idx + 1}</TableCell>
                          {PRODUCT_FIELD_ALIASES.map(({ field }) => (
                            <TableCell key={field} className="text-sm max-w-[150px] truncate">
                              {row[field] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                    {previewRows.length > 10 && (
                      <TableRow>
                        <TableCell
                          colSpan={PRODUCT_FIELD_ALIASES.length + 1}
                          className="text-center text-sm text-muted-foreground"
                        >
                          ... and {previewRows.length - 10} more rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>
                Import {validRows.length} Products
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Importing {validRows.length} products...
            </p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && result && (
          <>
            <div className="flex flex-col items-center gap-4 py-6">
              {result.error ? (
                <>
                  <AlertCircle className="h-10 w-10 text-destructive" />
                  <p className="text-sm text-destructive text-center">{result.error}</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">
                      Successfully imported {result.inserted} products
                    </p>
                    {result.skipped > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {result.skipped} rows skipped (missing SKU)
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                {result.error ? 'Close' : 'Done'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
