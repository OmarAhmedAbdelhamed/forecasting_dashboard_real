'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { MultiSelect } from '@/components/ui/shared/multi-select';
import { Checkbox } from '@/components/ui/shared/checkbox';
import { Badge } from '@/components/ui/shared/badge';
import {
  Filter,
  Search,
  Columns,
  ListChecks,
  Package,
  HardDriveDownload,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { cn } from '@/lib/utils';
import {
  STORES,
  REGIONS_FLAT as REGIONS,
  REYONLAR,
  type PromotionHistoryItem,
} from '@/data/mock-data';

// --- MOCK DATA GENERATOR ---
const CAMPAIGN_NAMES = [
  'Bahar Temizliği',
  'Ramazan Paketi',
  'Sevgililer Günü',
  'Kış İndirimi',
  'Yılbaşı Özel',
  'Efsane Cuma',
  'Okula Dönüş',
  'Yaz Fırsatları',
  'Haftasonu Çılgınlığı',
  'Süper Salı',
];

const PROMO_TYPES = [
  'INTERNET_INDIRIMI',
  'ALISVERIS_INDIRIMI_500',
  'COKLU_ALIM',
  'OZEL_GUN_INDIRIMI',
  'SADAKAT_KART',
  'Mağaza İçi',
];

const generateMockPromotionData = (count = 100) => {
  return Array.from({ length: count }).map((_, i) => {
    const store = STORES[i % STORES.length];
    const region = REGIONS[i % REGIONS.length];
    const reyon = REYONLAR[i % REYONLAR.length];
    const name = CAMPAIGN_NAMES[i % CAMPAIGN_NAMES.length];
    const type = PROMO_TYPES[i % PROMO_TYPES.length];

    // Random Metrics
    const uplift = Math.floor(Math.random() * 60) + 10; // 10-70%
    const upliftVal = (uplift * (100 + Math.random() * 500)).toFixed(1);
    const roi = Math.floor(Math.random() * 200) - 50; // -50 to 150
    const profit = (Math.random() * 10000 - 2000).toFixed(1); // -2k to 8k
    const accuracy = Math.floor(Math.random() * 40) + 60; // 60-100%

    // Stock Status
    const stockStatuses = ['OK', 'OK', 'OK', 'Over', 'OOS'];
    const stock =
      stockStatuses[Math.floor(Math.random() * stockStatuses.length)];

    // Date (Random past date)
    const date = new Date(
      2025,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    );
    const dateStr = date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      id: `PROMO-${1000 + i}`,
      date: dateStr,
      name: name,
      type: type,
      region: region.label,
      store: store.label,
      category: reyon.label,
      uplift: uplift,
      upliftVal: parseFloat(upliftVal),
      profit: parseFloat(profit),
      roi: roi,
      stock: stock,
      forecast: accuracy,
      status: ['draft', 'pending', 'approved', 'completed'][Math.floor(Math.random() * 4)],
    };
  });
};

type PromotionData = ReturnType<typeof generateMockPromotionData>[0];

const ALL_COLUMNS = [
  { id: 'date', label: 'Tarih' },
  { id: 'status', label: 'DURUM' },
  { id: 'name', label: 'Kampanya / Tip' },
  { id: 'type', label: 'Tip Kodu' },
  { id: 'region', label: 'Bölge' },
  { id: 'store', label: 'Mağaza' },
  { id: 'category', label: 'Reyon' },
  { id: 'uplift', label: 'Ciro Artışı (Lift)' },
  { id: 'upliftVal', label: 'Ciro Artış Değeri' },
  { id: 'profit', label: 'Brüt Kar Etkisi (₺)' },
  { id: 'roi', label: 'Satış Oranı (%)' },
  { id: 'stock', label: 'Stok Durumu' },
  { id: 'forecast', label: 'Tahmin Doğruluğu' },
];

const PROMO_STATUSES = [
  { value: 'draft', label: 'Taslak' },
  { value: 'pending', label: 'Onay Bekliyor' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'completed', label: 'Tamamlandı' },
];

interface ExportPromotionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: PromotionHistoryItem[];
}

export function ExportPromotionModal({
  open,
  onOpenChange,
  initialData,
}: ExportPromotionModalProps) {
  // Filters
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
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
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Sorting Handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (
      sortConfig?.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Data Transformation Helper (if needed)
  const transformToModalData = (
    data: PromotionHistoryItem[],
  ): PromotionData[] => {
    return data.map((item, i) => ({
      id: `PROMO-HIST-${i}`,
      date: item.date,
      name: item.name,
      type: item.type,
      region: 'Tüm Bölgeler', // Default as these are not in PromotionHistoryItem but expected in modal
      store: 'Tüm Mağazalar', // Default
      category: 'Çeşitli', // Default
      uplift: parseFloat(item.uplift.replace('%', '').replace('+', '')),
      upliftVal:
        parseFloat(item.upliftVal.replace('₺', '').replace('k', '')) * 1000,
      profit: parseFloat(
        item.profit.replace('₺', '').replace('k', '').replace('+', ''),
      ),
      roi: item.roi,
      stock: item.stock,
      forecast: parseFloat(item.forecast.replace('%', '')),
      status: item.status || 'completed',
    }));
  };

  // Generate or use provided data
  const MOCK_DATA = useMemo(() => {
    if (initialData && initialData.length > 0) {
      return transformToModalData(initialData);
    }
    return generateMockPromotionData(100);
  }, [initialData]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    const result = MOCK_DATA.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());

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
          return item.store === label?.split(' - ')[1];
        });

      const matchesReyon =
        selectedReyonlar.length === 0 ||
        selectedReyonlar.some((k) => {
          const label = REYONLAR.find((cat) => cat.value === k)?.label;
          return label && item.category === label;
        });

      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(item.status);

      return matchesSearch && matchesStatus && matchesRegion && matchesStore && matchesReyon;
    });

    // Sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof PromotionData];
        const bValue = b[sortConfig.key as keyof PromotionData];

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
    selectedStatuses,
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
    if (rowsToExport.length === 0) {return;}

    // Excel Logic: Add 'VERİ TİPİ' (Data Type)
    // Header
    const headers = [
      'VERİ TİPİ',
      ...visibleColumns.map((colId) => ALL_COLUMNS.find((c) => c.id === colId)?.label)
    ].join(',');

    const csvRows = rowsToExport.map((row) => {
      // Determine Data Type
      const dataType = row.status === 'completed' ? 'Gerçekleşen' : 'Tahmin';
      
      const rowData = visibleColumns
        .map((colId) => {
          const val = row[colId as keyof PromotionData];
          return typeof val === 'string' && val.includes(',')
            ? `"${val}"`
            : val;
        })
        .join(',');
      
      return `${dataType},${rowData}`;
    });

    const csvContent = [headers, ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'promotion_export_bee2ai.csv');
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
                  Promosyon Verisi Dışa Aktar
                </DialogTitle>
                <DialogDescription className='text-[#628BB1] text-sm mt-0.5'>
                  Promosyon geçmişi ve analiz sonuçlarını dışa aktarın.
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
                onClick={() => { onOpenChange(false); }}
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
                    Durum
                  </Label>
                  <MultiSelect
                    options={PROMO_STATUSES}
                    selected={selectedStatuses}
                    onChange={setSelectedStatuses}
                    placeholder='Tüm Durumlar'
                  />
                </div>
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
                    onClick={() => { toggleColumn(col.id); }}
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
            {/* Search Bar */}
            <div className='p-3 bg-card border-b'>
              <div className='relative'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Kampanya veya Tip ara...'
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); }}
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

                        const label = col?.label;
                        let tooltipText = '';

                        if (colId === 'uplift') {
                          tooltipText = 'Promosyon kaynaklı ciro artış oranı.';
                        } else if (colId === 'upliftVal') {
                          tooltipText =
                            'Promosyon kaynaklı ciro artış tutarı (TL).';
                        } else if (colId === 'profit') {
                          tooltipText = 'Promosyonun net karlılığa etkisi.';
                        } else if (colId === 'roi') {
                          tooltipText =
                            'Stok eritme başarısı (Sell-Through).';
                        } else if (colId === 'stock') {
                          tooltipText = 'Kampanya dönemi stok yeterliliği.';
                        }

                        // Alignment
                        const isNumeric = [
                          'uplift',
                          'upliftVal',
                          'profit',
                          'roi',
                          'stock',
                          'forecast',
                        ].includes(colId);

                        return (
                          <th
                            key={colId}
                            onClick={() => { handleSort(colId); }}
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
                                    onClick={(e) => { e.stopPropagation(); }}
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
                            { handleRowSelect(row.id, !selectedRows.has(row.id)); }
                          }
                        >
                          <td className='text-center px-1 align-middle'>
                            <div className='flex items-center justify-center'>
                              <Checkbox
                                checked={selectedRows.has(row.id)}
                                onCheckedChange={(checked) =>
                                  { handleRowSelect(row.id, checked as boolean); }
                                }
                                onClick={(e) => { e.stopPropagation(); }}
                                className={cn(
                                  'h-3.5 w-3.5 border-2 border-[#0D1E3A]',
                                  selectedRows.has(row.id) &&
                                    'border-[#FFB840] bg-[#FFB840] text-[#0D1E3A]',
                                )}
                              />
                            </div>
                          </td>
                          {visibleColumns.map((colId) => {
                            const val = row[colId as keyof PromotionData];
                            const isNumeric = [
                              'uplift',
                              'upliftVal',
                              'profit',
                              'roi',
                              'stock',
                              'forecast',
                            ].includes(colId);

                            return (
                              <td
                                key={colId}
                                className={cn(
                                  'py-2 px-2',
                                  isNumeric && 'text-center',
                                )}
                              >
                                {colId === 'status' ? (
                                  <Badge
                                    className={cn(
                                        'px-2 py-0.5 border text-[10px] font-bold uppercase',
                                        val === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50' :
                                        val === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50' :
                                        val === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50' :
                                        'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100'
                                    )}
                                  >
                                    {PROMO_STATUSES.find(s => s.value === val)?.label || val}
                                  </Badge>
                                ) : colId === 'uplift' ? (
                                  <div className="flex flex-col items-center">
                                      <span className='text-green-600 font-medium'>%{val}</span>
                                      {row.status !== 'completed' && <span className="text-[9px] text-muted-foreground">(Tahmin)</span>}
                                  </div>
                                ) : colId === 'roi' ? (
                                  <Badge
                                    className={cn(
                                      'px-2 py-0.5',
                                        // Mock threshold logic for Sell-Through
                                        (val as number) > 90
                                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
                                    )}
                                  >
                                    %{val}
                                  </Badge>
                                ) : colId === 'stock' ? (
                                  <span
                                    className={cn(
                                      'font-medium px-2 py-1 rounded text-xs',
                                      val === 'OK'
                                        ? 'bg-green-100 text-green-800'
                                        : val === 'OOS'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800',
                                    )}
                                  >
                                    {val === 'OK' ? 'Güvenli' : val === 'OOS' ? 'Riskli' : 'Aşırı'}
                                  </span>
                                ) : colId === 'profit' ? (
                                  <span
                                    className={cn(
                                      'font-medium',
                                      (val as number) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-500',
                                    )}
                                  >
                                    {(val as number) >= 0 ? '+' : ''}₺{val}k
                                  </span>
                                ) : colId === 'upliftVal' ? (
                                  <span className='font-medium text-[#0D1E3A]'>
                                    +₺{val}k
                                  </span>
                                ) : colId === 'forecast' ? (
                                  <span className='text-muted-foreground'>
                                    %{val}
                                  </span>
                                ) : (
                                  <span className='font-medium text-[#0D1E3A]'>
                                    {val}
                                  </span>
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
              onClick={() => { onOpenChange(false); }}
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
