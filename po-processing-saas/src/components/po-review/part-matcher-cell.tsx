'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartMatcherCellProps {
  value: string | null;
  onSelect: (sku: string) => void;
}

export function PartMatcherCell({ value, onSelect }: PartMatcherCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: products } = useQuery({
    queryKey: ['products-search', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&limit=10`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: search.length >= 2,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8 text-xs"
        >
          {value || 'Select SKU...'}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search products..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.length < 2 ? 'Type to search...' : 'No products found.'}
            </CommandEmpty>
            <CommandGroup>
              {(products || []).map((product: Record<string, unknown>) => (
                <CommandItem
                  key={product.id as string}
                  value={product.internal_sku as string}
                  onSelect={() => {
                    onSelect(product.internal_sku as string);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-3 w-3',
                      value === product.internal_sku ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div>
                    <p className="text-xs font-medium">{product.internal_sku as string}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {product.description as string}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
