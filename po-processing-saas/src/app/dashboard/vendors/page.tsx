'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Building2, Plus, Loader2, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendor_id: '',
    vendor_name: '',
    email_domains: '',
    keywords: '',
    po_format_type: 'simple',
  });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await fetch('/api/vendors');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email_domains: form.email_domains
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean),
          keywords: form.keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error('Failed to create vendor');

      toast.success('Vendor created');
      setDialogOpen(false);
      setForm({
        vendor_id: '',
        vendor_name: '',
        email_domains: '',
        keywords: '',
        po_format_type: 'simple',
      });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    } catch {
      toast.error('Failed to create vendor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vendor Management</h2>
          <p className="text-muted-foreground">
            Manage vendors and their PO templates
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vendor ID (slug)</Label>
                <Input
                  placeholder="e.g., powerweld"
                  value={form.vendor_id}
                  onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  placeholder="e.g., Powerweld Inc."
                  value={form.vendor_name}
                  onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Domains (comma-separated)</Label>
                <Input
                  placeholder="e.g., powerweld.com, powerweldinc.com"
                  value={form.email_domains}
                  onChange={(e) => setForm({ ...form, email_domains: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Keywords (comma-separated)</Label>
                <Input
                  placeholder="e.g., POWERWELD, Valparaiso"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>PO Format Type</Label>
                <Select
                  value={form.po_format_type}
                  onValueChange={(v) => setForm({ ...form, po_format_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={saving || !form.vendor_id || !form.vendor_name}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Vendor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : vendors && vendors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email Domains</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Template</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor: Record<string, unknown>) => (
                  <TableRow key={vendor.id as string}>
                    <TableCell className="font-medium font-mono text-sm">
                      {vendor.vendor_id as string}
                    </TableCell>
                    <TableCell>{vendor.vendor_name as string}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {((vendor.email_domains as string[]) || []).join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{vendor.po_format_type as string}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/vendors/${vendor.id}/templates`}>
                        {(vendor.templates as unknown[])?.length > 0 ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 cursor-pointer">
                            <FileCode className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="cursor-pointer">
                            <FileCode className="h-3 w-3 mr-1" />
                            Configure
                          </Badge>
                        )}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold">No vendors yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first vendor to start processing POs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
