'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_review: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  processed: 'outline',
};

function ConfidenceBadge({ value }: { value: number }) {
  const className =
    value >= 85
      ? 'bg-green-100 text-green-800 hover:bg-green-100'
      : value >= 60
      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
      : 'bg-red-100 text-red-800 hover:bg-red-100';
  return <Badge className={className}>{value.toFixed(0)}%</Badge>;
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function PODetailPage() {
  const params = useParams();
  const poId = params.id as string;

  const { data: po, isLoading, error } = useQuery({
    queryKey: ['po', poId],
    queryFn: async () => {
      const res = await fetch(`/api/po/${poId}`);
      if (!res.ok) throw new Error('Failed to fetch PO');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold">Purchase order not found</h3>
        <Link href="/dashboard/pos" className="mt-4">
          <Button variant="outline">Back to POs</Button>
        </Link>
      </div>
    );
  }

  const lineItems = po.line_items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              PO #{po.po_number}
            </h2>
            <Badge variant={statusColors[po.status] || 'secondary'}>
              {po.status?.replace('_', ' ')}
            </Badge>
            {po.extraction_confidence != null && (
              <ConfidenceBadge value={po.extraction_confidence} />
            )}
          </div>
        </div>
        {po.pdf_url && (
          <a href={po.pdf_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              View PDF
            </Button>
          </a>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{po.vendor?.vendor_name || 'Unknown'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PO Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {po.po_date ? new Date(po.po_date).toLocaleDateString() : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {po.total ? fmt.format(po.total) : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{lineItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reviewed By</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{po.reviewed_by || 'Pending'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {new Date(po.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lineItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Vendor Part #</TableHead>
                  <TableHead>MFG Part #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Extended</TableHead>
                  <TableHead>Matched SKU</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item: Record<string, unknown>, idx: number) => (
                  <TableRow key={item.id as string}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.vendor_part_number as string}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {(item.manufacturer_part_number as string) || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.description as string}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity as number}</TableCell>
                    <TableCell className="text-right">
                      {item.unit_price != null ? fmt.format(item.unit_price as number) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.extended_price != null ? fmt.format(item.extended_price as number) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {(item.matched_internal_sku as string) || (
                        <span className="text-muted-foreground">Unmatched</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.match_confidence != null ? (
                        <ConfidenceBadge value={item.match_confidence as number} />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No line items
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
