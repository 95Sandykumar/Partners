'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, GitCompare } from 'lucide-react';

export default function AuditLogPage() {
  const [vendorFilter, setVendorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const supabase = createClient();

  const { data: extractionLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['extraction-logs', vendorFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('extraction_logs')
        .select('*, vendor:vendors(vendor_name, vendor_id), purchase_order:purchase_orders(po_number)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (vendorFilter) {
        query = query.ilike('vendor:vendors.vendor_name', `%${vendorFilter}%`);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: corrections, isLoading: correctionsLoading } = useQuery({
    queryKey: ['extraction-corrections', vendorFilter, dateFrom, dateTo, fieldFilter],
    queryFn: async () => {
      let query = supabase
        .from('extraction_corrections')
        .select('*, vendor:vendors(vendor_name), purchase_order:purchase_orders(po_number)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }
      if (fieldFilter) {
        query = query.eq('field_name', fieldFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View extraction history and operator corrections
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Vendor</Label>
              <Input
                placeholder="Filter by vendor..."
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Field Name</Label>
              <Input
                placeholder="e.g. quantity, unit_price..."
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Extraction Logs
          </TabsTrigger>
          <TabsTrigger value="corrections" className="gap-1.5">
            <GitCompare className="h-4 w-4" />
            Corrections
          </TabsTrigger>
        </TabsList>

        {/* Extraction Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Extraction Logs</CardTitle>
              <CardDescription>History of all PO extractions with confidence and match data</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {logsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                        <TableHead className="text-right">Lines</TableHead>
                        <TableHead className="text-right">Matched</TableHead>
                        <TableHead className="text-right">Time (ms)</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractionLogs?.map((log) => {
                        const vendor = log.vendor as unknown as { vendor_name: string } | null;
                        const po = log.purchase_order as unknown as { po_number: string } | null;
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {po?.po_number || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {vendor?.vendor_name || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={log.extraction_confidence >= 85 ? 'default' : log.extraction_confidence >= 60 ? 'secondary' : 'destructive'}>
                                {Math.round(log.extraction_confidence)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">{log.line_count}</TableCell>
                            <TableCell className="text-right text-sm">{log.matched_count}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {log.processing_time_ms?.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              ${log.api_cost?.toFixed(4) || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.success ? 'default' : 'destructive'}>
                                {log.success ? 'OK' : 'Error'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {extractionLogs?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No extraction logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Corrections */}
        <TabsContent value="corrections">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Operator Corrections</CardTitle>
              <CardDescription>Fields corrected by operators during PO review</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {correctionsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Line</TableHead>
                        <TableHead>AI Value</TableHead>
                        <TableHead>Corrected Value</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {corrections?.map((correction) => {
                        const vendor = correction.vendor as unknown as { vendor_name: string } | null;
                        const po = correction.purchase_order as unknown as { po_number: string } | null;
                        return (
                          <TableRow key={correction.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(correction.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {po?.po_number || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {vendor?.vendor_name || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{correction.field_name}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {correction.line_number ?? '-'}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate text-sm text-destructive">
                              {correction.ai_extracted_value || '-'}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate text-sm text-green-600">
                              {correction.corrected_value || '-'}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {correction.extraction_confidence != null
                                ? `${Math.round(correction.extraction_confidence)}%`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {corrections?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No corrections found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
