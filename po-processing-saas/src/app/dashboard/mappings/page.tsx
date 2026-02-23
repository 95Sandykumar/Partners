'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Link2, Plus, Upload, Search, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MappingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    vendor_id: '',
    vendor_part_number: '',
    manufacturer_part_number: '',
    internal_sku: '',
    confidence: '100',
    match_source: 'manual',
  });

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['mappings', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/mappings?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await fetch('/api/vendors');
      if (!res.ok) return [];
      return res.json();
    },
  });

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch('/api/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          confidence: parseInt(form.confidence),
        }),
      });
      if (!res.ok) throw new Error('Failed to create mapping');

      toast.success('Mapping created');
      setDialogOpen(false);
      setForm({
        vendor_id: '',
        vendor_part_number: '',
        manufacturer_part_number: '',
        internal_sku: '',
        confidence: '100',
        match_source: 'manual',
      });
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
    } catch {
      toast.error('Failed to create mapping');
    } finally {
      setSaving(false);
    }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error('CSV file is empty');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = values[i] || ''));
      return row;
    });

    const mappingRows = rows
      .filter((r) => r.vendor_part_number && r.internal_sku && r.vendor_id)
      .map((r) => ({
        vendor_id: r.vendor_id,
        vendor_part_number: r.vendor_part_number,
        manufacturer_part_number: r.manufacturer_part_number || null,
        internal_sku: r.internal_sku,
        confidence: parseInt(r.confidence || '100'),
        match_source: r.match_source || 'manual',
        is_verified: r.verified === 'true' || r.is_verified === 'true',
      }));

    if (mappingRows.length === 0) {
      toast.error('No valid rows found. Ensure CSV has: vendor_id, vendor_part_number, internal_sku');
      return;
    }

    try {
      const res = await fetch('/api/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingRows),
      });

      if (!res.ok) throw new Error('Import failed');
      const data = await res.json();
      toast.success(`Imported ${data.inserted} mappings`);
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
    } catch {
      toast.error('CSV import failed');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Part Mappings</h2>
          <p className="text-muted-foreground">
            Map vendor part numbers to your internal SKUs
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvImport}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Mapping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Part Mapping</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Select
                    value={form.vendor_id}
                    onValueChange={(v) => setForm({ ...form, vendor_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {(vendors || []).map((v: Record<string, unknown>) => (
                        <SelectItem key={v.id as string} value={v.id as string}>
                          {v.vendor_name as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vendor Part Number</Label>
                  <Input
                    placeholder="e.g., CMUC315-3545"
                    value={form.vendor_part_number}
                    onChange={(e) =>
                      setForm({ ...form, vendor_part_number: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer Part Number (optional)</Label>
                  <Input
                    placeholder="e.g., C315-3545"
                    value={form.manufacturer_part_number}
                    onChange={(e) =>
                      setForm({ ...form, manufacturer_part_number: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Internal SKU</Label>
                  <Input
                    placeholder="e.g., GUN-300A-15"
                    value={form.internal_sku}
                    onChange={(e) =>
                      setForm({ ...form, internal_sku: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={
                    saving ||
                    !form.vendor_id ||
                    !form.vendor_part_number ||
                    !form.internal_sku
                  }
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Mapping
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search mappings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
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
          ) : mappings && mappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Vendor Part #</TableHead>
                  <TableHead>MFG Part #</TableHead>
                  <TableHead>Internal SKU</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping: Record<string, unknown>) => (
                  <TableRow key={mapping.id as string}>
                    <TableCell className="text-sm">
                      {(mapping.vendor as Record<string, unknown>)?.vendor_name as string || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {mapping.vendor_part_number as string}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {(mapping.manufacturer_part_number as string) || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {mapping.internal_sku as string}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          (mapping.confidence as number) >= 90
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                        }
                      >
                        {mapping.confidence as number}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {mapping.match_source as string}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mapping.is_verified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mapping.times_seen as number}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <Link2 className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold">No mappings yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add part number mappings to enable auto-matching.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
