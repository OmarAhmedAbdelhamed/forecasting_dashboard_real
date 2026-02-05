'use client';

import { useState } from 'react';
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
  performanceFilter?: string;
  onPerformanceFilterChange?: (filter: string) => void;
  period?: number;
}

export function InventoryTable({
  data,
  performanceFilter: externalPerformanceFilter,
  onPerformanceFilterChange,
  period = 30,
}: InventoryTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof InventoryItem | null>(
    null,
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Column Visibility State
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

  // Filter State
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, overstock, lowstock, outofstock
  const [performanceFilter, setPerformanceFilter] = useState<string>(
    externalPerformanceFilter || 'all',
  ); // all, fast, slow

  // Update state during render when prop changes
  const [prevExternalFilter, setPrevExternalFilter] = useState(
    externalPerformanceFilter,
  );
  if (externalPerformanceFilter !== prevExternalFilter) {
    setPrevExternalFilter(externalPerformanceFilter);
    setPerformanceFilter(externalPerformanceFilter || 'all');
  }

  // Sheet State
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Search & Filter Logic
  const filteredData = data.filter((item) => {
    // 1. Search
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) {return false;}

    // 2. Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overstock' && item.status !== 'Overstock')
        {return false;}
      if (statusFilter === 'lowstock' && item.status !== 'Low Stock')
        {return false;}
      if (statusFilter === 'outofstock' && item.status !== 'Out of Stock')
        {return false;}
      if (statusFilter === 'instock' && item.status !== 'In Stock')
        {return false;}
    }

    // 3. Performance Filter (Updated to match Widget's Sales Volume logic)
    if (performanceFilter !== 'all') {
      // Fast movers: High Sales Volume (>600) OR High turnover (>8)
      const isFastMover = item.forecastedDemand > 600 || item.turnoverRate > 8;

      // Slow movers: Low Sales Volume (<300) OR (Low turnover <4 AND High coverage >60)
      const isSlowMover =
        item.forecastedDemand < 300 ||
        (item.turnoverRate < 4 && item.daysOfCoverage > 60);

      if (performanceFilter === 'fast' && !isFastMover) {return false;}
      if (performanceFilter === 'slow' && !isSlowMover) {return false;}
    }

    return true;
  });

  // Sort Logic
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) {return 0;}

    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return sortDirection === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  const handleSort = (column: keyof InventoryItem) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='relative max-w-sm w-full'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='SKU veya Ürün Ara...'
            className='pl-8'
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); }}
          />
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0'>
          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='whitespace-nowrap'>
                Durum Filtresi:{' '}
                <span className='ml-1 font-medium'>
                  {statusFilter === 'all'
                    ? 'Tümü'
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
                onCheckedChange={() => { setStatusFilter('all'); }}
              >
                Tümü
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'overstock'}
                onCheckedChange={() => { setStatusFilter('overstock'); }}
              >
                Fazla Stok (Overstock)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'lowstock'}
                onCheckedChange={() => { setStatusFilter('lowstock'); }}
              >
                Az Stok (Low Stock)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'outofstock'}
                onCheckedChange={() => { setStatusFilter('outofstock'); }}
              >
                Stok Yok (Out of Stock)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'instock'}
                onCheckedChange={() => { setStatusFilter('instock'); }}
              >
                Stokta Var (In Stock)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Performance Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='whitespace-nowrap'>
                Performans:{' '}
                <span className='ml-1 font-medium'>
                  {performanceFilter === 'all'
                    ? 'Tümü'
                    : performanceFilter === 'fast'
                      ? 'Hızlı Satanlar'
                      : 'Yavaş Satanlar'}
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
                Tümü
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={performanceFilter === 'fast'}
                onCheckedChange={() => {
                  setPerformanceFilter('fast');
                  onPerformanceFilterChange?.('fast');
                }}
              >
                Hızlı Satanlar (Fast Movers)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={performanceFilter === 'slow'}
                onCheckedChange={() => {
                  setPerformanceFilter('slow');
                  onPerformanceFilterChange?.('slow');
                }}
              >
                Yavaş Satanlar (Slow Movers)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='ml-auto'>
                Sütunlar <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.sku}
                onCheckedChange={() => { toggleColumn('sku'); }}
              >
                SKU
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.productName}
                onCheckedChange={() => { toggleColumn('productName'); }}
              >
                Ürün Adı
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.price}
                onCheckedChange={() => { toggleColumn('price'); }}
              >
                Fiyat
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.stockLevel}
                onCheckedChange={() => { toggleColumn('stockLevel'); }}
              >
                Stok
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.minStockLevel}
                onCheckedChange={() => { toggleColumn('minStockLevel'); }}
              >
                Güvenlik Stoğu
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.stockValue}
                onCheckedChange={() => { toggleColumn('stockValue'); }}
              >
                Stok Değeri
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={visibleColumns.forecastedDemand}
                onCheckedChange={() => { toggleColumn('forecastedDemand'); }}
              >
                Tahmini Talep
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.daysOfCoverage}
                onCheckedChange={() => { toggleColumn('daysOfCoverage'); }}
              >
                Kapsama
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={() => { toggleColumn('status'); }}
              >
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
                <TableHead
                  className='w-25 cursor-pointer text-center'
                  onClick={() => { handleSort('sku'); }}
                >
                  <div className='flex items-center justify-center gap-1'>
                    SKU
                    {sortColumn === 'sku' && (
                      <ArrowUpDown className='inline h-3 w-3' />
                    )}
                  </div>
                </TableHead>
              )}
              {visibleColumns.productName && (
                <TableHead
                  className='cursor-pointer text-center'
                  onClick={() => { handleSort('productName'); }}
                >
                  <div className='flex items-center justify-center gap-1'>
                    Ürün Adı
                    {sortColumn === 'productName' && (
                      <ArrowUpDown className='inline h-3 w-3' />
                    )}
                  </div>
                </TableHead>
              )}
              {visibleColumns.price && (
                <TableHead
                  className='cursor-pointer text-center'
                  onClick={() => { handleSort('price'); }}
                >
                  <div className='flex items-center justify-center gap-1'>
                    Birim Fiyat
                    {sortColumn === 'price' && (
                      <ArrowUpDown className='inline h-3 w-3' />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleAlert className='h-3 w-3 text-muted-foreground/50 hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ürünün birim satış fiyatı</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              )}
              {visibleColumns.stockLevel && (
                <TableHead
                  className='cursor-pointer text-center'
                  onClick={() => { handleSort('stockLevel'); }}
                >
                  <div className='flex items-center justify-center gap-1'>
                    Mevcut Stok
                    {sortColumn === 'stockLevel' && (
                      <ArrowUpDown className='inline h-3 w-3' />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleAlert className='h-3 w-3 text-muted-foreground/50 hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Depodaki anlık fiziksel stok adedi</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              )}
              {visibleColumns.minStockLevel && (
                <TableHead
                  className='cursor-pointer text-center'
                  onClick={() => { handleSort('minStockLevel'); }}
                >
                  <div className='flex items-center justify-center gap-1'>
                    Güvenlik Stoğu
                    {sortColumn === 'minStockLevel' && (
                      <ArrowUpDown className='inline h-3 w-3' />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleAlert className='h-3 w-3 text-muted-foreground/50 hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Minimum stok seviyesi - kritik eşik değeri</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              )}
              {visibleColumns.stockValue && (
                <TableHead
                  className='cursor-pointer text-center'
                  onClick={() => { handleSort('stockValue'); }}
                >
                  <div className='flex items-center justify-center gap-1'>
                    Stok Değeri
                    {sortColumn === 'stockValue' && (
                      <ArrowUpDown className='inline h-3 w-3' />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleAlert className='h-3 w-3 text-muted-foreground/50 hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mevcut stok × Birim fiyat</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              )}

              {visibleColumns.forecastedDemand && (
                <TableHead
                  className='cursor-pointer text-center'
                  onClick={() => { handleSort('forecastedDemand'); }}
                >
                  <div className='flex items-center justify-center gap-1'>
                    Tahmini Talep
                    {sortColumn === 'forecastedDemand' && (
                      <ArrowUpDown className='inline h-3 w-3' />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleAlert className='h-3 w-3 text-muted-foreground/50 hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Gelecek {period} gün için öngörülen satış adedi</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              )}
              {visibleColumns.daysOfCoverage && (
                <TableHead
                  className='cursor-pointer text-center'
                  onClick={() => { handleSort('daysOfCoverage'); }}
                >
                  <div className='flex items-center justify-center gap-1'>
                    Stok Günü
                    {sortColumn === 'daysOfCoverage' && (
                      <ArrowUpDown className='inline h-3 w-3' />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleAlert className='h-3 w-3 text-muted-foreground/50 hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Mevcut stoğun tahmini talebe göre kaç gün yeteceği
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              )}
              {visibleColumns.status && (
                <TableHead className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    Durum
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleAlert className='h-3 w-3 text-muted-foreground/50 hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Stok seviyesinin sağlık durumu</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length > 0 ? (
              sortedData.map((item) => (
                <TableRow
                  key={item.id}
                  className='cursor-pointer hover:bg-muted/50 transition-colors'
                  onClick={() => { handleRowClick(item); }}
                >
                  {visibleColumns.sku && (
                    <TableCell className='font-medium text-center'>
                      {item.sku}
                    </TableCell>
                  )}
                  {visibleColumns.productName && (
                    <TableCell className='text-center'>
                      {item.productName}
                    </TableCell>
                  )}
                  {visibleColumns.price && (
                    <TableCell className='text-center font-medium text-slate-600'>
                      ₺{item.price.toLocaleString('tr-TR')}
                    </TableCell>
                  )}
                  {visibleColumns.stockLevel && (
                    <TableCell className='text-center'>
                      {item.stockLevel.toLocaleString('tr-TR')}
                    </TableCell>
                  )}
                  {visibleColumns.minStockLevel && (
                    <TableCell className='text-center text-orange-600 font-medium'>
                      {item.minStockLevel.toLocaleString('tr-TR')}
                    </TableCell>
                  )}
                  {visibleColumns.stockValue && (
                    <TableCell className='text-center text-slate-500'>
                      ₺{item.stockValue.toLocaleString('tr-TR')}
                    </TableCell>
                  )}

                  {visibleColumns.forecastedDemand && (
                    <TableCell className='text-center text-blue-600 font-medium'>
                      {item.forecastedDemand.toLocaleString('tr-TR')}
                    </TableCell>
                  )}
                  {visibleColumns.daysOfCoverage && (
                    <TableCell
                      className={cn(
                        'text-center font-medium',
                        item.daysOfCoverage < 15
                          ? 'text-destructive'
                          : 'text-foreground',
                      )}
                    >
                      {item.daysOfCoverage}
                    </TableCell>
                  )}
                  {visibleColumns.status && (
                    <TableCell className='text-center'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='inline-flex items-center gap-1 cursor-help'>
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
                              className={cn(
                                item.status === 'In Stock' &&
                                  'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
                                item.status === 'Low Stock' &&
                                  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
                              )}
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
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side='left'
                          sideOffset={8}
                          className='max-w-xs'
                        >
                          {item.status === 'In Stock' && (
                            <p>
                              Ürün stok seviyesi belirlenen hedefler
                              dahilindedir.
                            </p>
                          )}
                          {item.status === 'Out of Stock' && (
                            <p>
                              Ürün tamamen tükenmiştir. Acil tedarik gereklidir.
                            </p>
                          )}
                          {item.status === 'Low Stock' && (
                            <p>Stok miktarı kritik seviyenin altındadır.</p>
                          )}
                          {item.status === 'Overstock' && (
                            <p>
                              Mevcut stok talebin çok üzerindedir. Depolama
                              maliyeti riski.
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
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
                  Seçili filtrelere uygun ürün bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ProductDetailSheet
        item={selectedItem}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  );
}
