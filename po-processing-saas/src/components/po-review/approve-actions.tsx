'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Save, Loader2 } from 'lucide-react';

interface ApproveActionsProps {
  poId: string;
  onApprove: (notes: string) => Promise<void>;
  onReject: (notes: string) => Promise<void>;
  onSave: () => Promise<void>;
  hasChanges: boolean;
  loading: boolean;
}

export function ApproveActions({
  poId,
  onApprove,
  onReject,
  onSave,
  hasChanges,
  loading,
}: ApproveActionsProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  return (
    <div className="flex items-center gap-2">
      {hasChanges && (
        <Button
          variant="outline"
          onClick={onSave}
          disabled={loading}
          size="sm"
        >
          {loading ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Save className="mr-2 h-3 w-3" />
          )}
          Save Draft
        </Button>
      )}

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            <CheckCircle className="mr-2 h-3 w-3" />
            Approve
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve PO</DialogTitle>
            <DialogDescription>
              Approve this purchase order and save any corrections as new part mappings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approve-notes">Notes (optional)</Label>
            <Textarea
              id="approve-notes"
              placeholder="Add any review notes..."
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => onApprove(approveNotes)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={loading}>
            <XCircle className="mr-2 h-3 w-3" />
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject PO</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this purchase order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-notes">Rejection Reason</Label>
            <Textarea
              id="reject-notes"
              placeholder="Why is this PO being rejected?"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                onReject(rejectNotes);
                setRejectDialogOpen(false);
              }}
              disabled={loading || !rejectNotes.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
