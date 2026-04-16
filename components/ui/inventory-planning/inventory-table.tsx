'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import { Input } from '@/components/ui/shared/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/shared/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { ChevronDown, Search, ArrowUpDown, CircleAlert } from 'lucide-react';
import { ProductDetailSheet } from './product-detail-sheet';
import { InventoryItem } from '@/types/inventory';
import { cn } from '@/lib/utils';

interface InventoryTableProps {
  data: InventoryItem[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  performanceFilter?: string;
  onPerformanceFilterChange?: (filter: string) => void;
  period?: number;
  storeOptions?: { value: string; label: string }[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const PAGE_SIZE = 25;

export function InventoryTable({
  data,
  searchTerm,
  onSearchTermChange,
  statusFilter: externalStatusFilter,
  onStatusFilterChange,
  performanceFilter: externalPerformanceFilter,
  onPerformanceFilterChange,
  period = 30,
  storeOptions = [],
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  isLoading = false,
}: InventoryTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof InventoryItem | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [visibleColumns, setVisibleColumns] = useState({
    sku: true,
    productName: true,
    price: true,
    stockLevel: true,
    minStockLevel: true,
    stockValue: true,
    forecastedDemand: true,
    daysOfCoverage: true,
    status: true,
  });

  const [statusFilter, setStatusFilter] = useState<string>(externalStatusFilter || 'all');
  const [performanceFilter, setPerformanceFilter] = useState<string>(
    externalPerformanceFilter || 'all',
  );

  useEffect(() => {
    setStatusFilter(externalStatusFilter || 'all');
  }, [externalStatusFilter]);

  useEffect(() => {
    setPerformanceFilter(externalPerformanceFilter || 'all');
    // Auto-sort to match FastestMovingTable order when performance filter is applied
    if (externalPerformanceFilter === 'fast') {
      setSortColumn('forecastedDemand');
      setSortDirection('desc');
    } else if (externalPerformanceFilter === 'slow') {
      setSortColumn('forecastedDemand');
      setSortDirection('asc');
    }
  }, [externalPerformanceFilter]);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return data.filter((item) => {
      if (q.length > 0) {
        const inName = item.productName.toLowerCase().includes(q);
        const inSku = item.sku.toLowerCase().includes(q);
        if (!inName && !inSku) {
          return false;
        }
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'overstock' && item.status !== 'Overstock') return false;
        if (statusFilter === 'lowstock' && item.status !== 'Low Stock') return false;
        if (statusFilter === 'outofstock' && item.status !== 'Out of Stock') return false;
        if (statusFilter === 'instock' && item.status !== 'In Stock') return false;
      }

      if (performanceFilter !== 'all') {
        if (performanceFilter === 'fast' && item.performanceCategory !== 'fast') return false;
        if (performanceFilter === 'slow' && item.performanceCategory !== 'slow') return false;
        if (performanceFilter === 'none' && item.performanceCategory !== 'none') return false;
      }

      return true;
    });
  }, [data, searchTerm, statusFilter, performanceFilter, period]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [filteredData, sortColumn, sortDirection]);

  const computedTotalItems = sortedData.length;
  const computedTotalPages = Math.max(1, Math.ceil(computedTotalItems / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, computedTotalPages);
  const pagedData = sortedData.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (currentPage > computedTotalPages) {
      onPageChange(computedTotalPages);
    }
  }, [currentPage, computedTotalPages, onPageChange]);

  const handleSort = (column: keyof InventoryItem) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const safeTotalPages = computedTotalPages;
  const paginationItems = (() => {
    const radius = 2;
    const items: (number | string)[] = [];
    
    if (safeTotalPages <= 5) {
      for (let i = 1; i <= safeTotalPages; i++) items.push(i);
    } else {
      let start = Math.max(1, safeCurrentPage - radius);
      let end = Math.min(safeTotalPages, safeCurrentPage + radius);
      
      if (start <= 2) {
        start = 1;
        end = 5;
      }
      if (end >= safeTotalPages - 1) {
        start = safeTotalPages - 4;
        end = safeTotalPages;
      }
      
      if (start > 1) {
        items.push(1);
        if (start > 2) items.push('...');
      }
      
      for (let i = start; i <= end; i++) items.push(i);
      
      if (end < safeTotalPages) {
        if (end < safeTotalPages - 1) items.push('...');
        items.push(safeTotalPages);
      }
    }
    return items;
  })();

  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='relative max-w-sm w-full'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='SKU veya Urun Ara...'
            className='pl-8'
            value={searchTerm}
            onChange={(e) => {
              onSearchTermChange(e.target.value);
            }}
          />
        </div>

        <div className='flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='whitespace-nowrap'>
                Durum Filtresi:{' '}
                <span className='ml-1 font-medium'>
                  {statusFilter === 'all'
                    ? 'Tumu'
                    : statusFilter === 'overstock'
                      ? 'Fazla Stok'
                      : statusFilter === 'lowstock'
                        ? 'Az Stok'
                        : statusFilter === 'outofstock'
                          ? 'Stok Yok'
                          : 'Stokta'}
                </span>
                <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'all'}
                onCheckedChange={() => {
                  setStatusFilter('all');
                  onStatusFilterChange('all');
                }}
              >
                Tumu
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'overstock'}
                onCheckedChange={() => {
                  setStatusFilter('overstock');
                  onStatusFilterChange('overstock');
                }}
              >
                Fazla Stok
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'lowstock'}
                onCheckedChange={() => {
                  setStatusFilter('lowstock');
                  onStatusFilterChange('lowstock');
                }}
              >
                Az Stok
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'outofstock'}
                onCheckedChange={() => {
                  setStatusFilter('outofstock');
                  onStatusFilterChange('outofstock');
                }}
              >
                Stok Yok
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'instock'}
                onCheckedChange={() => {
                  setStatusFilter('instock');
                  onStatusFilterChange('instock');
                }}
              >
                Stokta
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='whitespace-nowrap'>
                Performans:{' '}
                <span className='ml-1 font-medium'>
                  {performanceFilter === 'all'
                    ? 'Tumu'
                    : performanceFilter === 'fast'
                      ? 'Hizli Satanlar'
                      : performanceFilter === 'slow'
                        ? 'Yavas Satanlar'
                        : 'Hic Satmayanlar'}
                </span>
                <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuCheckboxItem
                checked={performanceFilter === 'all'}
                onCheckedChange={() => {
                  setPerformanceFilter('all');
                  onPerformanceFilterChange?.('all');
                }}
              >
                Tumu
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={performanceFilter === 'fast'}
                onCheckedChange={() => {
                  setPerformanceFilter('fast');
                  onPerformanceFilterChange?.('fast');
                }}
              >
                Hizli Satanlar
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={performanceFilter === 'slow'}
                onCheckedChange={() => {
                  setPerformanceFilter('slow');
                  onPerformanceFilterChange?.('slow');
                }}
              >
                Yavas Satanlar
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={performanceFilter === 'none'}
                onCheckedChange={() => {
                  setPerformanceFilter('none');
                  onPerformanceFilterChange?.('none');
                }}
              >
                Hic Satmayanlar
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='ml-auto'>
                Sutunlar <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuCheckboxItem checked={visibleColumns.sku} onCheckedChange={() => toggleColumn('sku')}>
                SKU
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.productName} onCheckedChange={() => toggleColumn('productName')}>
                Urun Adi
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.price} onCheckedChange={() => toggleColumn('price')}>
                Fiyat
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.stockLevel} onCheckedChange={() => toggleColumn('stockLevel')}>
                Stok
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.minStockLevel} onCheckedChange={() => toggleColumn('minStockLevel')}>
                Guvenlik Stogu
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.stockValue} onCheckedChange={() => toggleColumn('stockValue')}>
                Stok Degeri
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.forecastedDemand} onCheckedChange={() => toggleColumn('forecastedDemand')}>
                Gunluk Tahmin Talebi
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.daysOfCoverage} onCheckedChange={() => toggleColumn('daysOfCoverage')}>
                Stok Gunu
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.status} onCheckedChange={() => toggleColumn('status')}>
                Durum
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className='rounded-md border bg-card overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.sku && (
                <TableHead className='w-25 cursor-pointer text-center' onClick={() => handleSort('sku')}>
                  <div className='flex items-center justify-center gap-1'>SKU {sortColumn === 'sku' && <ArrowUpDown className='inline h-3 w-3' />}</div>
                </TableHead>
              )}
              {visibleColumns.productName && (
                <TableHead className='cursor-pointer text-center' onClick={() => handleSort('productName')}>
                  <div className='flex items-center justify-center gap-1'>Urun Adi {sortColumn === 'productName' && <ArrowUpDown className='inline h-3 w-3' />}</div>
                </TableHead>
              )}
              {visibleColumns.price && <TableHead className='cursor-pointer text-center' onClick={() => handleSort('price')}><div className='flex items-center justify-center gap-1'>Birim Fiyat {sortColumn === 'price' && <ArrowUpDown className='inline h-3 w-3' />}</div></TableHead>}
              {visibleColumns.stockLevel && <TableHead className='cursor-pointer text-center' onClick={() => handleSort('stockLevel')}><div className='flex items-center justify-center gap-1'>Mevcut Stok {sortColumn === 'stockLevel' && <ArrowUpDown className='inline h-3 w-3' />}</div></TableHead>}
              {visibleColumns.minStockLevel && <TableHead className='cursor-pointer text-center' onClick={() => handleSort('minStockLevel')}><div className='flex items-center justify-center gap-1'>Guvenlik Stogu {sortColumn === 'minStockLevel' && <ArrowUpDown className='inline h-3 w-3' />}</div></TableHead>}
              {visibleColumns.stockValue && <TableHead className='cursor-pointer text-center' onClick={() => handleSort('stockValue')}><div className='flex items-center justify-center gap-1'>Stok Degeri {sortColumn === 'stockValue' && <ArrowUpDown className='inline h-3 w-3' />}</div></TableHead>}
              {visibleColumns.forecastedDemand && <TableHead className='cursor-pointer text-center' onClick={() => handleSort('forecastedDemand')}><div className='flex items-center justify-center gap-1'>Gunluk Tahmin Talebi {sortColumn === 'forecastedDemand' && <ArrowUpDown className='inline h-3 w-3' />}</div></TableHead>}
              {visibleColumns.daysOfCoverage && <TableHead className='cursor-pointer text-center' onClick={() => handleSort('daysOfCoverage')}><div className='flex items-center justify-center gap-1'>Stok Gunu {sortColumn === 'daysOfCoverage' && <ArrowUpDown className='inline h-3 w-3' />}</div></TableHead>}
              {visibleColumns.status && <TableHead className='text-center'>Durum</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedData.length > 0 ? (
              pagedData.map((item, index) => (
                <TableRow
                  key={`${item.sku}-${index}`}
                  className='cursor-pointer hover:bg-muted/50 transition-colors'
                  onClick={() => {
                    setSelectedItem(item);
                    setIsSheetOpen(true);
                  }}
                >
                  {visibleColumns.sku && <TableCell className='font-medium text-center'>{item.sku}</TableCell>}
                  {visibleColumns.productName && <TableCell className='text-center'>{item.productName}</TableCell>}
                  {visibleColumns.price && <TableCell className='text-center font-medium text-slate-600'>₺{item.price.toLocaleString('tr-TR')}</TableCell>}
                  {visibleColumns.stockLevel && <TableCell className='text-center'>{item.stockLevel.toLocaleString('tr-TR')}</TableCell>}
                  {visibleColumns.minStockLevel && <TableCell className='text-center text-orange-600 font-medium'>{item.minStockLevel.toLocaleString('tr-TR')}</TableCell>}
                  {visibleColumns.stockValue && <TableCell className='text-center text-slate-500'>₺{item.stockValue.toLocaleString('tr-TR')}</TableCell>}
                  {visibleColumns.forecastedDemand && (
                    <TableCell className='text-center text-blue-600 font-medium'>
                      {(item.forecastedDemand / Math.max(period, 1)).toLocaleString('tr-TR', {
                        maximumFractionDigits: 1,
                      })}
                    </TableCell>
                  )}
                  {visibleColumns.daysOfCoverage && (
                    <TableCell
                      className={cn(
                        'text-center font-medium',
                        item.daysOfCoverage < 15 ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {item.daysOfCoverage}
                    </TableCell>
                  )}
                  {visibleColumns.status && (
                    <TableCell className='text-center'>
                      <Badge
                        variant={
                          item.status === 'Out of Stock'
                            ? 'destructive'
                            : item.status === 'Low Stock'
                              ? 'secondary'
                              : item.status === 'Overstock'
                                ? 'outline'
                                : 'default'
                        }
                      >
                        {item.status === 'In Stock'
                          ? 'Stokta'
                          : item.status === 'Out of Stock'
                            ? 'Stok Bitti'
                            : item.status === 'Low Stock'
                              ? 'Az Stok'
                              : item.status === 'Overstock'
                                ? 'Fazla Stok'
                                : item.status}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={Object.values(visibleColumns).filter(Boolean).length}
                  className='h-32 text-center text-muted-foreground'
                >
                  Secili filtrelere uygun urun bulunamadi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex flex-col gap-3 rounded-lg border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='text-sm text-muted-foreground'>
          {isLoading
            ? 'Veriler yukleniyor...'
            : `${computedTotalItems.toLocaleString('tr-TR')} urun arasindan ${
                computedTotalItems === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1
              }-${Math.min(safeCurrentPage * PAGE_SIZE, computedTotalItems)} arasi gosteriliyor`}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              onPageChange(Math.max(1, safeCurrentPage - 1));
            }}
            disabled={safeCurrentPage <= 1 || isLoading}
          >
            Onceki
          </Button>
          <div className='flex items-center gap-1'>
            {paginationItems.map((item, i) => {
              if (item === '...') {
                return (
                  <span key={`ellipsis-${i}`} className='px-2 text-muted-foreground'>
                    ...
                  </span>
                );
              }
              const page = item as number;
              return (
                <Button
                  key={`page-${page}`}
                  variant={safeCurrentPage === page ? 'default' : 'outline'}
                  size='sm'
                  className='min-w-9'
                  onClick={() => onPageChange(page)}
                  disabled={isLoading}
                >
                  {page}
                </Button>
              );
            })}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1));
            }}
            disabled={safeCurrentPage >= safeTotalPages || isLoading}
          >
            Sonraki
          </Button>
        </div>
      </div>

      <ProductDetailSheet
        item={selectedItem}
        storeOptions={storeOptions}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        period={period}
      />
    </div>
  );
}
