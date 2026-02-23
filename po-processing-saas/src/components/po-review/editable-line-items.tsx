'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ConfidenceBadge } from './confidence-badge';
import { PartMatcherCell } from './part-matcher-cell';
import type { POLineItem } from '@/types/database';
import type { LineItemEdit } from '@/types/po';

interface EditableLineItemsProps {
  lineItems: POLineItem[];
  onChange: (updates: LineItemEdit[]) => void;
}

export function EditableLineItems({ lineItems, onChange }: EditableLineItemsProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<POLineItem>>>({});

  function getDisplayValue(item: POLineItem, field: keyof POLineItem) {
    if (edits[item.id]?.[field] !== undefined) {
      return edits[item.id][field];
    }
    return item[field];
  }

  function updateField(itemId: string, field: string, value: unknown) {
    const newEdits = {
      ...edits,
      [itemId]: { ...edits[itemId], [field]: value },
    };
    setEdits(newEdits);

    // Emit changes
    const updates: LineItemEdit[] = Object.entries(newEdits).map(
      ([id, changes]) => ({ id, ...changes })
    );
    onChange(updates);
  }

  function handleDoubleClick(itemId: string, field: string) {
    setEditingCell(`${itemId}-${field}`);
  }

  function handleBlur() {
    setEditingCell(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingCell(null);
    }
  }

  function renderEditableCell(
    item: POLineItem,
    field: keyof POLineItem,
    type: 'text' | 'number' = 'text'
  ) {
    const cellId = `${item.id}-${field}`;
    const value = getDisplayValue(item, field);

    if (editingCell === cellId) {
      return (
        <Input
          autoFocus
          type={type}
          value={value as string | number}
          onChange={(e) =>
            updateField(
              item.id,
              field,
              type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
            )
          }
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs"
        />
      );
    }

    const hasEdit = edits[item.id]?.[field] !== undefined;
    return (
      <span
        onDoubleClick={() => handleDoubleClick(item.id, field)}
        className={`cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded text-xs ${
          hasEdit ? 'bg-blue-50 text-blue-700 font-medium' : ''
        }`}
        title="Double-click to edit"
      >
        {type === 'number'
          ? (typeof value === 'number' ? value.toFixed(2) : value)
          : (value as string) || '-'}
      </span>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-xs">#</TableHead>
            <TableHead className="text-xs">Vendor Part</TableHead>
            <TableHead className="text-xs">MFG Part</TableHead>
            <TableHead className="text-xs min-w-[150px]">Description</TableHead>
            <TableHead className="text-xs w-16">Qty</TableHead>
            <TableHead className="text-xs w-20">Unit Price</TableHead>
            <TableHead className="text-xs w-24">Extended</TableHead>
            <TableHead className="text-xs w-36">Matched SKU</TableHead>
            <TableHead className="text-xs w-16">Conf.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((item) => (
            <TableRow key={item.id} className="group">
              <TableCell className="text-xs text-muted-foreground">
                {item.line_number}
              </TableCell>
              <TableCell>
                {renderEditableCell(item, 'vendor_part_number')}
              </TableCell>
              <TableCell>
                {renderEditableCell(item, 'manufacturer_part_number')}
              </TableCell>
              <TableCell>
                {renderEditableCell(item, 'description')}
              </TableCell>
              <TableCell>
                {renderEditableCell(item, 'quantity', 'number')}
              </TableCell>
              <TableCell>
                {renderEditableCell(item, 'unit_price', 'number')}
              </TableCell>
              <TableCell className="text-xs font-medium">
                ${(
                  (getDisplayValue(item, 'quantity') as number) *
                  (getDisplayValue(item, 'unit_price') as number)
                ).toFixed(2)}
              </TableCell>
              <TableCell>
                <PartMatcherCell
                  value={
                    (getDisplayValue(item, 'matched_internal_sku') as string) ||
                    null
                  }
                  onSelect={(sku) => {
                    updateField(item.id, 'matched_internal_sku', sku);
                    updateField(item.id, 'is_matched', true);
                    updateField(item.id, 'match_method', 'manual');
                    updateField(item.id, 'match_confidence', 100);
                  }}
                />
              </TableCell>
              <TableCell>
                <ConfidenceBadge
                  confidence={item.extraction_confidence}
                  className="text-[10px]"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
