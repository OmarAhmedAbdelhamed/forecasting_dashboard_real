'use client';

import { MultiSelect } from '@/components/ui/shared/multi-select';
import { CircleAlert } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { useCustomLists } from '@/context/custom-lists-context';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type Option = {
  value: string;
  label: string;
};

interface FilterBarProps {
  // Page Title
  title: string;
  // Optional tooltip content for the title
  titleTooltip?: string;

  // Optional content next to title
  leftContent?: React.ReactNode;

  // Region Selection
  selectedRegions?: string[];
  onRegionChange?: (value: string[]) => void;
  regionOptions?: Option[];

  // Store Selection
  selectedStores?: string[];
  onStoreChange?: (value: string[]) => void;
  storeOptions?: Option[];

  // Category Selection
  selectedCategories?: string[];
  onCategoryChange?: (value: string[]) => void;
  categoryOptions?: Option[];

  // Product Selection
  selectedProducts?: string[];
  onProductChange?: (value: string[]) => void;
  productOptions?: Option[];

  // Extra content (e.g. Horizon buttons, Period Selectors)
  children?: React.ReactNode;

  // Custom class for the container
  className?: string;
}

export function FilterBar({
  title,
  titleTooltip,
  leftContent,
  selectedRegions,
  onRegionChange,
  regionOptions,
  selectedStores,
  onStoreChange,
  storeOptions,
  selectedCategories,
  onCategoryChange,
  categoryOptions,
  selectedProducts,
  onProductChange,
  productOptions,
  children,
  className,
}: FilterBarProps) {
  const { lists } = useCustomLists();

  // Merge products with custom lists for the dropdown
  const extendedProductOptions = useMemo(() => {
    if (!productOptions) return undefined;

    const listOptions = lists.map((list) => ({
      value: `LIST_${list.id}`,
      label: `📦 ${list.name} (${list.itemCount})`,
    }));

    return [...listOptions, ...productOptions];
  }, [productOptions, lists]);

  // Compute what should actually be 'checked' in the dropdown
  const multiSelectValue = useMemo(() => {
    const values = new Set(selectedProducts || []);

    // For each list, if all its SKUs are selected, we show the list itself as selected
    lists.forEach((list) => {
      const allSkusSelected =
        list.skus.length > 0 && list.skus.every((sku) => values.has(sku));
      if (allSkusSelected) {
        values.add(`LIST_${list.id}`);
      }
    });

    return Array.from(values);
  }, [selectedProducts, lists]);

  // Special handler for selection to expand lists into SKUs
  const handleProductChange = (newValues: string[]) => {
    if (!onProductChange) return;

    const currentSkus = new Set(selectedProducts || []);
    const oldValues = new Set(multiSelectValue);
    const newValuesSet = new Set(newValues);

    const added = newValues.filter((v) => !oldValues.has(v));
    const removed = Array.from(oldValues).filter((v) => !newValuesSet.has(v));

    // 1. Additions
    added.forEach((val) => {
      if (val.startsWith('LIST_')) {
        const list = lists.find((l) => l.id === val.replace('LIST_', ''));
        list?.skus.forEach((sku) => currentSkus.add(sku));
      } else {
        currentSkus.add(val);
      }
    });

    // 2. Removals
    removed.forEach((val) => {
      if (val.startsWith('LIST_')) {
        const list = lists.find((l) => l.id === val.replace('LIST_', ''));
        list?.skus.forEach((sku) => {
          // Only remove if it doesn't belong to another list that is staying selected
          // and it's not explicitly selected in the new dropdown state
          const isInOtherSelectedList = newValues.some((v) => {
            if (!v.startsWith('LIST_') || v === val) return false;
            const otherList = lists.find(
              (l) => l.id === v.replace('LIST_', ''),
            );
            return otherList?.skus.includes(sku);
          });

          if (!isInOtherSelectedList) {
            currentSkus.delete(sku);
          }
        });
      } else {
        // If an individual SKU is removed, we must also remove any lists that contain it
        // to keep the visual "group" synchronization logical
        currentSkus.delete(val);
      }
    });

    onProductChange(Array.from(currentSkus));
  };

  // Compute what to show in the tags area (hide SKUs if their list is selected)
  const displaySelected = useMemo(() => {
    const values = new Set(multiSelectValue);
    const toShow = new Set<string>();

    const selectedListIds = new Set(
      Array.from(values)
        .filter((v) => v.startsWith('LIST_'))
        .map((v) => v.replace('LIST_', '')),
    );

    values.forEach((val) => {
      if (val.startsWith('LIST_')) {
        toShow.add(val);
      } else {
        // Only show individual SKU tag if it's NOT covered by any selected list
        const isCoveredBySelectedList = lists.some(
          (list) => selectedListIds.has(list.id) && list.skus.includes(val),
        );
        if (!isCoveredBySelectedList) {
          toShow.add(val);
        }
      }
    });

    return Array.from(toShow);
  }, [multiSelectValue, lists]);

  return (
    <div
      className={cn(
        'w-full bg-card border border-border rounded-lg p-2 shadow-sm mb-4 flex flex-col lg:flex-row gap-3 items-end lg:items-center justify-between animate-in fade-in-50 slide-in-from-top-2 relative z-50',
        className,
      )}
    >
      {/* Title & Left Extras */}
      <div className='flex items-center gap-3 shrink-0'>
        <h2 className='text-base md:text-lg lg:text-xl font-bold tracking-tight text-foreground'>
          {title}
        </h2>
        {titleTooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='p-1 -m-1 cursor-help outline-none'>
                <CircleAlert className='h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors' />
              </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>
              <p>{titleTooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {leftContent}
      </div>

      {/* Main Filter Area */}
      <div className='flex flex-col md:flex-row flex-wrap gap-2 w-full lg:w-auto items-end md:items-center justify-end'>
        {/* Custom filters / Period selectors go here */}
        {children}

        {/* Standard Filters */}
        {regionOptions && onRegionChange && (
          <div className='w-full md:w-auto min-w-37.5'>
            <MultiSelect
              options={regionOptions}
              selected={selectedRegions || []}
              onChange={onRegionChange}
              placeholder='Bölge'
            />
          </div>
        )}

        {storeOptions && onStoreChange && (
          <div className='w-full md:w-auto min-w-37.5'>
            <MultiSelect
              options={storeOptions}
              selected={selectedStores || []}
              onChange={onStoreChange}
              placeholder='Mağaza'
            />
          </div>
        )}

        {categoryOptions && onCategoryChange && (
          <div className='w-full md:w-auto min-w-37.5'>
            <MultiSelect
              options={categoryOptions}
              selected={selectedCategories || []}
              onChange={onCategoryChange}
              placeholder='Reyon'
            />
          </div>
        )}

        {extendedProductOptions && onProductChange && (
          <div className='w-full md:w-auto min-w-50'>
            <MultiSelect
              options={extendedProductOptions}
              selected={multiSelectValue}
              displaySelected={displaySelected}
              displayCount={selectedProducts?.length || 0}
              onChange={handleProductChange}
              placeholder='Ürün (SKU) veya Liste'
            />
          </div>
        )}
      </div>
    </div>
  );
}
