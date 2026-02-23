'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { POWithDetails, LineItemEdit } from '@/types/po';

export function usePOReview(poId: string) {
  const queryClient = useQueryClient();
  const [lineItemEdits, setLineItemEdits] = useState<LineItemEdit[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    data: poData,
    isLoading: poLoading,
    error,
  } = useQuery({
    queryKey: ['po', poId],
    queryFn: async () => {
      const res = await fetch(`/api/po/${poId}`);
      if (!res.ok) throw new Error('Failed to fetch PO');
      return res.json() as Promise<POWithDetails & { pdf_url: string }>;
    },
  });

  const hasChanges = lineItemEdits.length > 0;

  const handleLineItemsChange = useCallback((updates: LineItemEdit[]) => {
    setLineItemEdits(updates);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/po/${poId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_items: lineItemEdits }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Changes saved');
      setLineItemEdits([]);
      queryClient.invalidateQueries({ queryKey: ['po', poId] });
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  }, [poId, lineItemEdits, hasChanges, queryClient]);

  const handleApprove = useCallback(
    async (notes: string) => {
      setLoading(true);
      try {
        // Build new mappings from manually matched items
        const newMappings = lineItemEdits
          .filter((edit) => edit.matched_internal_sku && edit.match_method === 'manual')
          .map((edit) => {
            const originalItem = poData?.line_items?.find((li) => li.id === edit.id);
            return {
              vendor_id: poData?.vendor_id,
              vendor_part_number: edit.vendor_part_number || originalItem?.vendor_part_number,
              manufacturer_part_number:
                edit.manufacturer_part_number || originalItem?.manufacturer_part_number,
              internal_sku: edit.matched_internal_sku,
              confidence: 100,
            };
          })
          .filter((m) => m.vendor_id && m.vendor_part_number && m.internal_sku);

        const res = await fetch(`/api/po/${poId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            line_items: lineItemEdits,
            review_notes: notes,
            new_mappings: newMappings,
          }),
        });

        if (!res.ok) throw new Error('Approval failed');
        toast.success('PO approved successfully');
        setLineItemEdits([]);
        queryClient.invalidateQueries({ queryKey: ['po', poId] });
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      } catch {
        toast.error('Failed to approve PO');
      } finally {
        setLoading(false);
      }
    },
    [poId, lineItemEdits, poData, queryClient]
  );

  const handleReject = useCallback(
    async (notes: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/po/${poId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reject',
            review_notes: notes,
          }),
        });

        if (!res.ok) throw new Error('Rejection failed');
        toast.success('PO rejected');
        queryClient.invalidateQueries({ queryKey: ['po', poId] });
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      } catch {
        toast.error('Failed to reject PO');
      } finally {
        setLoading(false);
      }
    },
    [poId, queryClient]
  );

  return {
    po: poData as POWithDetails | undefined,
    pdfUrl: (poData as unknown as Record<string, unknown>)?.pdf_url as string | undefined,
    isLoading: poLoading,
    error,
    hasChanges,
    loading,
    handleLineItemsChange,
    handleSave,
    handleApprove,
    handleReject,
  };
}
