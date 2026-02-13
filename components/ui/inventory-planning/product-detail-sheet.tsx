'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import { InventoryItem } from '@/types/inventory';
import type { InventoryAlert } from '@/types/inventory';
import { Badge } from '@/components/ui/shared/badge';
import { Separator } from '@/components/ui/shared/separator';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { generateSingleProductStockTrends } from '@/data/mock-data';
import { cn } from '@/lib/utils';
import { CheckCircle2, Tag, Lightbulb, Search, Loader2 } from 'lucide-react';
import { useMarketProductSearch, useProductStoreComparison } from '@/services';

// Form Components
import {
  PurchaseOrderForm,
  PurchaseOrderData,
} from './forms/purchase-order-form';
import { TransferForm, TransferData } from './forms/transfer-form';
import { SafetyStockForm, SafetyStockData } from './forms/safety-stock-form';

// Actions Service
import {
  savePurchaseOrder,
  saveTransfer,
  saveSafetyStockChange,
} from '@/lib/actions-service';

function parseStoreCodeFromStoreName(storeName?: string): string | null {
  if (!storeName) {
    return null;
  }
  const match = /-\s*(\d+)\s*$/.exec(storeName);
  return match?.[1] ?? null;
}

function parseStoreCodeFromProductKey(productKey?: string): string | null {
  if (!productKey) {
    return null;
  }
  const match = /^(\d+)_/.exec(productKey);
  return match?.[1] ?? null;
}

// Generate AI recommendation based on product status
function getRecommendation(
  item: InventoryItem,
  periodDays: number,
): string | null {
  if (item.status === 'Out of Stock') {
    return `Bu urun stokta kalmadi. Acil siparis vererek ${item.forecastedDemand} adetlik ${periodDays} gunluk talebi karsilayabilirsiniz.`;
  }
  if (item.status === 'Low Stock') {
    const dailyDemand = periodDays > 0 ? item.forecastedDemand / periodDays : 0;
    const daysLeft =
      dailyDemand > 0 ? Math.floor(item.stockLevel / dailyDemand) : 0;
    return `Stok seviyesi kritik. Tahmini ${daysLeft} gun icinde stok tukenebilir.`;
  }
  if (item.status === 'Overstock') {
    const excessStock = item.stockLevel - item.forecastedDemand;
    return `Bu urunde ${excessStock.toLocaleString('tr-TR')} adet fazla stok var. Transfer veya promosyon degerlendirin.`;
  }
  if (item.daysOfCoverage > 60) {
    return `Stok seviyesi iyi durumda. Talep degisikliklerini takip etmeye devam edin.`;
  }
  return null;
}

interface ProductDetailSheetProps {
  item: InventoryItem | null;
  alert?: InventoryAlert | null;
  storeOptions?: { value: string; label: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period?: number;
}

type ActiveForm = 'none' | 'purchase' | 'transfer' | 'safety';
type ActiveTab = 'overview' | 'comparison';

export function ProductDetailSheet({
  item,
  alert,
  storeOptions = [],
  open,
  onOpenChange,
  period = 30,
}: ProductDetailSheetProps) {
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<ActiveForm>('none');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [comparisonStoreId, setComparisonStoreId] = useState<string>('');
  const [comparisonQuery, setComparisonQuery] = useState<string>('');
  const [searchParams, setSearchParams] = useState<{
    query: string;
    storeId: string;
  }>({ query: '', storeId: '' });
  const prevOpenRef = useRef(false);
  const lastInitItemIdRef = useRef('');

  const trendData = useMemo(() => {
    if (!item) {
      return [];
    }
    return generateSingleProductStockTrends(item, 15);
  }, [item]);

  const marketSearchEnabled =
    open &&
    activeForm === 'none' &&
    activeTab === 'comparison' &&
    searchParams.storeId.length > 0 &&
    searchParams.query.trim().length > 0;

  const marketSearch = useMarketProductSearch(
    {
      query: searchParams.query,
      storeId: searchParams.storeId,
      page: 0,
      size: 24,
      distance: 10,
    },
    { enabled: marketSearchEnabled },
  );

  const productSku = item?.sku ?? '';
  const ownStoreComparison = useProductStoreComparison(
    {
      productId: productSku,
      storeIds: comparisonStoreId ? [comparisonStoreId] : [],
    },
    {
      enabled:
        open &&
        activeForm === 'none' &&
        activeTab === 'comparison' &&
        comparisonStoreId.length > 0 &&
        productSku.length > 0,
    },
  );

  const selectedStoreOwnRow = useMemo(() => {
    const rows = ownStoreComparison.data?.items ?? [];
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  }, [ownStoreComparison.data?.items]);

  const alertStoreName = alert?.storeName ?? '';
  const itemId = item?.id ?? '';
  const itemName = item?.productName ?? '';
  const itemProductKey = item?.productKey ?? '';
  const hasItem = item !== null;
  const firstStoreOptionValue = storeOptions[0]?.value ?? '';

  const comparisonRows = useMemo(() => {
    const data = marketSearch.data;
    if (!data) {
      return [];
    }
    return data.results.flatMap((product) => {
      const category =
        (
          product.category_details.main ??
          product.category_details.menu ??
          product.category_details.full_path?.[0]
        ) || '-';
      return product.offers.map((offer) => ({
        market: offer.market || '-',
        fiyat: Number(offer.price ?? 0),
        unitPrice: offer.unit_price || '-',
        isDiscount: Boolean(offer.is_discount),
        productTitle: offer.product_title || product.title || itemName || '-',
        indexTime: offer.index_time || '-',
        image: product.image || '',
        kategori: category || '-',
        brand: product.brand || '-',
      }));
    });
  }, [itemName, marketSearch.data]);

  const comparisonStats = useMemo(() => {
    if (comparisonRows.length === 0) {
      return {
        uniqueMarkets: 0,
        discountCount: 0,
        minPrice: 0,
        maxPrice: 0,
      };
    }
    const uniqueMarkets = new Set(comparisonRows.map((r) => r.market)).size;
    const discountCount = comparisonRows.filter((r) => r.isDiscount).length;
    const prices = comparisonRows.map((r) => r.fiyat);
    return {
      uniqueMarkets,
      discountCount,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  }, [comparisonRows]);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!open || !hasItem) {
      return;
    }

    const isFirstOpenForThisItem =
      !wasOpen || lastInitItemIdRef.current !== itemId;
    if (!isFirstOpenForThisItem) {
      return;
    }

    const defaultStoreFromAlert = parseStoreCodeFromStoreName(alertStoreName);
    const defaultStoreFromProduct = parseStoreCodeFromProductKey(itemProductKey);
    const defaultStore =
      defaultStoreFromAlert ||
      defaultStoreFromProduct ||
      firstStoreOptionValue;

    setComparisonStoreId(defaultStore || '');
    setComparisonQuery(itemName);
    setSearchParams({
      query: itemName,
      storeId: defaultStore || '',
    });
    setActiveTab('overview');
    lastInitItemIdRef.current = itemId;
  }, [open, hasItem, alertStoreName, itemId, itemName, itemProductKey, firstStoreOptionValue]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setActiveForm('none');
      setSuccessMessage(null);
      setActiveTab('overview');
      prevOpenRef.current = false;
    }
    onOpenChange(newOpen);
  };

  const handlePurchaseOrderSave = (data: PurchaseOrderData) => {
    savePurchaseOrder(data);
    setSuccessMessage('Satinalma talebi basariyla olusturuldu');
    setActiveForm('none');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleTransferSave = (data: TransferData) => {
    saveTransfer(data);
    setSuccessMessage('Transfer talebi basariyla olusturuldu');
    setActiveForm('none');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleSafetyStockSave = (data: SafetyStockData) => {
    saveSafetyStockChange(data);
    setSuccessMessage('Guvenlik stogu basariyla guncellendi');
    setActiveForm('none');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handlePromotionClick = () => {
    onOpenChange(false);
    router.push('/dashboard?section=promotions');
  };

  const runComparisonSearch = () => {
    if (!comparisonStoreId) {
      return;
    }
    const q = comparisonQuery.trim();
    if (!q) {
      return;
    }
    setSearchParams({
      query: q,
      storeId: comparisonStoreId,
    });
  };

  if (!item) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh] overflow-y-auto pt-8',
          activeTab === 'comparison'
            ? 'w-[96vw] max-w-[96vw] 2xl:max-w-[1800px]'
            : 'max-w-4xl',
        )}
      >
        {successMessage && (
          <div className='absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg border border-green-200 shadow-lg animate-in fade-in slide-in-from-top-2'>
            <CheckCircle2 className='h-4 w-4' />
            <span className='text-sm font-medium'>{successMessage}</span>
          </div>
        )}

        {activeForm === 'purchase' && (
          <PurchaseOrderForm
            item={item}
            onBack={() => {
              setActiveForm('none');
            }}
            onSave={handlePurchaseOrderSave}
          />
        )}

        {activeForm === 'transfer' && (
          <TransferForm
            item={item}
            onBack={() => {
              setActiveForm('none');
            }}
            onSave={handleTransferSave}
          />
        )}

        {activeForm === 'safety' && (
          <SafetyStockForm
            item={item}
            onBack={() => {
              setActiveForm('none');
            }}
            onSave={handleSafetyStockSave}
          />
        )}

        {activeForm === 'none' && (
          <>
            <DialogHeader className='mb-6'>
              <div className='flex items-center justify-between mb-3'>
                <Badge variant='outline' className='text-sm'>
                  {item.category}
                </Badge>
                <Badge
                  variant={
                    item.status === 'Out of Stock'
                      ? 'destructive'
                      : item.status === 'Low Stock'
                        ? 'default'
                        : 'secondary'
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
              <DialogTitle className='text-2xl'>{item.productName}</DialogTitle>
              <DialogDescription className='text-base'>
                {item.sku}
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as ActiveTab);
              }}
              className='space-y-4'
            >
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='overview'>Genel Bilgi</TabsTrigger>
                <TabsTrigger value='comparison'>Karsilastirma</TabsTrigger>
              </TabsList>

              <TabsContent value='overview' className='space-y-6'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='p-4 bg-muted/30 rounded-lg border border-border'>
                    <p className='text-xs text-muted-foreground font-medium mb-1.5'>
                      Mevcut Stok
                    </p>
                    <p className='text-2xl font-bold text-foreground'>
                      {item.stockLevel.toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div className='p-4 bg-muted/30 rounded-lg border border-border'>
                    <p className='text-xs text-muted-foreground font-medium mb-1.5'>
                      Tahmini Talep ({period} Gun)
                    </p>
                    <p className='text-2xl font-bold text-foreground'>
                      {item.forecastedDemand.toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div className='p-4 bg-muted/30 rounded-lg border border-border'>
                    <p className='text-xs text-muted-foreground font-medium mb-1.5'>
                      Kapsama Gunu
                    </p>
                    <p className='text-2xl font-bold text-foreground'>
                      {item.daysOfCoverage}
                    </p>
                  </div>
                  <div className='p-4 bg-muted/30 rounded-lg border border-border'>
                    <p className='text-xs text-muted-foreground font-medium mb-1.5'>
                      Yeniden Siparis Noktasi
                    </p>
                    <p className='text-2xl font-bold text-foreground'>
                      {item.reorderPoint}
                    </p>
                  </div>
                </div>

                {(alert?.recommendation || getRecommendation(item, period)) && (
                  <div className='relative overflow-hidden rounded-lg bg-indigo-50/50 border border-indigo-100 p-3'>
                    <div className='flex items-start gap-3'>
                      <div className='mt-0.5 p-1.5 bg-indigo-100 rounded-full shrink-0'>
                        <Lightbulb className='h-3.5 w-3.5 text-indigo-600' />
                      </div>
                      <div className='flex-1 space-y-1'>
                        <p className='text-[11px] font-bold text-indigo-700 uppercase tracking-wide'>
                          Yapay Zeka Onerisi
                        </p>
                        <p className='text-xs text-indigo-900 leading-relaxed'>
                          {alert?.recommendation || getRecommendation(item, period)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {alert?.metrics?.transferSourceStore &&
                  (alert.metrics.transferQuantity ?? 0) > 0 && (
                    <div className='relative overflow-hidden rounded-lg bg-emerald-50/50 border border-emerald-100 p-3'>
                      <div className='flex items-start gap-3'>
                        <div className='mt-0.5 p-1.5 bg-emerald-100 rounded-full shrink-0'>
                          <Lightbulb className='h-3.5 w-3.5 text-emerald-600' />
                        </div>
                        <div className='flex-1 space-y-1'>
                          <p className='text-[11px] font-bold text-emerald-700 uppercase tracking-wide'>
                            Transfer Onerisi
                          </p>
                          <p className='text-xs text-emerald-900 leading-relaxed'>
                            {alert.metrics.transferSourceStore} kaynagindan{' '}
                            {alert.metrics.transferQuantity} adet urun transferi
                            onceliklidir.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                <Separator />

                <div>
                  <h3 className='text-sm font-semibold mb-4'>15 Gunluk Stok Hareketi</h3>
                  <div className='h-48 w-full bg-muted/30 rounded-lg p-4'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart
                        data={trendData}
                        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray='3 3'
                          stroke='#e5e7eb'
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey='date'
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          stroke='#9ca3af'
                        />
                        <YAxis
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          stroke='#9ca3af'
                          width={40}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            `${value.toLocaleString('tr-TR')} adet`,
                            'Stok Seviyesi',
                          ]}
                        />
                        <Line
                          type='monotone'
                          dataKey='actualStock'
                          stroke='#2563eb'
                          strokeWidth={2}
                          dot={false}
                          name='Stok'
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <Separator />

                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold'>Aksiyonlar</h3>
                  <div className='flex flex-col gap-2'>
                    <Button
                      className='w-full'
                      size='lg'
                      onClick={() => {
                        setActiveForm('purchase');
                      }}
                    >
                      Satinalma Talebi Olustur
                    </Button>
                    <Button
                      variant='outline'
                      className='w-full'
                      size='lg'
                      onClick={() => {
                        setActiveForm('transfer');
                      }}
                    >
                      Magazalar Arasi Transfer
                    </Button>
                    <Button
                      variant='outline'
                      className='w-full'
                      size='lg'
                      onClick={() => {
                        setActiveForm('safety');
                      }}
                    >
                      Guvenlik Stogunu Duzenle ({item.minStockLevel})
                    </Button>
                    <Button
                      variant='secondary'
                      className='w-full'
                      size='lg'
                      onClick={handlePromotionClick}
                    >
                      <Tag className='mr-2 h-4 w-4' />
                      Promosyon Yap
                    </Button>
                  </div>
                </div>

                <div className='pt-2 text-xs text-muted-foreground text-center border-t'>
                  Son guncelleme: {item.lastRestockDate ?? 'Bilinmiyor'}
                </div>
              </TabsContent>

              <TabsContent value='comparison' className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                  <div>
                    <p className='text-sm font-medium text-muted-foreground mb-1.5'>Magaza</p>
                    <Select
                      value={comparisonStoreId}
                      onValueChange={setComparisonStoreId}
                    >
                      <SelectTrigger className='h-11 text-base'>
                        <SelectValue placeholder='Magaza secin' />
                      </SelectTrigger>
                      <SelectContent>
                        {storeOptions.map((store) => (
                          <SelectItem key={store.value} value={store.value}>
                            {store.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='md:col-span-2'>
                    <p className='text-sm font-medium text-muted-foreground mb-1.5'>Urun Arama</p>
                    <div className='flex gap-2'>
                      <Input
                        className='h-11 text-base'
                        value={comparisonQuery}
                        onChange={(e) => {
                          setComparisonQuery(e.target.value);
                        }}
                        placeholder='Urun adi girin'
                      />
                      <Button className='h-11 px-4' onClick={runComparisonSearch}>
                        {marketSearch.isFetching ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Search className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {marketSearch.data?.analysis && (
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                    {selectedStoreOwnRow && (
                      <div className='p-3 rounded-lg border bg-blue-50/70 border-blue-100 md:col-span-4'>
                        <p className='text-base text-blue-700 uppercase tracking-wide font-semibold'>
                          Secili Magaza Verisi ({selectedStoreOwnRow.storeName})
                        </p>
                        <div className='mt-3 grid grid-cols-2 md:grid-cols-5 gap-3'>
                          <div>
                            <p className='text-blue-700/80 text-sm uppercase'>Birim Fiyat</p>
                            <p className='font-semibold text-blue-900 text-lg'>
                              {selectedStoreOwnRow.price.toLocaleString('tr-TR')} TL
                            </p>
                          </div>
                          <div>
                            <p className='text-blue-700/80 text-sm uppercase'>Mevcut Stok</p>
                            <p className='font-semibold text-blue-900 text-lg'>
                              {selectedStoreOwnRow.stockLevel.toLocaleString('tr-TR')}
                            </p>
                          </div>
                          <div>
                            <p className='text-blue-700/80 text-sm uppercase'>Tahmini Talep</p>
                            <p className='font-semibold text-blue-900 text-lg'>
                              {selectedStoreOwnRow.forecastedDemand.toLocaleString('tr-TR')}
                            </p>
                          </div>
                          <div>
                            <p className='text-blue-700/80 text-sm uppercase'>Kapsama Gunu</p>
                            <p className='font-semibold text-blue-900 text-lg'>
                              {selectedStoreOwnRow.daysOfCoverage.toLocaleString('tr-TR')}
                            </p>
                          </div>
                          <div>
                            <p className='text-blue-700/80 text-sm uppercase'>Durum</p>
                            <p className='font-semibold text-blue-900 text-lg'>
                              {selectedStoreOwnRow.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className='p-3 rounded-lg border bg-slate-50'>
                      <p className='text-sm text-slate-500 uppercase tracking-wide'>Toplam Sonuc</p>
                      <p className='mt-1 text-2xl font-bold text-slate-900'>
                        {marketSearch.data.total_found.toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div className='p-3 rounded-lg border bg-emerald-50/70 border-emerald-100'>
                      <p className='text-sm text-emerald-700 uppercase tracking-wide'>Market Sayisi</p>
                      <p className='mt-1 text-2xl font-bold text-emerald-900'>
                        {comparisonStats.uniqueMarkets}
                      </p>
                    </div>
                    <div className='p-3 rounded-lg border bg-indigo-50/70 border-indigo-100'>
                      <p className='text-sm text-indigo-700 uppercase tracking-wide'>Ortalama Fiyat</p>
                      <p className='mt-1 text-2xl font-bold text-indigo-900'>
                        {marketSearch.data.analysis.average_price.toLocaleString('tr-TR')} TL
                      </p>
                    </div>
                    <div className='p-3 rounded-lg border bg-amber-50/70 border-amber-100'>
                      <p className='text-sm text-amber-700 uppercase tracking-wide'>Indirimli Teklif</p>
                      <p className='mt-1 text-2xl font-bold text-amber-900'>
                        {comparisonStats.discountCount}
                      </p>
                    </div>
                    <div className='p-3 rounded-lg border bg-white md:col-span-2'>
                      <p className='text-sm text-slate-500 uppercase tracking-wide'>En Dusuk / En Yuksek</p>
                      <p className='mt-1 text-lg font-semibold text-slate-900'>
                        {comparisonStats.minPrice.toLocaleString('tr-TR')} TL /{' '}
                        {comparisonStats.maxPrice.toLocaleString('tr-TR')} TL
                      </p>
                    </div>
                    <div className='p-3 rounded-lg border bg-white md:col-span-2'>
                      <p className='text-sm text-slate-500 uppercase tracking-wide'>Fiyat Farki</p>
                      <p className='mt-1 text-lg font-semibold text-slate-900'>
                        {marketSearch.data.analysis.price_range.toLocaleString('tr-TR')} TL (
                        {marketSearch.data.analysis.price_difference_percentage})
                      </p>
                    </div>
                  </div>
                )}

                {marketSearch.error && (
                  <div className='p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm'>
                    Karsilastirma verisi alinamadi. Magaza secimi ve sorgu metnini kontrol edin.
                  </div>
                )}

                <div className='space-y-2'>
                  {marketSearch.isLoading || marketSearch.isFetching ? (
                    <div className='p-4 text-sm text-muted-foreground'>Veriler getiriliyor...</div>
                  ) : comparisonRows.length === 0 ? (
                    <div className='p-4 text-sm text-muted-foreground'>
                      Sonuc bulunamadi. Magaza secip urun adiyla arama yapin.
                    </div>
                  ) : (
                    <div className='rounded-lg border bg-white overflow-hidden'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='text-base font-semibold'>Market</TableHead>
                            <TableHead className='text-base font-semibold'>Fiyat</TableHead>
                            <TableHead className='text-base font-semibold'>Birim Fiyat</TableHead>
                            <TableHead className='text-base font-semibold'>Indirim</TableHead>
                            <TableHead className='text-base font-semibold'>Urun Adi</TableHead>
                            <TableHead className='text-base font-semibold'>Indeks Zamani</TableHead>
                            <TableHead className='text-base font-semibold'>Kategori</TableHead>
                            <TableHead className='text-base font-semibold'>Brand</TableHead>
                            <TableHead className='text-base font-semibold'>Gorsel</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparisonRows.map((row, idx) => (
                            <TableRow key={`${row.market}-${row.productTitle}-${String(idx)}`}>
                              <TableCell className='font-medium text-base'>{row.market}</TableCell>
                              <TableCell className='font-semibold text-slate-900 text-base'>
                                {row.fiyat.toLocaleString('tr-TR')} TL
                              </TableCell>
                              <TableCell className='text-base'>{row.unitPrice}</TableCell>
                              <TableCell>
                                <Badge
                                  variant='outline'
                                  className={cn(
                                    'text-sm',
                                    row.isDiscount
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-50 text-slate-600 border-slate-200',
                                  )}
                                >
                                  {row.isDiscount ? 'Evet' : 'Hayir'}
                                </Badge>
                              </TableCell>
                              <TableCell className='max-w-64 truncate text-base' title={row.productTitle}>
                                {row.productTitle}
                              </TableCell>
                              <TableCell className='text-base'>{row.indexTime}</TableCell>
                              <TableCell className='max-w-36 truncate text-base' title={row.kategori}>
                                {row.kategori}
                              </TableCell>
                              <TableCell className='text-base'>{row.brand}</TableCell>
                              <TableCell>
                                {row.image ? (
                                  <img
                                    src={row.image}
                                    alt={row.productTitle}
                                    className='h-12 w-12 object-cover rounded border'
                                  />
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {comparisonStoreId &&
                  (ownStoreComparison.isLoading || ownStoreComparison.isFetching) && (
                    <div className='p-4 text-sm text-muted-foreground'>
                      Secili magazanin urun verisi getiriliyor...
                    </div>
                  )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
