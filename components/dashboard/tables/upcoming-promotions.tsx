import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Info, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { Button } from '@/components/ui/shared/button';

import { dashboardApi } from '@/services/api/dashboard';
import { FilterParams, PromotionItem } from '@/services/types/api';

interface UpcomingPromotionsProps {
  promotions: PromotionItem[];
  filters?: FilterParams;
}

const PAGE_SIZE = 10;
type SortKey =
  | 'durationDays'
  | 'discount'
  | 'productCount'
  | 'startDate'
  | 'endDate';
type SortDirection = 'asc' | 'desc';

function getDiscountAsNumber(discount: string | number | null | undefined) {
  if (typeof discount === 'number') {
    return discount;
  }
  if (discount === null || discount === undefined || discount.trim() === '') {
    return 0;
  }
  const normalized = discount.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateAsNumber(dateValue: string | null | undefined) {
  if (
    dateValue === null ||
    dateValue === undefined ||
    dateValue.trim() === ''
  ) {
    return 0;
  }
  const parsed = Date.parse(dateValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '-';
  }
  return `${value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}

function HeaderWithTooltip({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className='inline-flex items-center gap-1.5'>
      <span>{title}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            className='text-muted-foreground hover:text-foreground'
            aria-label={`${title} aciklamasi`}
          >
            <Info className='h-3.5 w-3.5' />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side='top'
          className='max-w-[280px] text-xs leading-relaxed'
        >
          {description}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function UpcomingPromotions({
  promotions,
  filters,
}: UpcomingPromotionsProps) {
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedPromotion, setSelectedPromotion] =
    useState<PromotionItem | null>(null);

  const handleSort = (key: SortKey) => {
    setCurrentPage(1);
    if (sortBy !== key) {
      setSortBy(key);
      setSortDirection('asc');
      return;
    }
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortBy !== key) {
      return <ArrowUpDown className='h-3.5 w-3.5 text-muted-foreground/70' />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className='h-3.5 w-3.5 text-foreground' />;
    }
    return <ArrowDown className='h-3.5 w-3.5 text-foreground' />;
  };

  const detailParams = useMemo(() => {
    if (!selectedPromotion) {
      return null;
    }

    return {
      ...(filters ?? {}),
      promotionName: selectedPromotion.name,
      startDate: selectedPromotion.startDate,
      endDate: selectedPromotion.endDate,
    };
  }, [filters, selectedPromotion]);

  const { data: promotionDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['dashboard-promotion-detail', detailParams],
    queryFn: () => {
      if (!detailParams) {
        throw new Error('Promotion detail params are missing');
      }
      return dashboardApi.getPromotionDetails(detailParams);
    },
    enabled: open && !!detailParams,
    staleTime: 1000 * 30,
  });

  const sortedPromotions = useMemo(() => {
    if (!sortBy) {
      return promotions;
    }

    const sorted = [...promotions].sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      if (sortBy === 'durationDays') {
        aValue = a.durationDays;
        bValue = b.durationDays;
      } else if (sortBy === 'discount') {
        aValue = getDiscountAsNumber(a.discount);
        bValue = getDiscountAsNumber(b.discount);
      } else if (sortBy === 'startDate') {
        aValue = getDateAsNumber(a.startDate);
        bValue = getDateAsNumber(b.startDate);
      } else if (sortBy === 'endDate') {
        aValue = getDateAsNumber(a.endDate);
        bValue = getDateAsNumber(b.endDate);
      } else {
        aValue = a.productCount ?? 0;
        bValue = b.productCount ?? 0;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [promotions, sortBy, sortDirection]);

  const totalItems = sortedPromotions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedPromotions = useMemo(
    () =>
      sortedPromotions.slice(
        (safeCurrentPage - 1) * PAGE_SIZE,
        safeCurrentPage * PAGE_SIZE,
      ),
    [safeCurrentPage, sortedPromotions],
  );

  const paginationItems = (() => {
    const radius = 2;
    const items: (number | string)[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) {
        items.push(i);
      }
      return items;
    }

    let start = Math.max(1, safeCurrentPage - radius);
    let end = Math.min(totalPages, safeCurrentPage + radius);

    if (start <= 2) {
      start = 1;
      end = 5;
    }
    if (end >= totalPages - 1) {
      start = totalPages - 4;
      end = totalPages;
    }

    if (start > 1) {
      items.push(1);
      if (start > 2) {
        items.push('...');
      }
    }

    for (let i = start; i <= end; i += 1) {
      items.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        items.push('...');
      }
      items.push(totalPages);
    }

    return items;
  })();

  return (
    <>
      <Card>
        <CardHeader className='pb-2 pt-3 px-4'>
          <CardTitle className='text-base md:text-lg'>
            Yaklasan Promosyonlar (Gelecek 7 Gun)
          </CardTitle>
          <CardDescription className='text-xs'>
            Onaylanan ve planlanan kampanyalar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampanya Adi</TableHead>
                <TableHead>
                  <button
                    type='button'
                    onClick={() => {
                      handleSort('durationDays');
                    }}
                    className='inline-flex items-center gap-1.5 hover:text-foreground'
                    aria-label='Sure sutununu sirala'
                  >
                    <span>Sure (Gun)</span>
                    {renderSortIcon('durationDays')}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type='button'
                    onClick={() => {
                      handleSort('startDate');
                    }}
                    className='inline-flex items-center gap-1.5 hover:text-foreground'
                    aria-label='Baslangic sutununu sirala'
                  >
                    <span>Baslangic</span>
                    {renderSortIcon('startDate')}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type='button'
                    onClick={() => {
                      handleSort('endDate');
                    }}
                    className='inline-flex items-center gap-1.5 hover:text-foreground'
                    aria-label='Bitis sutununu sirala'
                  >
                    <span>Bitis</span>
                    {renderSortIcon('endDate')}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type='button'
                    onClick={() => {
                      handleSort('discount');
                    }}
                    className='inline-flex items-center gap-1.5 hover:text-foreground'
                    aria-label='Indirim sutununu sirala'
                  >
                    <span>Indirim</span>
                    {renderSortIcon('discount')}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type='button'
                    onClick={() => {
                      handleSort('productCount');
                    }}
                    className='inline-flex items-center gap-1.5 hover:text-foreground'
                    aria-label='Urun sayisi sutununu sirala'
                  >
                    <span>Urun Sayisi</span>
                    {renderSortIcon('productCount')}
                  </button>
                </TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-center text-sm text-muted-foreground'
                  >
                    Gosterilecek promosyon bulunamadi.
                  </TableCell>
                </TableRow>
              ) : (
                pagedPromotions.map((promo, index) => (
                  <TableRow
                    key={`${promo.name}-${promo.startDate}-${promo.endDate}-${promo.discount}-${promo.status}-${String((safeCurrentPage - 1) * PAGE_SIZE + index)}`}
                    className='cursor-pointer hover:bg-muted/50 transition-colors'
                    onClick={() => {
                      setSelectedPromotion(promo);
                      setOpen(true);
                    }}
                  >
                    <TableCell className='font-medium'>{promo.name}</TableCell>
                    <TableCell>{promo.durationDays}</TableCell>
                    <TableCell>{promo.startDate}</TableCell>
                    <TableCell>{promo.endDate}</TableCell>
                    <TableCell>{promo.discount}</TableCell>
                    <TableCell className='font-medium'>
                      {(promo.productCount ?? 0).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          promo.status === 'Aktif'
                            ? 'default'
                            : promo.status === 'Beklemede'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {promo.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className='mt-4 flex flex-col gap-3 rounded-lg border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='text-sm text-muted-foreground'>
              {totalItems.toLocaleString('tr-TR')} kayit arasindan{' '}
              {totalItems === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(safeCurrentPage * PAGE_SIZE, totalItems)} arasi
              gosteriliyor
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setCurrentPage(Math.max(1, safeCurrentPage - 1));
                }}
                disabled={safeCurrentPage <= 1}
              >
                Onceki
              </Button>
              <div className='flex items-center gap-1'>
                {paginationItems.map((item, idx) => {
                  if (item === '...') {
                    return (
                      <span
                        key={`ellipsis-${String(idx)}`}
                        className='px-2 text-muted-foreground'
                      >
                        ...
                      </span>
                    );
                  }
                  const page = item as number;
                  return (
                    <Button
                      key={`page-${String(page)}`}
                      variant={safeCurrentPage === page ? 'default' : 'outline'}
                      size='sm'
                      className='min-w-9'
                      onClick={() => {
                        setCurrentPage(page);
                      }}
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
                  setCurrentPage(Math.min(totalPages, safeCurrentPage + 1));
                }}
                disabled={safeCurrentPage >= totalPages}
              >
                Sonraki
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='w-[min(96vw,1400px)] max-w-none sm:max-w-none h-[88vh] flex flex-col p-4 sm:p-6'>
          <DialogHeader>
            <DialogTitle className='text-xl'>
              {selectedPromotion?.name ?? 'Promosyon Detayi'}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className='py-12 flex items-center justify-center text-muted-foreground gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Detaylar yukleniyor...
            </div>
          ) : (
            <div className='space-y-4 min-h-0 overflow-y-auto pr-1'>
              <div className='grid grid-cols-2 md:grid-cols-6 gap-3'>
                <div className='rounded-lg border p-3 bg-muted/20'>
                  <div className='text-xs text-muted-foreground'>Baslangic</div>
                  <div className='text-sm font-semibold'>
                    {promotionDetail?.summary.startDate ?? '-'}
                  </div>
                </div>
                <div className='rounded-lg border p-3 bg-muted/20'>
                  <div className='text-xs text-muted-foreground'>Bitis</div>
                  <div className='text-sm font-semibold'>
                    {promotionDetail?.summary.endDate ?? '-'}
                  </div>
                </div>
                <div className='rounded-lg border p-3 bg-muted/20'>
                  <div className='text-xs text-muted-foreground'>Sure</div>
                  <div className='text-sm font-semibold'>
                    {(
                      promotionDetail?.summary.durationDays ?? 0
                    ).toLocaleString('tr-TR')}{' '}
                    gun
                  </div>
                </div>
                <div className='rounded-lg border p-3 bg-muted/20'>
                  <div className='text-xs text-muted-foreground'>
                    Urun Sayisi
                  </div>
                  <div className='text-sm font-semibold'>
                    {(
                      promotionDetail?.summary.productCount ?? 0
                    ).toLocaleString('tr-TR')}
                  </div>
                </div>
                <div className='rounded-lg border p-3 bg-muted/20'>
                  <div className='text-xs text-muted-foreground'>
                    Etkilenen Magaza
                  </div>
                  <div className='text-sm font-semibold'>
                    {(
                      promotionDetail?.summary.affectedStoreCount ?? 0
                    ).toLocaleString('tr-TR')}
                  </div>
                </div>
                <div className='rounded-lg border p-3 bg-muted/20'>
                  <div className='text-xs text-muted-foreground'>
                    Ortalama Indirim
                  </div>
                  <div className='text-sm font-semibold'>
                    %
                    {(
                      promotionDetail?.summary.averageDiscount ?? 0
                    ).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>

              <div className='rounded-lg border overflow-hidden min-h-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Urun Kodu</TableHead>
                        <TableHead>Urun Adi</TableHead>
                        <TableHead>Marka</TableHead>
                        <TableHead>
                          <HeaderWithTooltip
                            title='Onceki Fiyat'
                            description='Oncelik: promosyon baslangicindan bir gun onceki non-promosyon fiyat ortalamasi. Yoksa son 7 gundeki en son non-promosyon gun fiyatina, o da yoksa son 7 gun medianina fallback eder.'
                          />
                        </TableHead>
                        <TableHead>
                          <HeaderWithTooltip
                            title='Promosyon Fiyati'
                            description='Promosyon aktif gunlerindeki gunluk ortalama fiyatlarin medyani.'
                          />
                        </TableHead>
                        <TableHead>
                          <HeaderWithTooltip
                            title='Fiyat Degisimi'
                            description='(Promosyon Fiyati - Onceki Fiyat) / Onceki Fiyat * 100 formulu ile hesaplanir.'
                          />
                        </TableHead>
                        <TableHead>
                          <HeaderWithTooltip
                            title='Indirim yüzdesi'
                            description='Promosyon gunlerindeki indirim yuzdelerinin ortalamasi.'
                          />
                        </TableHead>
                        <TableHead>
                          <HeaderWithTooltip
                            title='Magaza Sayisi'
                            description='Bu urunun secilen promosyonda gorundugu farkli magaza adedi.'
                          />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(promotionDetail?.items ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className='text-center text-sm text-muted-foreground'
                          >
                            Bu promosyon icin urun detayi bulunamadi.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (promotionDetail?.items ?? []).map((item) => (
                          <TableRow key={item.productCode}>
                            <TableCell className='font-mono text-xs'>
                              {item.productCode}
                            </TableCell>
                            <TableCell className='font-medium'>
                              {item.productName}
                            </TableCell>
                            <TableCell>{item.brand}</TableCell>
                            <TableCell>
                              {formatCurrency(item.beforePrice)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.afterPrice)}
                            </TableCell>
                            <TableCell>
                              {item.priceChangePct === null
                                ? '-'
                                : `${item.priceChangePct > 0 ? '+' : ''}${item.priceChangePct.toLocaleString('tr-TR')}%`}
                            </TableCell>
                            <TableCell>
                              %{item.averageDiscount.toLocaleString('tr-TR')}
                            </TableCell>
                            <TableCell>
                              {item.storeCount.toLocaleString('tr-TR')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
