'use client';

import * as React from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  className,
}: MultiSelectProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase()),
  );

  // Handle clicking outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle selection
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Remove a selected item
  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== value));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchValue('');
    }
    if (e.key === 'Backspace' && searchValue === '' && selected.length > 0) {
      onChange(selected.slice(0, -1));
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Input Area */}
      <div
        className='flex items-center justify-between min-h-8 w-full rounded-lg border border-border/50 bg-card px-2 py-1.5 text-xs shadow-sm cursor-pointer transition-all hover:border-primary/30 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
        onClick={() => {
          setIsOpen(!isOpen);
          inputRef.current?.focus();
        }}
      >
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          {/* Placeholder / Label */}
          <span className='text-muted-foreground truncate text-xs'>
            {placeholder}
          </span>

          {/* Selected Count Badge */}
          {selected.length > 0 && (
            <span className='inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 min-w-[20px]'>
              {selected.length}
            </span>
          )}
        </div>

        {/* Dropdown Icon */}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform shrink-0 ml-2',
            isOpen && 'rotate-180',
          )}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className='absolute z-[9999] mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95'>
          {/* Search Input */}
          <div className='p-2 border-b'>
            <input
              ref={inputRef}
              type='text'
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Search...'
              className='w-full bg-transparent outline-none placeholder:text-muted-foreground text-xs'
            />
          </div>

          {/* Selected Badges */}
          {selected.length > 0 && (
            <div className='flex flex-wrap gap-1.5 p-2 border-b'>
              {selected.map((value) => {
                const option = options.find((o) => o.value === value);
                return (
                  <span
                    key={value}
                    className='inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground'
                  >
                    {option?.label}
                    <button
                      type='button'
                      onClick={(e) => removeOption(value, e)}
                      className='rounded-full hover:bg-muted-foreground/20 p-0.5'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Options List */}
          <ul className='max-h-60 overflow-auto p-1 space-y-1'>
            {filteredOptions.length > 0 && (
              <li
                onClick={() => {
                  const allFilteredSelected = filteredOptions.every((option) =>
                    selected.includes(option.value),
                  );
                  if (allFilteredSelected) {
                    // Deselect all filtered options
                    const newSelected = selected.filter(
                      (s) => !filteredOptions.some((o) => o.value === s),
                    );
                    onChange(newSelected);
                  } else {
                    // Select all filtered options
                    const newSelected = [
                      ...selected,
                      ...filteredOptions
                        .filter((o) => !selected.includes(o.value))
                        .map((o) => o.value),
                    ];
                    onChange(newSelected);
                  }
                }}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 text-xs rounded-sm cursor-pointer font-semibold border-b mb-1',
                  filteredOptions.every((option) =>
                    selected.includes(option.value),
                  )
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted',
                )}
              >
                {filteredOptions.every((option) =>
                  selected.includes(option.value),
                )
                  ? 'Seçimi Kaldır'
                  : 'Tümünü Seç'}
                {filteredOptions.every((option) =>
                  selected.includes(option.value),
                ) && <Check className='h-4 w-4 text-primary' />}
              </li>
            )}
            {filteredOptions.length === 0 ? (
              <li className='px-3 py-2 text-sm text-muted-foreground text-center'>
                No results found
              </li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <li
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      'flex items-center justify-between px-2 py-1.5 text-xs rounded-sm cursor-pointer',
                      isSelected
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted',
                    )}
                  >
                    {option.label}
                    {isSelected && <Check className='h-4 w-4 text-primary' />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
