'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ConfidenceBadge } from './confidence-badge';
import { EditableLineItems } from './editable-line-items';
import { ApproveActions } from './approve-actions';
import type { POWithDetails, LineItemEdit } from '@/types/po';

interface DataPanelProps {
  po: POWithDetails;
  onLineItemsChange: (updates: LineItemEdit[]) => void;
  onApprove: (notes: string) => Promise<void>;
  onReject: (notes: string) => Promise<void>;
  onSave: () => Promise<void>;
  hasChanges: boolean;
  loading: boolean;
}

export function DataPanel({
  po,
  onLineItemsChange,
  onApprove,
  onReject,
  onSave,
  hasChanges,
  loading,
}: DataPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header Info */}
      <div className="border-b p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">PO #{po.po_number}</h3>
            <Badge
              variant={
                po.status === 'approved'
                  ? 'default'
                  : po.status === 'rejected'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {po.status.replace('_', ' ')}
            </Badge>
            {po.extraction_confidence != null && (
              <ConfidenceBadge confidence={po.extraction_confidence} />
            )}
          </div>
          {po.status === 'pending_review' && (
            <ApproveActions
              poId={po.id}
              onApprove={onApprove}
              onReject={onReject}
              onSave={onSave}
              hasChanges={hasChanges}
              loading={loading}
            />
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Vendor</p>
            <p className="font-medium">{po.vendor?.vendor_name || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">PO Date</p>
            <p className="font-medium">
              {po.po_date
                ? new Date(po.po_date).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total</p>
            <p className="font-medium">
              {po.total ? `$${Number(po.total).toFixed(2)}` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Line Items</p>
            <p className="font-medium">{po.line_items?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="flex-1 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-medium text-sm">Line Items</h4>
          <p className="text-xs text-muted-foreground">
            Double-click any cell to edit
          </p>
        </div>

        {po.line_items && po.line_items.length > 0 ? (
          <EditableLineItems
            lineItems={po.line_items}
            onChange={onLineItemsChange}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No line items extracted
          </div>
        )}

        {/* Review Queue Info */}
        {po.review_queue_item && (
          <>
            <Separator className="my-4" />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Review Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {po.review_queue_item.reason &&
                  po.review_queue_item.reason.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Review Reasons:
                      </p>
                      <ul className="list-disc list-inside text-xs mt-1">
                        {po.review_queue_item.reason.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {po.review_queue_item.review_notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notes:</p>
                    <p className="text-xs">{po.review_queue_item.review_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
