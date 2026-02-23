'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { PdfViewerPanel } from './pdf-viewer-panel';
import { DataPanel } from './data-panel';
import type { POWithDetails, LineItemEdit } from '@/types/po';

interface POReviewLayoutProps {
  po: POWithDetails;
  pdfUrl: string;
  onLineItemsChange: (updates: LineItemEdit[]) => void;
  onApprove: (notes: string) => Promise<void>;
  onReject: (notes: string) => Promise<void>;
  onSave: () => Promise<void>;
  hasChanges: boolean;
  loading: boolean;
}

export function POReviewLayout({
  po,
  pdfUrl,
  onLineItemsChange,
  onApprove,
  onReject,
  onSave,
  hasChanges,
  loading,
}: POReviewLayoutProps) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full rounded-lg border">
      <ResizablePanel defaultSize={50} minSize={30}>
        <PdfViewerPanel pdfUrl={pdfUrl} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30}>
        <DataPanel
          po={po}
          onLineItemsChange={onLineItemsChange}
          onApprove={onApprove}
          onReject={onReject}
          onSave={onSave}
          hasChanges={hasChanges}
          loading={loading}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
