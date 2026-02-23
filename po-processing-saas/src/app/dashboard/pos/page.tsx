'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileText, ExternalLink, Download } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending_review: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  processed: 'outline',
};

export default function POsPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: pos, isLoading } = useQuery({
    queryKey: ['pos', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '100');
      const res = await fetch(`/api/po?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">All processed purchase orders</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/po/export${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`}>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </a>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pos && pos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.map((po: Record<string, unknown>) => (
                  <TableRow key={po.id as string}>
                    <TableCell className="font-medium">{po.po_number as string}</TableCell>
                    <TableCell>
                      {(po.vendor as Record<string, unknown>)?.vendor_name as string || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {po.po_date
                        ? new Date(po.po_date as string).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {po.total ? `$${Number(po.total).toFixed(2)}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {po.extraction_confidence != null && (
                        <Badge
                          className={
                            (po.extraction_confidence as number) >= 85
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : (po.extraction_confidence as number) >= 60
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                              : 'bg-red-100 text-red-800 hover:bg-red-100'
                          }
                        >
                          {(po.extraction_confidence as number).toFixed(0)}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[po.status as string] as 'default' | 'secondary' | 'destructive' | 'outline' || 'secondary'}>
                        {(po.status as string).replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/pos/${po.id}`}>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold">No purchase orders</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your first PO to see it here.
              </p>
              <Link href="/dashboard/upload" className="mt-4">
                <Button>Upload PO</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
