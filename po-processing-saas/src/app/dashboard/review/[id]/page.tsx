'use client';

import { use } from 'react';
import { usePOReview } from '@/hooks/use-po-review';
import { POReviewLayout } from '@/components/po-review/po-review-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function POReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    po,
    pdfUrl,
    isLoading,
    error,
    hasChanges,
    loading,
    handleLineItemsChange,
    handleSave,
    handleApprove,
    handleReject,
  } = usePOReview(id);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-destructive">Failed to load purchase order</p>
        <Link href="/dashboard/review">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review Queue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/review">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-lg font-semibold">Review PO #{po.po_number}</h2>
      </div>
      <div className="flex-1 min-h-0">
        <POReviewLayout
          po={po}
          pdfUrl={pdfUrl || ''}
          onLineItemsChange={handleLineItemsChange}
          onApprove={handleApprove}
          onReject={handleReject}
          onSave={handleSave}
          hasChanges={hasChanges}
          loading={loading}
        />
      </div>
    </div>
  );
}
