'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Package, Plus, Loader2, Upload, Search, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  internal_sku: string;
  description: string;
  category: string;
  brand: string;
  unit_price: number;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  internal_sku: '',
  description: '',
  category: '',
  brand: '',
  unit_price: '',
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '200');
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const filteredProducts = products?.filter((p) => {
    if (filter === 'active') return p.is_active;
    if (filter === 'inactive') return !p.is_active;
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          unit_price: parseFloat(data.unit_price) || 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingProduct ? 'Product updated' : 'Product created');
      setDialogOpen(false);
      setEditingProduct(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Failed to save product'),
  });

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      internal_sku: product.internal_sku,
      description: product.description,
      category: product.category,
      brand: product.brand,
      unit_price: product.unit_price.toString(),
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      toast.error('CSV must have a header row and at least one data row');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const skuIdx = headers.findIndex((h) => h.includes('sku') || h.includes('part'));
    const descIdx = headers.findIndex((h) => h.includes('desc'));
    const catIdx = headers.findIndex((h) => h.includes('cat'));
    const brandIdx = headers.findIndex((h) => h.includes('brand'));
    const priceIdx = headers.findIndex((h) => h.includes('price'));

    if (skuIdx === -1) {
      toast.error('CSV must have a column with "sku" or "part" in the header');
      return;
    }

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      return {
        internal_sku: cols[skuIdx] || '',
        description: descIdx >= 0 ? cols[descIdx] : '',
        category: catIdx >= 0 ? cols[catIdx] : '',
        brand: brandIdx >= 0 ? cols[brandIdx] : '',
        unit_price: priceIdx >= 0 ? parseFloat(cols[priceIdx]) || 0 : 0,
      };
    }).filter((r) => r.internal_sku);

    try {
      setSaving(true);
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      });

      if (!res.ok) throw new Error('Import failed');
      const result = await res.json();
      toast.success(`Imported ${result.inserted} products`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch {
      toast.error('Failed to import CSV');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">
            Manage your product catalog and part numbers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVImport}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Internal SKU</Label>
                  <Input
                    placeholder="e.g., B422"
                    value={form.internal_sku}
                    onChange={(e) => setForm({ ...form, internal_sku: e.target.value })}
                    disabled={!!editingProduct}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g., Trigger 600 V"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      placeholder="e.g., Triggers"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      placeholder="e.g., CM Industries"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Unit Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.unit_price}
                    onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending || !form.internal_sku}
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingProduct ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by SKU, description, or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
          <span className="ml-3 text-sm text-muted-foreground">
            {filteredProducts?.length ?? 0} products
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">SKU</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead className="w-[130px]">Brand</TableHead>
                  <TableHead className="w-[100px] text-right">Price</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium font-mono text-sm">
                      {product.internal_sku}
                    </TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.category || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {product.brand || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${product.unit_price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {product.is_active ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/products', {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: product.id }),
                                });
                                if (!res.ok) throw new Error('Failed to delete');
                                queryClient.invalidateQueries({ queryKey: ['products'] });
                                toast.success('Product deleted');
                              } catch {
                                toast.error('Failed to delete product');
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold">No products yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add products or import a CSV to start matching PO line items.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
