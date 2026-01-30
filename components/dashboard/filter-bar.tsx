'use client';

import { MultiSelect } from '@/components/ui/shared/multi-select';

type Option = {
  value: string;
  label: string;
};

interface FilterBarProps {
  // Page Title
  title: string;

  // Region Selection
  selectedRegions: string[];
  onRegionChange: (value: string[]) => void;
  regionOptions: Option[];

  // Store Selection
  selectedStores: string[];
  onStoreChange: (value: string[]) => void;
  storeOptions: Option[];

  // Category Selection
  selectedCategories: string[];
  onCategoryChange: (value: string[]) => void;
  categoryOptions: Option[];

  // Extra content (e.g. Horizon buttons)
  children?: React.ReactNode;
}

export function FilterBar({
  title,
  selectedRegions,
  onRegionChange,
  regionOptions,
  selectedStores,
  onStoreChange,
  storeOptions,
  selectedCategories,
  onCategoryChange,
  categoryOptions,
  children,
}: FilterBarProps) {
  return (
    <div className='w-full bg-card border border-border rounded-lg p-2 shadow-sm mb-4 flex flex-col lg:flex-row gap-3 items-end lg:items-center justify-between animate-in fade-in-50 slide-in-from-top-2 relative z-50'>
      {/* Page Title */}
      <h2 className='text-base md:text-lg lg:text-xl font-bold tracking-tight text-foreground'>
        {title}
      </h2>

      {/* Filters */}
      <div className='flex flex-col md:flex-row flex-wrap gap-2 w-full lg:w-auto items-end md:items-center'>
        <div className='w-full md:w-auto min-w-[150px]'>
          <MultiSelect
            options={regionOptions}
            selected={selectedRegions}
            onChange={onRegionChange}
            placeholder='Bölge'
          />
        </div>
        <div className='w-full md:w-auto min-w-[150px]'>
          <MultiSelect
            options={storeOptions}
            selected={selectedStores}
            onChange={onStoreChange}
            placeholder='Mağaza'
          />
        </div>
        <div className='w-full md:w-auto min-w-[150px]'>
          <MultiSelect
            options={categoryOptions}
            selected={selectedCategories}
            onChange={onCategoryChange}
            placeholder='Reyon'
          />
        </div>
      </div>

      {/* Extra Controls */}
      {children && (
        <div className='flex items-center gap-2 w-full lg:w-auto justify-end'>
          {children}
        </div>
      )}
    </div>
  );
}
