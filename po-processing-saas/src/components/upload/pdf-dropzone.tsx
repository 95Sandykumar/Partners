'use client';

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { UploadResult } from '@/types/po';

// ---------- Types ----------

type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

interface FileEntry {
  /** Unique key for React rendering */
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  result?: UploadResult;
  error?: string;
}

// ---------- Helpers ----------

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

let entryIdCounter = 0;
function nextEntryId(): string {
  return `file-${++entryIdCounter}-${Date.now()}`;
}

// ---------- Component ----------

export function PdfDropzone() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const abortRef = useRef(false);

  // ---- Dropzone ----

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (isProcessing) return;

      const newEntries: FileEntry[] = acceptedFiles.map((file) => ({
        id: nextEntryId(),
        file,
        status: 'pending' as const,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newEntries]);
      setBatchDone(false);
    },
    [isProcessing]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    maxSize: 20 * 1024 * 1024, // 20MB per file
    disabled: isProcessing,
  });

  // ---- File management ----

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function clearAll() {
    setFiles([]);
    setBatchDone(false);
    abortRef.current = false;
  }

  function resetForMore() {
    setFiles([]);
    setBatchDone(false);
    abortRef.current = false;
  }

  // ---- Upload logic ----

  async function uploadSingleFile(entry: FileEntry): Promise<FileEntry> {
    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.id === entry.id
          ? { ...f, status: 'uploading' as const, progress: 10 }
          : f
      )
    );

    try {
      const formData = new FormData();
      formData.append('file', entry.file);

      // Simulate progress stages
      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, progress: 30 } : f))
      );

      const res = await fetch('/api/po/upload', {
        method: 'POST',
        body: formData,
      });

      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, progress: 90 } : f))
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data: UploadResult = await res.json();

      const updated: FileEntry = {
        ...entry,
        status: 'success',
        progress: 100,
        result: data,
      };

      setFiles((prev) => prev.map((f) => (f.id === entry.id ? updated : f)));
      return updated;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Upload failed';

      const updated: FileEntry = {
        ...entry,
        status: 'error',
        progress: 0,
        error: errorMessage,
      };

      setFiles((prev) => prev.map((f) => (f.id === entry.id ? updated : f)));
      return updated;
    }
  }

  async function handleUploadAll() {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);
    setBatchDone(false);
    abortRef.current = false;

    let successCount = 0;
    let errorCount = 0;

    // Process sequentially to avoid API rate limits
    for (const entry of pendingFiles) {
      if (abortRef.current) break;

      const result = await uploadSingleFile(entry);
      if (result.status === 'success') {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setIsProcessing(false);
    setBatchDone(true);

    // Toast notification for overall completion
    const total = successCount + errorCount;
    if (errorCount === 0) {
      toast.success(
        `All ${total} file${total > 1 ? 's' : ''} processed successfully`
      );
    } else if (successCount === 0) {
      toast.error(`All ${total} file${total > 1 ? 's' : ''} failed`);
    } else {
      toast.warning(
        `${successCount} succeeded, ${errorCount} failed out of ${total} files`
      );
    }
  }

  // ---- Derived state ----

  const pendingFiles = files.filter((f) => f.status === 'pending');
  const successFiles = files.filter((f) => f.status === 'success');
  const errorFiles = files.filter((f) => f.status === 'error');
  const hasFiles = files.length > 0;
  const canUpload = pendingFiles.length > 0 && !isProcessing;

  // ---- Render helpers ----

  function renderStatusBadge(entry: FileEntry) {
    switch (entry.status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="text-xs">
            Pending
          </Badge>
        );
      case 'uploading':
        return (
          <Badge variant="default" className="text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading...
          </Badge>
        );
      case 'success':
        return (
          <Badge
            variant="outline"
            className="text-xs border-green-500 text-green-700 dark:text-green-400"
          >
            <Check className="h-3 w-3" />
            PO #{entry.result?.po_number}
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
    }
  }

  function renderFileRow(entry: FileEntry) {
    const isActive = entry.status === 'uploading';
    const isDone = entry.status === 'success' || entry.status === 'error';

    return (
      <div key={entry.id} className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <FileText
              className={cn(
                'h-5 w-5 shrink-0',
                entry.status === 'success'
                  ? 'text-green-500'
                  : entry.status === 'error'
                  ? 'text-destructive'
                  : 'text-primary'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{entry.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(entry.file.size)}
                {entry.error && (
                  <span className="text-destructive ml-2">
                    &mdash; {entry.error}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {renderStatusBadge(entry)}

            {entry.status === 'success' && entry.result && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() =>
                  (window.location.href = `/dashboard/review/${entry.result!.purchase_order_id}`)
                }
              >
                Review
              </Button>
            )}

            {!isActive && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeFile(entry.id)}
                disabled={isProcessing && !isDone}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isActive && (
          <div className="pl-8">
            <Progress value={entry.progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {entry.progress < 30
                ? 'Uploading PDF...'
                : entry.progress < 90
                ? 'Extracting data with AI...'
                : 'Finalizing...'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ---- Main render ----

  return (
    <div className="space-y-4">
      {/* Dropzone area - always visible unless batch is done */}
      {!batchDone && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
            isProcessing
              ? 'border-muted-foreground/15 bg-muted/50 cursor-not-allowed opacity-60'
              : isDragActive
              ? 'border-primary bg-primary/5 cursor-pointer'
              : 'border-muted-foreground/25 hover:border-primary/50 cursor-pointer'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-lg font-medium">Drop PDFs here...</p>
          ) : (
            <>
              <p className="text-lg font-medium">
                Drag & drop PO PDFs here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload one or more PDF files (up to 20MB each)
              </p>
            </>
          )}
        </div>
      )}

      {/* File list */}
      {hasFiles && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {files.map(renderFileRow)}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {hasFiles && !batchDone && (
        <div className="flex items-center gap-2">
          <Button onClick={handleUploadAll} disabled={!canUpload}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing (
                {successFiles.length + errorFiles.length + 1}/{files.length})
              </>
            ) : pendingFiles.length === 1 ? (
              'Extract & Process'
            ) : (
              `Upload All (${pendingFiles.length} files)`
            )}
          </Button>
          {!isProcessing && (
            <Button variant="outline" onClick={clearAll}>
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Summary card - shown when batch is done */}
      {batchDone && (
        <Card
          className={cn(
            'border',
            errorFiles.length === 0
              ? 'border-green-500'
              : successFiles.length === 0
              ? 'border-destructive'
              : 'border-yellow-500'
          )}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {errorFiles.length === 0 ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle
                  className={cn(
                    'h-6 w-6',
                    successFiles.length === 0
                      ? 'text-destructive'
                      : 'text-yellow-500'
                  )}
                />
              )}
              <div>
                <p className="font-semibold text-lg">
                  {files.length} file{files.length > 1 ? 's' : ''} processed
                </p>
                <p className="text-sm text-muted-foreground">
                  {successFiles.length} succeeded
                  {errorFiles.length > 0 &&
                    `, ${errorFiles.length} failed`}
                </p>
              </div>
            </div>

            {/* Individual results for successful uploads */}
            {successFiles.length > 0 && (
              <div className="space-y-2 mb-4">
                {successFiles.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-sm bg-green-50 dark:bg-green-950/20 rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        PO #{entry.result?.po_number}
                      </span>
                      <span className="text-muted-foreground">
                        &mdash; {entry.result?.vendor_detected || 'Unknown vendor'}
                        , {entry.result?.line_count} line items
                        , {entry.result?.extraction_confidence}% confidence
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        (window.location.href = `/dashboard/review/${entry.result!.purchase_order_id}`)
                      }
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Failed files */}
            {errorFiles.length > 0 && (
              <div className="space-y-2 mb-4">
                {errorFiles.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 text-sm bg-destructive/5 rounded-md px-3 py-2"
                  >
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="font-medium truncate">
                      {entry.file.name}
                    </span>
                    <span className="text-destructive text-xs">
                      &mdash; {entry.error}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForMore}>
                Upload More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
