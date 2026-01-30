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
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { cn } from '@/lib/utils';
import { PROMOTION_HISTORY_DATA } from '@/data/mock-data'; // We will create this

interface ExportPromotionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any[]; // Optional prop if we want to pass current simulation result
}

const ALL_COLUMNS = [
  { id: 'date', label: 'Tarih' },
  { id: 'name', label: 'Kampanya / Tip' },
  { id: 'type', label: 'Tip Kodu' },
  { id: 'uplift', label: 'Ciro Artışı (Lift)' },
  { id: 'upliftVal', label: 'Ciro Artış Değeri' },
  { id: 'profit', label: 'Net Kar Etkisi' },
  { id: 'roi', label: 'ROI (%)' },
  { id: 'stock', label: 'Stok Durumu' },
  { id: 'forecast', label: 'Tahmin Doğruluğu' },
];

export function ExportPromotionModal({
  open,
  onOpenChange,
  initialData,
}: ExportPromotionModalProps) {
  // Use passed data or fall back to mock data
  const dataToUse = initialData || PROMOTION_HISTORY_DATA || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.map((c) => c.id),
  );
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
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

  // Filtering Logic
  const filteredData = useMemo(() => {
    let result = dataToUse.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];

        // Handle numeric strings (ROI, upliftVal etc needs parsing if real implementation)
        // For now string comparison or basic numeric
         if (sortConfig.key === 'roi') {
             // Example parser if needed
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
  }, [dataToUse, searchQuery, sortConfig]);

  // Handle Select All
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Using index as ID since mock data might not have unique IDs
      const allIds = new Set(filteredData.map((_, i) => i.toString()));
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
      // Keep order based on ALL_COLUMNS
      newColumns.sort((a, b) => {
        const indexA = ALL_COLUMNS.findIndex((col) => col.id === a);
        const indexB = ALL_COLUMNS.findIndex((col) => col.id === b);
        return indexA - indexB;
      });
      setVisibleColumns(newColumns);
    }
  };

  // Export Functionality (CSV)
  const handleExport = () => {
    const rowsToExport = filteredData.filter((_, i) =>
        selectedRows.has(i.toString()) // Using index string as ID
    );
    
    if (rowsToExport.length === 0 && filteredData.length > 0) {
        // Fallback: if nothing selected but data exists, maybe export all? 
        // Or enforce selection. enforcing selection is consistent.
        return; 
    }
    
    const validRows = rowsToExport.length > 0 ? rowsToExport : []; 
    if (validRows.length === 0) return;

    const headers = visibleColumns
      .map((colId) => ALL_COLUMNS.find((c) => c.id === colId)?.label)
      .join(',');

    const csvRows = validRows.map((row) => {
      return visibleColumns
        .map((colId) => {
          let val = row[colId];
          // CSV escaping
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`;
          }
          return val;
        })
        .join(',');
    });

    const csvContent = [headers, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'promotion_history_export.csv');
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
        className='max-w-[calc(100vw-2rem)]! w-625! h-[calc(100vh-2rem)]! min-w-200! flex flex-col p-0 gap-0 rounded-xl overflow-hidden border-0 shadow-2xl'
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        {/* Header - Navy Blue (Lacivert) Theme matched to forecasting page */}
        <div className='px-6 py-4 bg-[#0D1E3A] text-white shrink-0'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='p-3 bg-[#FFB840] rounded-lg'>
                <HardDriveDownload className='h-6 w-6 text-[#0D1E3A]' />
              </div>
              <div>
                <DialogTitle className='text-2xl font-bold text-white'>
                  Promosyon Verisi Dışa Aktar
                </DialogTitle>
                <DialogDescription className='text-[#628BB1] text-sm mt-0.5'>
                  Promosyon geçmişi ve analiz sonuçlarını dışa aktarın.
                </DialogDescription>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2'>
                <ListChecks className='h-5 w-5 text-[#FFB840]' />
                <span className='text-2xl font-bold'>{selectedRows.size}</span>
                <span className='text-[#628BB1] text-sm'>satır seçili</span>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => onOpenChange(false)}
                className='text-white/70 hover:text-white hover:bg-white/10 ml-2'
              >
                ✕
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className='flex-1 flex overflow-hidden bg-[#F4F7FA]'>
          {/* Left Sidebar - Columns */}
          <div className='w-80 border-r border-border bg-card flex flex-col shrink-0'>
             <div className='p-5 border-b'>
                 <h3 className='text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2'>
                <Filter className='h-4 w-4 text-[#628BB1]' />
                Filtreler
              </h3>
              <div className='space-y-4'>
                   <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                        Arama
                    </Label>
                    <Input 
                        placeholder="Kampanya Ara..."
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-9"
                    />
                   </div>
              </div>
             </div>
          
            {/* Column Selection */}
            <div className='p-5 flex-1 overflow-auto'>
              <h3 className='text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2'>
                <Columns className='h-4 w-4 text-[#628BB1]' />
                Sütunlar
              </h3>
              <div className='space-y-1'>
                {ALL_COLUMNS.map((col) => (
                  <div
                    key={col.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
                      visibleColumns.includes(col.id)
                        ? 'bg-[#FFB840]/10 border border-[#FFB840]/30'
                        : 'bg-muted/30 hover:bg-muted/50 border border-transparent',
                    )}
                    onClick={() => toggleColumn(col.id)}
                  >
                    <Checkbox
                      checked={visibleColumns.includes(col.id)}
                      className={cn(
                        'pointer-events-none',
                        visibleColumns.includes(col.id) &&
                          'border-[#FFB840] bg-[#FFB840] text-[#0D1E3A]',
                      )}
                    />
                    <span className='text-sm font-medium'>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Table */}
          <div className='flex-1 flex flex-col overflow-hidden'>
             {/* Toolbar */}
            <div className='p-4 bg-card border-b flex justify-between items-center'>
                 <div className='text-sm text-muted-foreground'>
                    Toplam {filteredData.length} kayıt listelendi.
                 </div>
                 <Button 
                    onClick={handleExport}
                    disabled={selectedRows.size === 0}
                    className="bg-[#0D1E3A] hover:bg-[#1a3b6e] text-white"
                 >
                    <HardDriveDownload className="mr-2 h-4 w-4" />
                    Seçilileri İndir (.csv)
                 </Button>
            </div>

            {/* Table */}
            <div className='flex-1 overflow-auto p-4'>
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <table className='w-full text-sm'>
                    <thead className='sticky top-0 z-10'>
                      <tr className='border-b bg-[#F4F7FA]'>
                        <th className='w-14 text-center h-14 bg-[#F4F7FA]'>
                           <Checkbox
                             checked={isAllSelected}
                             onCheckedChange={handleSelectAll}
                             className='h-4 w-4 border-2 border-[#0D1E3A]'
                           />
                        </th>
                        {visibleColumns.map(colId => {
                            const col = ALL_COLUMNS.find(c => c.id === colId);
                            return (
                                <th 
                                    key={colId}
                                    onClick={() => handleSort(colId)}
                                    className='px-4 h-14 text-left font-semibold text-xs uppercase tracking-wider text-[#0D1E3A] bg-[#F4F7FA] cursor-pointer hover:bg-muted/50'
                                >
                                    <div className="flex items-center gap-1">
                                    {col?.label}
                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                    </div>
                                </th>
                            )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                        {filteredData.length === 0 ? (
                            <tr><td colSpan={visibleColumns.length + 1} className="p-8 text-center text-muted-foreground">Veri bulunamadı.</td></tr>
                        ) : (
                            filteredData.map((row, idx) => {
                                // We use index as ID for now because simulation data might lack unique IDs
                                const rowId = idx.toString();
                                const isSelected = selectedRows.has(rowId);
                                
                                return (
                                    <tr 
                                        key={idx}
                                        onClick={() => handleRowSelect(rowId, !isSelected)}
                                        className={cn(
                                            "border-b hover:bg-muted/50 cursor-pointer transition-colors h-12",
                                            isSelected && "bg-[#FFB840]/10",
                                            idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                                        )}
                                    >
                                        <td className="text-center">
                                            <Checkbox 
                                                checked={isSelected}
                                                className={cn(
                                                 'h-4 w-4 border-2 border-[#0D1E3A]',
                                                  isSelected && 'border-[#FFB840] bg-[#FFB840] text-[#0D1E3A]'
                                                )}
                                                onCheckedChange={(c) => handleRowSelect(rowId, c as boolean)}
                                            />
                                        </td>
                                        {visibleColumns.map(colId => (
                                            <td key={colId} className="px-4 py-3">
                                                {row[colId]}
                                            </td>
                                        ))}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
