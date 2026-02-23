'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { ArrowLeft, Plus, Save, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateData {
  vendor_id: string;
  vendor_name: string;
  version: string;
  po_format: {
    type: string;
    typical_pages: number;
    has_watermark: boolean;
    has_tables: boolean;
    has_legal_terms: boolean;
  };
  extraction_rules: {
    po_number: { label: string; pattern: string };
    line_items: {
      table_structure: string;
      column_headers: string[];
      part_number_column: string;
      vendor_part_column: string;
      mfg_part_pattern: string;
    };
  };
  part_number_patterns: string[];
  part_number_prefixes: Record<string, string>;
  pages_to_process: { line_items: number[]; skip_pages: number[] };
  confidence_adjustments: Record<string, number>;
}

interface VendorTemplate {
  id: string;
  vendor_id: string;
  version: string;
  template_data: TemplateData;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_TEMPLATE_DATA: TemplateData = {
  vendor_id: '',
  vendor_name: '',
  version: '1.0.0',
  po_format: {
    type: 'simple',
    typical_pages: 1,
    has_watermark: false,
    has_tables: true,
    has_legal_terms: false,
  },
  extraction_rules: {
    po_number: { label: '', pattern: '' },
    line_items: {
      table_structure: 'formal_table',
      column_headers: [],
      part_number_column: '',
      vendor_part_column: '',
      mfg_part_pattern: '',
    },
  },
  part_number_patterns: [],
  part_number_prefixes: {},
  pages_to_process: { line_items: [1], skip_pages: [] },
  confidence_adjustments: {},
};

export default function VendorTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<TemplateData>(DEFAULT_TEMPLATE_DATA);
  const [version, setVersion] = useState('1.0.0');
  const [dirty, setDirty] = useState(false);

  // Column headers as editable string
  const [columnHeadersStr, setColumnHeadersStr] = useState('');
  const [partPatternsStr, setPartPatternsStr] = useState('');
  const [skipPagesStr, setSkipPagesStr] = useState('');
  const [lineItemPagesStr, setLineItemPagesStr] = useState('1');

  // Confidence adjustments as key-value pairs
  const [confAdjustments, setConfAdjustments] = useState<{ key: string; value: number }[]>([]);

  // Part number prefixes as key-value pairs
  const [prefixes, setPrefixes] = useState<{ prefix: string; vendor: string }[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-templates', id],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${id}/templates`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{
        vendor: { id: string; vendor_id: string; vendor_name: string };
        templates: VendorTemplate[];
      }>;
    },
  });

  // Load first active template when data arrives
  useEffect(() => {
    if (!data?.templates?.length) return;
    const active = data.templates.find((t) => t.is_active) || data.templates[0];
    loadTemplate(active);
  }, [data]);

  function loadTemplate(t: VendorTemplate) {
    setActiveTemplateId(t.id);
    setVersion(t.version);
    const td = t.template_data || DEFAULT_TEMPLATE_DATA;
    setTemplateData(td);
    setColumnHeadersStr((td.extraction_rules?.line_items?.column_headers || []).join(', '));
    setPartPatternsStr((td.part_number_patterns || []).join('\n'));
    setSkipPagesStr((td.pages_to_process?.skip_pages || []).join(', '));
    setLineItemPagesStr((td.pages_to_process?.line_items || [1]).join(', '));
    setConfAdjustments(
      Object.entries(td.confidence_adjustments || {}).map(([key, value]) => ({
        key,
        value: value as number,
      }))
    );
    setPrefixes(
      Object.entries(td.part_number_prefixes || {}).map(([prefix, vendor]) => ({
        prefix,
        vendor: vendor as string,
      }))
    );
    setDirty(false);
  }

  function buildTemplateData(): TemplateData {
    return {
      ...templateData,
      version,
      vendor_id: data?.vendor.vendor_id || '',
      vendor_name: data?.vendor.vendor_name || '',
      extraction_rules: {
        ...templateData.extraction_rules,
        line_items: {
          ...templateData.extraction_rules.line_items,
          column_headers: columnHeadersStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      },
      part_number_patterns: partPatternsStr
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      part_number_prefixes: Object.fromEntries(
        prefixes.filter((p) => p.prefix).map((p) => [p.prefix, p.vendor])
      ),
      pages_to_process: {
        line_items: lineItemPagesStr
          .split(',')
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n)),
        skip_pages: skipPagesStr
          .split(',')
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n)),
      },
      confidence_adjustments: Object.fromEntries(
        confAdjustments.filter((c) => c.key).map((c) => [c.key, c.value])
      ),
    };
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        template_id: activeTemplateId,
        version,
        template_data: buildTemplateData(),
        is_active: true,
      };

      const res = await fetch(`/api/vendors/${id}/templates`, {
        method: activeTemplateId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save template');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Template saved');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['vendor-templates', id] });
    },
    onError: () => toast.error('Failed to save template'),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/vendors/${id}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '1.0.0',
          template_data: {
            ...DEFAULT_TEMPLATE_DATA,
            vendor_id: data?.vendor.vendor_id || '',
            vendor_name: data?.vendor.vendor_name || '',
          },
          is_active: true,
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      toast.success('New template created');
      queryClient.invalidateQueries({ queryKey: ['vendor-templates', id] });
    },
    onError: () => toast.error('Failed to create template'),
  });

  function updateField<K extends keyof TemplateData>(key: K, value: TemplateData[K]) {
    setTemplateData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function updatePoFormat(field: string, value: unknown) {
    setTemplateData((prev) => ({
      ...prev,
      po_format: { ...prev.po_format, [field]: value },
    }));
    setDirty(true);
  }

  function updateExtractionRule(field: string, value: unknown) {
    setTemplateData((prev) => ({
      ...prev,
      extraction_rules: {
        ...prev.extraction_rules,
        po_number: { ...prev.extraction_rules.po_number, [field]: value },
      },
    }));
    setDirty(true);
  }

  function updateLineItemRule(field: string, value: unknown) {
    setTemplateData((prev) => ({
      ...prev,
      extraction_rules: {
        ...prev.extraction_rules,
        line_items: { ...prev.extraction_rules.line_items, [field]: value },
      },
    }));
    setDirty(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const vendor = data?.vendor;
  const templates = data?.templates || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/vendors')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Template Editor
            </h2>
            <p className="text-muted-foreground">
              {vendor?.vendor_name} ({vendor?.vendor_id})
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New Version
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !dirty}>
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Template
          </Button>
        </div>
      </div>

      {/* Template version selector */}
      {templates.length > 1 && (
        <div className="flex gap-2">
          {templates.map((t) => (
            <Button
              key={t.id}
              variant={t.id === activeTemplateId ? 'default' : 'outline'}
              size="sm"
              onClick={() => loadTemplate(t)}
            >
              v{t.version}
              {t.is_active && (
                <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100" variant="secondary">
                  Active
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <h3 className="font-semibold">No templates yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create a template to define how POs from this vendor should be extracted.
            </p>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="columns">Column Mappings</TabsTrigger>
            <TabsTrigger value="extraction">Extraction Hints</TabsTrigger>
            <TabsTrigger value="patterns">Part Number Patterns</TabsTrigger>
          </TabsList>

          {/* Basic Settings */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>PO Format Settings</CardTitle>
                <CardDescription>
                  Describe the general format of POs from this vendor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Version</Label>
                    <Input
                      value={version}
                      onChange={(e) => { setVersion(e.target.value); setDirty(true); }}
                      placeholder="1.0.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Format Type</Label>
                    <Select
                      value={templateData.po_format.type}
                      onValueChange={(v) => updatePoFormat('type', v)}
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Typical Pages</Label>
                    <Input
                      type="number"
                      min={1}
                      value={templateData.po_format.typical_pages}
                      onChange={(e) => updatePoFormat('typical_pages', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Line Item Pages</Label>
                    <Input
                      value={lineItemPagesStr}
                      onChange={(e) => { setLineItemPagesStr(e.target.value); setDirty(true); }}
                      placeholder="1, 2"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated page numbers</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Skip Pages</Label>
                    <Input
                      value={skipPagesStr}
                      onChange={(e) => { setSkipPagesStr(e.target.value); setDirty(true); }}
                      placeholder="2, 3, 4"
                    />
                    <p className="text-xs text-muted-foreground">Pages with legal terms, etc.</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateData.po_format.has_tables}
                      onChange={(e) => updatePoFormat('has_tables', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Has Tables</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateData.po_format.has_watermark}
                      onChange={(e) => updatePoFormat('has_watermark', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Has Watermark</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateData.po_format.has_legal_terms}
                      onChange={(e) => updatePoFormat('has_legal_terms', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Has Legal Terms</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Column Mappings */}
          <TabsContent value="columns">
            <Card>
              <CardHeader>
                <CardTitle>Column Mappings</CardTitle>
                <CardDescription>
                  Map the column headers and fields in this vendor's PO format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>PO Number Label</Label>
                    <Input
                      value={templateData.extraction_rules.po_number.label}
                      onChange={(e) => updateExtractionRule('label', e.target.value)}
                      placeholder="e.g., P.O. NUMBER:"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PO Number Pattern (regex)</Label>
                    <Input
                      value={templateData.extraction_rules.po_number.pattern}
                      onChange={(e) => updateExtractionRule('pattern', e.target.value)}
                      placeholder="e.g., P\.O\.\s*NUMBER:\s*(V\d+)"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Table Structure</Label>
                  <Select
                    value={templateData.extraction_rules.line_items.table_structure}
                    onValueChange={(v) => updateLineItemRule('table_structure', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal_table">Formal Table</SelectItem>
                      <SelectItem value="text_columns_with_dashes">Text Columns with Dashes</SelectItem>
                      <SelectItem value="clean_table">Clean Table</SelectItem>
                      <SelectItem value="formal_table_with_colored_headers">Formal Table (Colored Headers)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Column Headers</Label>
                  <Textarea
                    value={columnHeadersStr}
                    onChange={(e) => { setColumnHeadersStr(e.target.value); setDirty(true); }}
                    placeholder="QTY, OUR PT. #, VEND PT #, DESCRIPTION, UNIT PRICE"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of column headers as they appear in the PO
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Part Number Column</Label>
                    <Input
                      value={templateData.extraction_rules.line_items.part_number_column}
                      onChange={(e) => updateLineItemRule('part_number_column', e.target.value)}
                      placeholder="e.g., OUR PT. #"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor Part Column</Label>
                    <Input
                      value={templateData.extraction_rules.line_items.vendor_part_column || ''}
                      onChange={(e) => updateLineItemRule('vendor_part_column', e.target.value)}
                      placeholder="e.g., VEND PT #"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Extraction Hints */}
          <TabsContent value="extraction">
            <Card>
              <CardHeader>
                <CardTitle>Extraction Hints</CardTitle>
                <CardDescription>
                  Patterns and adjustments to improve extraction accuracy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>MFG Part Number Pattern (regex)</Label>
                  <Input
                    value={templateData.extraction_rules.line_items.mfg_part_pattern || ''}
                    onChange={(e) => updateLineItemRule('mfg_part_pattern', e.target.value)}
                    placeholder="e.g., MFG\s*#\s*:\s*([A-Z0-9-]+)"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Regex to find manufacturer part numbers in description text
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Confidence Adjustments</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConfAdjustments([...confAdjustments, { key: '', value: 0 }]);
                        setDirty(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Positive values = bonus, negative values = penalty
                  </p>
                  {confAdjustments.map((adj, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={adj.key}
                        onChange={(e) => {
                          const next = [...confAdjustments];
                          next[i] = { ...next[i], key: e.target.value };
                          setConfAdjustments(next);
                          setDirty(true);
                        }}
                        placeholder="e.g., simple_format_bonus"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={adj.value}
                        onChange={(e) => {
                          const next = [...confAdjustments];
                          next[i] = { ...next[i], value: parseInt(e.target.value) || 0 };
                          setConfAdjustments(next);
                          setDirty(true);
                        }}
                        className="w-24"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setConfAdjustments(confAdjustments.filter((_, j) => j !== i));
                          setDirty(true);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {confAdjustments.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No adjustments defined</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Part Number Patterns */}
          <TabsContent value="patterns">
            <Card>
              <CardHeader>
                <CardTitle>Part Number Patterns</CardTitle>
                <CardDescription>
                  Define regex patterns for expected part numbers and vendor prefixes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Part Number Patterns (one regex per line)</Label>
                  <Textarea
                    value={partPatternsStr}
                    onChange={(e) => { setPartPatternsStr(e.target.value); setDirty(true); }}
                    placeholder={`^[A-Z]\\d{3}$\n^[A-Z]{2}\\d+$`}
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to validate extracted part numbers against expected patterns
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Part Number Prefixes</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPrefixes([...prefixes, { prefix: '', vendor: '' }]);
                        setDirty(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Prefix
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Map prefixes to their vendor/manufacturer names (e.g., CMI- = CM Industries)
                  </p>
                  {prefixes.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={p.prefix}
                        onChange={(e) => {
                          const next = [...prefixes];
                          next[i] = { ...next[i], prefix: e.target.value };
                          setPrefixes(next);
                          setDirty(true);
                        }}
                        placeholder="e.g., CMI-"
                        className="w-32 font-mono"
                      />
                      <Input
                        value={p.vendor}
                        onChange={(e) => {
                          const next = [...prefixes];
                          next[i] = { ...next[i], vendor: e.target.value };
                          setPrefixes(next);
                          setDirty(true);
                        }}
                        placeholder="e.g., CM Industries"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPrefixes(prefixes.filter((_, j) => j !== i));
                          setDirty(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {prefixes.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No prefixes defined</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
