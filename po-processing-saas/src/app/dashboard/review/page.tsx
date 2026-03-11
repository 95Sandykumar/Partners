'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardCheck, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface PaginatedResponse {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 85) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{confidence}%</Badge>;
  }
  if (confidence >= 60) {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{confidence}%</Badge>;
  }
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{confidence}%</Badge>;
}

export default function ReviewQueuePage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['review-queue', statusFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/review-queue?status=${statusFilter}&page=${page}&limit=20`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const reviews = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const total = response?.total || 0;

  // Reset page when filter changes
  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Queue</h2>
          <p className="text-muted-foreground">
            POs that need human review before approval
            {total > 0 && <span className="ml-1">({total} total)</span>}
          </p>
        </div>
        <Select value={statusFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => {
                  const po = review.purchase_order as Record<string, unknown>;
                  const vendor = po?.vendor as Record<string, unknown>;
                  return (
                    <TableRow key={review.id as string}>
                      <TableCell className="font-medium">
                        {po?.po_number as string}
                      </TableCell>
                      <TableCell>
                        {(vendor?.vendor_name as string) || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <ConfidenceBadge
                          confidence={po?.extraction_confidence as number || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={review.priority === 2 ? 'destructive' : 'secondary'}>
                          {review.priority === 2 ? 'High' : 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {((review.reason as string[]) || []).join(', ')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(review.created_at as string).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/review/${po?.id}`}>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold">No items to review</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter === 'pending'
                  ? 'All POs have been reviewed. Upload new POs to see them here.'
                  : 'No items match the selected filter.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
