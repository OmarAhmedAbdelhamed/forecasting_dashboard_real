'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/shared/dialog';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { MultiSelect } from '@/components/ui/shared/multi-select';
import { Checkbox } from '@/components/ui/shared/checkbox';
import { Badge } from '@/components/ui/shared/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Download,
  Filter,
  Search,
  Settings2,
  FileSpreadsheet,
  Columns,
  ListChecks,
  Package,
  ChevronRight,
  HardDriveDownload,
  Info,
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { ScrollArea } from '@/components/ui/shared/scroll-area';
import { STORES, REGIONS_FLAT as REGIONS, REYONLAR } from '@/data/mock-data';
import { cn } from '@/lib/utils';

// --- PRODUCT LIST FOR MOCK DATA ---
const PRODUCT_NAMES = [
  'Süt 1L',
  'Ekmek 500g',
  'Ayçiçek Yağı 5L',
  'Peynir 500g',
  'Yumurta 15li',
  'Tereyağ 250g',
  'Su 5L',
  'Kola 2.5L',
  'Meyve Suyu 1L',
  'Çay 1kg',
  'Deterjan 4kg',
  'Yumuşatıcı 2L',
  'Bulaşık Deterjanı 1L',
  'Şampuan 500ml',
  'Diş Macunu 100ml',
  'Sabun 4lü',
  'Zeytin 500g',
  'Zeytinyağı 1L',
  'Ayran 1L',
  'Un 5kg',
  'Şeker 5kg',
  'Tuz 1kg',
  'Makarna 500g',
  'Pirinç 1kg',
  'Bulgur 1kg',
  'Mercimek 1kg',
  'Nohut 1kg',
  'Domates Salçası 830g',
  'Ketçap 650g',
  'Mayonez 500g',
  'Nutella 750g',
  'Kahve 100g',
  'Bal 450g',
  'Reçel 380g',
  'Bisküvi 450g',
  'Çikolata 100g',
  'Cips 150g',
  'Dondurma 1L',
  'Yoğurt 1kg',
  'Kefir 500ml',
];

// --- MOCK DATA GENERATOR ---
const generateMockExportData = (count = 100, period: string = 'monthly') => {
  return Array.from({ length: count }).map((_, i) => {
    const store = STORES[i % STORES.length];
    const region = REGIONS[i % REGIONS.length];
    const reyon = REYONLAR[i % REYONLAR.length];
    const productName = PRODUCT_NAMES[i % PRODUCT_NAMES.length];

    // Deterministic SKU
    const sku = (30000000 + i).toString();

    // Scaling factor for period
    const factor = period === 'monthly' ? 1 : 0.25;

    // Realistic Price Ranges based on Category
    let price;
    switch (reyon.value) {
      case 'kasap':
        price = 400 + Math.random() * 400; // 400-800 TL
        break;
      case 'temizlik':
        price = 80 + Math.random() * 200; // 80-280 TL
        break;
      case 'sut_urunleri':
        price = 30 + Math.random() * 120; // 30-150 TL
        break;
      case 'manav':
        price = 20 + Math.random() * 60; // 20-80 TL
        break;
      case 'icecekler':
      case 'unlu_mamuller':
        price = 15 + Math.random() * 50; // 15-65 TL
        break;
      case 'atistirmalik':
        price = 10 + Math.random() * 40; // 10-50 TL
        break;
      default:
        price = 50 + Math.random() * 100;
    }

    const baseForecast = Math.floor((Math.random() * 500 + 100) * factor);
    const actual = Math.floor(baseForecast * (0.8 + Math.random() * 0.4));
    const futureForecast = Math.floor(
      baseForecast * (0.9 + Math.random() * 0.2),
    );

    // Stock Selling Rate Calculation (Average Daily Sales based on period)
    // Monthly: Divide by 30, Weekly: Divide by 7
    const periodDays = period === 'monthly' ? 30 : 7;
    const sellingRate = Math.round(actual / periodDays);

    return {
      id: `EXP-${1000 + i}`,
      productName: productName,
      sku: sku,
      region: region.label,
      store: store.label,
      category: reyon.label,
      forecastQty: baseForecast,
      actualSales: actual,
      accuracy: Math.min(
        100,
        Math.round((1 - Math.abs(baseForecast - actual) / baseForecast) * 100),
      ),
      stockLevel: Math.floor(baseForecast * (0.5 + Math.random())),
      revenue: (actual * price).toFixed(2),
      forecastRevenue: (baseForecast * price).toFixed(2),
      sellingRate: sellingRate,

      promotionStatus: (Math.random() > 0.6
        ? 'none'
        : Math.random() > 0.5
          ? 'scheduled'
          : 'ongoing') as 'none' | 'scheduled' | 'ongoing',
      futureForecast: futureForecast,
    };
  });
};

type ProductData = ReturnType<typeof generateMockExportData>[0];

const ALL_COLUMNS = [
  { id: 'sku', label: 'SKU' },
  { id: 'productName', label: 'Ürün Adı' },
  { id: 'region', label: 'Bölge' },
  { id: 'store', label: 'Mağaza' },
  { id: 'category', label: 'Reyon' },
  { id: 'forecastQty', label: 'Tahmin (Adet)' },
  { id: 'actualSales', label: 'Gerçekleşen' },
  { id: 'accuracy', label: 'Doğruluk (%)' },
  { id: 'stockLevel', label: 'Stok' },
  { id: 'sellingRate', label: 'Satış Hızı (Günlük)' },
  { id: 'futureForecast', label: 'Gelecek Tahmin' },
  { id: 'revenue', label: 'Ciro (TL)' },
  { id: 'forecastRevenue', label: 'Ciro Tahmini (TL)' },

  { id: 'promotionStatus', label: 'Promosiyon Durumu' },
];

interface ExportForecastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportForecastModal({
  open,
  onOpenChange,
}: ExportForecastModalProps) {
  // Filters
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedReyonlar, setSelectedReyonlar] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Column Selection
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.map((c) => c.id),
  );

  // Row Selection
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState<string>('monthly');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Sorting Handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Generate data based on period
  const MOCK_DATA = useMemo(
    () => generateMockExportData(100, period),
    [period],
  );

  // Filtering Logic
  const filteredData = useMemo(() => {
    let result = MOCK_DATA.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.includes(searchQuery);

      const matchesRegion =
        selectedRegions.length === 0 ||
        selectedRegions.some((r) => {
          const label = REGIONS.find((reg) => reg.value === r)?.label;
          return label && item.region === label;
        });

      const matchesStore =
        selectedStores.length === 0 ||
        selectedStores.some((s) => {
          const label = STORES.find((store) => store.value === s)?.label;
          return label && item.store === label.split(' - ')[1];
        });

      const matchesReyon =
        selectedReyonlar.length === 0 ||
        selectedReyonlar.some((k) => {
          const label = REYONLAR.find((cat) => cat.value === k)?.label;
          return label && item.category === label;
        });

      return matchesSearch && matchesRegion && matchesStore && matchesReyon;
    });

    // Sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof ProductData];
        let bValue: any = b[sortConfig.key as keyof ProductData];

        // Handle numeric strings (Revenue)
        if (['revenue', 'forecastRevenue'].includes(sortConfig.key)) {
          aValue = parseFloat(aValue as string);
          bValue = parseFloat(bValue as string);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [
    MOCK_DATA,
    searchQuery,
    selectedRegions,
    selectedStores,
    selectedReyonlar,
    sortConfig,
  ]);

  // Handle Select All
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredData.map((d) => d.id));
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  // Toggle column visibility
  const toggleColumn = (colId: string) => {
    if (visibleColumns.includes(colId)) {
      setVisibleColumns(visibleColumns.filter((c) => c !== colId));
    } else {
      const newColumns = [...visibleColumns, colId];
      newColumns.sort((a, b) => {
        const indexA = ALL_COLUMNS.findIndex((col) => col.id === a);
        const indexB = ALL_COLUMNS.findIndex((col) => col.id === b);
        return indexA - indexB;
      });
      setVisibleColumns(newColumns);
    }
  };

  // Export Functionality (Mock CSV)
  const handleExport = () => {
    const rowsToExport = filteredData.filter((d) => selectedRows.has(d.id));
    if (rowsToExport.length === 0) return;

    const headers = visibleColumns
      .map((colId) => {
        let label = ALL_COLUMNS.find((c) => c.id === colId)?.label;
        if (colId === 'forecastQty') {
          label =
            period === 'monthly' ? 'Geçmiş Tahmin (30g)' : 'Geçmiş Tahmin (7g)';
        } else if (colId === 'actualSales') {
          label =
            period === 'monthly' ? 'Gerçekleşen (30g)' : 'Gerçekleşen (7g)';
        } else if (colId === 'futureForecast') {
          label =
            period === 'monthly'
              ? 'Gelecek Tahmin (30g)'
              : 'Gelecek Tahmin (7g)';
        } else if (colId === 'forecastRevenue') {
          label =
            period === 'monthly' ? 'Ciro Tahmini (30g)' : 'Ciro Tahmini (7g)';
        }
        return label;
      })
      .join(',');

    const csvRows = rowsToExport.map((row) => {
      return visibleColumns
        .map((colId) => {
          let val = row[colId as keyof ProductData];

          // Translate Promotion Status for CSV
          if (colId === 'promotionStatus') {
            if (val === 'ongoing') val = 'Devam Eden';
            else if (val === 'scheduled') val = 'Planlanan';
            else if (val === 'none') val = 'Yok';
          }

          return typeof val === 'string' && val.includes(',')
            ? `"${val}"`
            : val;
        })
        .join(',');
    });

    const csvContent = [headers, ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'forecast_export_bee2ai.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onOpenChange(false);
  };

  const isAllSelected =
    filteredData.length > 0 && selectedRows.size === filteredData.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='w-[90vw] sm:max-w-[90vw] md:max-w-[90vw] h-[95vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden border-0 shadow-2xl'
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        {' '}
        {/* Header - Navy Blue (Lacivert) Theme */}
        <div className='px-4 py-3 bg-[#0D1E3A] text-white shrink-0'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-[#FFB840] rounded-lg'>
                <HardDriveDownload className='h-5 w-5 text-[#0D1E3A]' />
              </div>
              <div>
                <DialogTitle className='text-xl font-bold text-white'>
                  Veri Dışa Aktarma
                </DialogTitle>
                <DialogDescription className='text-[#628BB1] text-sm mt-0.5'>
                  Tahmin verilerinizi filtreleyebilirsiniz ve Excel formatında
                  indirebilirsiniz.
                </DialogDescription>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5'>
                <ListChecks className='h-4 w-4 text-[#FFB840]' />
                <span className='text-xl font-bold'>{selectedRows.size}</span>
                <span className='text-[#628BB1] text-sm'>satır seçili</span>
              </div>
              <div className='flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5'>
                <Columns className='h-4 w-4 text-[#FFB840]' />
                <span className='text-xl font-bold'>
                  {visibleColumns.length}
                </span>
                <span className='text-[#628BB1] text-sm'>sütun</span>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => onOpenChange(false)}
                className='text-white/70 hover:text-white hover:bg-white/10 ml-1 h-8 w-8'
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div className='flex-1 flex overflow-hidden bg-[#F4F7FA]'>
          {/* Left Sidebar - Filters & Columns */}
          <div className='w-64 border-r border-border bg-card flex flex-col shrink-0'>
            {/* Filters Section */}
            <div className='p-3 border-b'>
              <h3 className='text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2'>
                <Filter className='h-3.5 w-3.5 text-[#628BB1]' />
                Filtreler
              </h3>
              <div className='space-y-3'>
                <div className='space-y-1'>
                  <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Bölge
                  </Label>
                  <MultiSelect
                    options={REGIONS}
                    selected={selectedRegions}
                    onChange={setSelectedRegions}
                    placeholder='Tüm Bölgeler'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Mağaza
                  </Label>
                  <MultiSelect
                    options={STORES}
                    selected={selectedStores}
                    onChange={setSelectedStores}
                    placeholder='Tüm Mağazalar'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Reyon
                  </Label>
                  <MultiSelect
                    options={REYONLAR}
                    selected={selectedReyonlar}
                    onChange={setSelectedReyonlar}
                    placeholder='Tüm Reyonlar'
                  />
                </div>
                {/* Period Selector - Segmented Control */}
                <div className='space-y-1'>
                  <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Dönem
                  </Label>
                  <div className='flex items-center p-1 bg-muted/40 border rounded-lg h-9'>
                    <button
                      onClick={() => setPeriod('monthly')}
                      className={cn(
                        'flex-1 flex items-center justify-center text-sm font-medium h-full rounded-md transition-all',
                        period === 'monthly'
                          ? 'bg-white text-[#0D1E3A] shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Aylık
                    </button>
                    <div className='w-px h-3 bg-border/50 mx-1' />
                    <button
                      onClick={() => setPeriod('weekly')}
                      className={cn(
                        'flex-1 flex items-center justify-center text-sm font-medium h-full rounded-md transition-all',
                        period === 'weekly'
                          ? 'bg-white text-[#0D1E3A] shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Haftalık
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Column Selection */}
            <div className='p-3 flex-1 overflow-auto'>
              <h3 className='text-xs font-semibold text-card-foreground mb-3 flex items-center gap-2'>
                <Columns className='h-3.5 w-3.5 text-[#628BB1]' />
                Dışa Aktarılacak Sütunlar
              </h3>
              <div className='space-y-0.5'>
                {ALL_COLUMNS.map((col) => (
                  <div
                    key={col.id}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all',
                      visibleColumns.includes(col.id)
                        ? 'bg-[#FFB840]/10 border border-[#FFB840]/30'
                        : 'bg-muted/30 hover:bg-muted/50 border border-transparent',
                    )}
                    onClick={() => toggleColumn(col.id)}
                  >
                    <Checkbox
                      checked={visibleColumns.includes(col.id)}
                      className={cn(
                        'pointer-events-none h-3.5 w-3.5',
                        visibleColumns.includes(col.id) &&
                          'border-[#FFB840] bg-[#FFB840] text-[#0D1E3A]',
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        visibleColumns.includes(col.id)
                          ? 'text-card-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Table */}
          <div className='flex-1 flex flex-col overflow-hidden'>
            {/* Search Bar */}
            <div className='p-3 bg-card border-b'>
              <div className='relative'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Ürün ara (İsim veya SKU yazın)...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10 h-10 text-base bg-muted/30 border-muted focus-visible:ring-[#FFB840] focus-visible:border-[#FFB840]'
                />
              </div>
            </div>

            {/* Table */}
            <div className='flex-1 overflow-hidden p-3 flex flex-col'>
              <div className='rounded-xl border bg-card shadow-sm flex-1 overflow-auto'>
                <table className='min-w-225 w-full text-sm'>
                  <thead className='sticky top-0 z-10'>
                    <tr className='border-b bg-[#F4F7FA]'>
                      <th className='w-10 text-center h-10 px-1 font-medium bg-[#F4F7FA] align-middle'>
                        <div className='flex items-center justify-center'>
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                            className='h-3.5 w-3.5 border-2 border-[#0D1E3A]'
                          />
                        </div>
                      </th>
                      {visibleColumns.map((colId) => {
                        const col = ALL_COLUMNS.find((c) => c.id === colId);

                        // Dynamic Header Logic
                        let label = col?.label;
                        let tooltipText = '';

                        if (colId === 'forecastQty') {
                          label =
                            period === 'monthly'
                              ? 'Geçmiş Tahmin (30g)'
                              : 'Geçmiş Tahmin (7g)';
                          tooltipText = 'Geçmiş döneme ait yapay zeka tahmini.';
                        } else if (colId === 'actualSales') {
                          label =
                            period === 'monthly'
                              ? 'Gerçekleşen (30g)'
                              : 'Gerçekleşen (7g)';
                          tooltipText =
                            'Belirtilen dönem için gerçekleşen satış verisi.';
                        } else if (colId === 'futureForecast') {
                          label =
                            period === 'monthly'
                              ? 'Gelecek Tahmin (30g)'
                              : 'Gelecek Tahmin (7g)';
                          tooltipText =
                            'Gelecek dönem için öngörülen satış miktarı. Renk kodu stok durumunu gösterir.';
                        } else if (colId === 'accuracy') {
                          tooltipText = 'Tahmin doğruluğu yüzdesi.';
                        } else if (colId === 'revenue') {
                          tooltipText =
                            'Belirtilen dönem için toplam satış tutarı.';
                        } else if (colId === 'forecastRevenue') {
                          tooltipText =
                            'Yapay zeka tahmini ile hesaplanan beklenen ciro.';
                          label =
                            period === 'monthly'
                              ? 'Ciro Tahmini (30g)'
                              : 'Ciro Tahmini (7g)';
                        } else if (colId === 'promotionStatus') {
                          tooltipText =
                            'Ürünün promosiyon kampanyası durumu (Devam Eden, Planlanan veya Yok).';
                          tooltipText =
                            'Geçen yılın aynı dönemine kıyasla satışlardaki büyüme oranı (YoY). (Hesaplanmamış)';
                          // Note: YoY logic is not strictly present in mock data here, placeholder or derived if needed.
                        } else if (colId === 'sellingRate') {
                          tooltipText =
                            'Seçilen dönemdeki ortalama günlük satış adedi.';
                        }

                        // Alignment
                        const isNumeric = [
                          'forecastQty',
                          'actualSales',
                          'accuracy',
                          'stockLevel',
                          'revenue',
                          'forecastRevenue',
                          'futureForecast',
                          'sellingRate',
                        ].includes(colId);

                        return (
                          <th
                            key={colId}
                            onClick={() => handleSort(colId)}
                            className={cn(
                              'h-10 px-2 text-left font-semibold text-xs uppercase tracking-wider text-[#0D1E3A] bg-[#F4F7FA] cursor-pointer hover:bg-muted/50 transition-colors select-none group',
                              isNumeric && 'text-center',
                            )}
                          >
                            <div
                              className={cn(
                                'flex items-center gap-1.5',
                                isNumeric && 'justify-center',
                              )}
                            >
                              {label}

                              {/* Sort Icon */}
                              {(() => {
                                const isActive = sortConfig?.key === colId;
                                const Icon = isActive
                                  ? sortConfig.direction === 'asc'
                                    ? ArrowDown
                                    : ArrowUp
                                  : ArrowUpDown;

                                return (
                                  <Icon
                                    className={cn(
                                      'h-3.5 w-3.5 transition-all',
                                      isActive
                                        ? 'text-[#FFB840] opacity-100 scale-110'
                                        : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100 scale-90',
                                    )}
                                  />
                                );
                              })()}

                              {tooltipText && (
                                <Tooltip>
                                  <TooltipTrigger
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Info className='h-3.5 w-3.5 text-muted-foreground/70 hover:text-[#FFB840] transition-colors cursor-help' />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className='max-w-50'>{tooltipText}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={visibleColumns.length + 1}
                          className='h-48 text-center'
                        >
                          <div className='flex flex-col items-center gap-3 text-muted-foreground'>
                            <Package className='h-12 w-12 opacity-30' />
                            <p className='font-medium text-lg'>
                              Sonuç bulunamadı
                            </p>
                            <p className='text-sm'>
                              Farklı filtreler deneyebilirsiniz
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={cn(
                            'transition-colors cursor-pointer h-12 border-b hover:bg-muted/50',
                            selectedRows.has(row.id) && 'bg-[#FFB840]/10',
                            idx % 2 === 0 ? 'bg-white' : 'bg-muted/20',
                          )}
                          onClick={() =>
                            handleRowSelect(row.id, !selectedRows.has(row.id))
                          }
                        >
                          <td className='text-center px-1 align-middle'>
                            <div className='flex items-center justify-center'>
                              <Checkbox
                                checked={selectedRows.has(row.id)}
                                onCheckedChange={(checked) =>
                                  handleRowSelect(row.id, checked as boolean)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  'h-3.5 w-3.5 border-2 border-[#0D1E3A]',
                                  selectedRows.has(row.id) &&
                                    'border-[#FFB840] bg-[#FFB840] text-[#0D1E3A]',
                                )}
                              />
                            </div>
                          </td>
                          {visibleColumns.map((colId) => {
                            const val = row[colId as keyof ProductData];
                            const isNumeric = [
                              'forecastQty',
                              'actualSales',
                              'accuracy',
                              'stockLevel',
                              'revenue',
                              'forecastRevenue',
                              'futureForecast',
                              'sellingRate',
                            ].includes(colId);

                            return (
                              <td
                                key={colId}
                                className={cn(
                                  'py-2 px-2',
                                  isNumeric && 'text-center',
                                )}
                              >
                                {colId === 'accuracy' ? (
                                  <Badge
                                    className={cn(
                                      'font-mono px-2 py-0.5',
                                      (val as number) > 90
                                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                        : (val as number) > 70
                                          ? 'bg-[#FFB840]/20 text-[#0D1E3A] hover:bg-[#FFB840]/20'
                                          : 'bg-red-100 text-red-700 hover:bg-red-100',
                                    )}
                                  >
                                    %{val}
                                  </Badge>
                                ) : colId === 'revenue' ||
                                  colId === 'forecastRevenue' ? (
                                  <span className='font-semibold text-[#0D1E3A]'>
                                    ₺{val}
                                  </span>
                                ) : colId === 'promotionStatus' ? (
                                  <Badge
                                    variant='outline'
                                    className={cn(
                                      'text-sm',
                                      val === 'ongoing'
                                        ? 'border-green-300 bg-green-50 text-green-700'
                                        : val === 'scheduled'
                                          ? 'border-orange-300 bg-orange-50 text-orange-700'
                                          : 'border-slate-200 bg-slate-100 text-slate-500',
                                    )}
                                  >
                                    {val === 'ongoing'
                                      ? 'Devam Ediyor'
                                      : val === 'scheduled'
                                        ? 'Planlandı'
                                        : 'Yok'}
                                  </Badge>
                                ) : colId === 'sku' ? (
                                  <span className='font-mono text-sm text-muted-foreground'>
                                    {val}
                                  </span>
                                ) : colId === 'futureForecast' ? (
                                  <div
                                    className={cn(
                                      'flex items-center gap-2',
                                      isNumeric && 'justify-center',
                                    )}
                                  >
                                    <span className='font-mono font-medium'>
                                      {(val as number).toLocaleString()}
                                    </span>
                                    {/* Stock Status Indicator */}
                                    {(() => {
                                      const stock = row.stockLevel;
                                      const forecast = val as number;
                                      let colorClass = '';

                                      if (stock >= forecast) {
                                        colorClass = 'bg-green-500'; // Good stock
                                      } else if (stock >= forecast * 0.5) {
                                        colorClass = 'bg-[#FFB840]'; // Warning
                                      } else {
                                        colorClass = 'bg-red-500'; // Critical
                                      }

                                      return (
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <div
                                              className={cn(
                                                'h-2.5 w-2.5 rounded-full',
                                                colorClass,
                                              )}
                                            />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>
                                              Stok: {stock} / Tahmin: {forecast}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })()}
                                  </div>
                                ) : colId === 'forecastQty' ||
                                  colId === 'actualSales' ||
                                  colId === 'stockLevel' ? (
                                  <span className='font-mono'>
                                    {(val as number).toLocaleString()}
                                  </span>
                                ) : (
                                  (val as React.ReactNode)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className='px-4 py-3 border-t bg-card flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <span className='text-sm text-muted-foreground'>
              Toplam{' '}
              <span className='font-bold text-card-foreground'>
                {filteredData.length}
              </span>{' '}
              kayıt
            </span>
            {selectedRows.size > 0 && (
              <span className='text-sm text-[#628BB1]'>
                <span className='font-bold text-[#0D1E3A]'>
                  {selectedRows.size}
                </span>{' '}
                satır seçildi
              </span>
            )}
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='h-9 px-4 border-border hover:bg-muted text-sm'
            >
              İptal
            </Button>
            <Button
              className='h-9 px-5 gap-2 bg-[#FFB840] hover:bg-[#e5a636] text-[#0D1E3A] font-semibold shadow-lg text-sm'
              onClick={handleExport}
              disabled={selectedRows.size === 0}
            >
              <Download className='h-3.5 w-3.5' />
              Excel Olarak İndir ({selectedRows.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
