'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { ScrollArea } from '@/components/ui/shared/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import {
  AlertTriangle,
  TrendingUp,
  PackageMinus,
  RefreshCw,
  Lightbulb,
  Box,
  Zap,
  ArrowRightLeft,
} from 'lucide-react';
import { InventoryAlert } from '@/types/inventory';
import { cn } from '@/lib/utils';
import { maxSafeTransferForSender, toDailyDemand } from './transfer-safety';

export interface TransferAdviceClickPayload {
  sku: string;
  fromStore: string;
  toStore: string;
  transferQty: number;
}

interface PlanningAlertsProps {
  data: InventoryAlert[];
  onActionClick?: (alert: InventoryAlert) => void;
  onTransferAdviceClick?: (payload: TransferAdviceClickPayload) => void;
  period?: number;
  marketOptions?: { value: string; label: string }[];
  selectedMarket?: string;
  onMarketChange?: (value: string) => void;
  allData?: InventoryAlert[];
}

export function PlanningAlerts({
  data,
  onActionClick,
  onTransferAdviceClick,
  period = 30,
  marketOptions = [],
  selectedMarket = 'all',
  onMarketChange,
  allData,
}: PlanningAlertsProps) {
  const lookupData = allData && allData.length > 0 ? allData : data;

  const transferAdviceCards = useMemo(() => {
    const rows = data
      .filter(
        (alert) =>
          alert.actionType === 'transfer' &&
          typeof alert.metrics?.transferSourceStore === 'string' &&
          (alert.metrics?.transferSourceStore || '').trim().length > 0,
      )
      .map((targetAlert) => {
        const sourceStoreName = targetAlert.metrics?.transferSourceStore || '';
        const receiverStock = Number(targetAlert.metrics?.currentStock || 0);
        const receiverForecastPeriod = Number(
          targetAlert.metrics?.forecastedDemand || 0,
        );
        const receiverDailyDemand = toDailyDemand(receiverForecastPeriod, period);
        const receiverNeedFor20Days = Math.max(
          0,
          Math.ceil(receiverDailyDemand * 20 - receiverStock),
        );

        const sourceAlert = lookupData.find(
          (row) =>
            row.sku === targetAlert.sku && row.storeName === sourceStoreName,
        );
        const sourceStock = Number(sourceAlert?.metrics?.currentStock || 0);
        const sourceForecastPeriod = Number(
          sourceAlert?.metrics?.forecastedDemand || 0,
        );
        const sourceDailyDemand = toDailyDemand(sourceForecastPeriod, period);
        const sourceMaxTransfer = maxSafeTransferForSender(
          sourceStock,
          sourceForecastPeriod,
          period,
        );

        const transferQty = Math.max(
          0,
          Math.floor(
            Math.min(
              receiverNeedFor20Days,
              sourceMaxTransfer,
            ),
          ),
        );

        const receiverDaysBefore =
          receiverDailyDemand > 0
            ? Math.floor(receiverStock / receiverDailyDemand)
            : 0;
        const receiverDaysAfter =
          receiverDailyDemand > 0
            ? Math.floor((receiverStock + transferQty) / receiverDailyDemand)
            : 20;
        const senderHasValidDemand =
          Number.isFinite(sourceDailyDemand) && sourceDailyDemand > 0;
        const senderDaysAfter = senderHasValidDemand
          ? Math.floor((sourceStock - transferQty) / sourceDailyDemand)
          : 0;

        return {
          id: `transfer-${targetAlert.id}`,
          sku: targetAlert.sku,
          productName: targetAlert.productName,
          fromStore: sourceStoreName,
          toStore: targetAlert.storeName || 'Bilinmeyen mağaza',
          transferQty,
          sourceStock,
          receiverNeedFor20Days,
          receiverDaysBefore,
          receiverDaysAfter,
          senderDaysAfter,
        };
      })
      .filter((row) => row.transferQty > 0 && row.senderDaysAfter >= 30);

    const dedup = new Map<string, (typeof rows)[number]>();
    rows.forEach((row) => {
      const key = `${row.sku}-${row.fromStore}-${row.toStore}`;
      if (!dedup.has(key) || row.transferQty > (dedup.get(key)?.transferQty || 0)) {
        dedup.set(key, row);
      }
    });
    return Array.from(dedup.values()).sort((a, b) => b.transferQty - a.transferQty);
  }, [data, lookupData, period]);

  return (
    <Card className='h-full flex flex-col shadow-sm'>
      <CardHeader className='pb-3 border-b'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5 text-orange-600' />
            <div>
              <CardTitle className='text-lg'>Uyarı ve Transfer Merkezi</CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Yapay zeka destekli envanter uyarıları ve mağazalar arası transfer önerileri
              </CardDescription>
            </div>
          </div>
          <Badge variant='outline' className='ml-auto'>
            {data.length} Aktif Uyari
          </Badge>
        </div>
        {onMarketChange && marketOptions.length > 0 && (
          <div className='pt-2'>
            <Select value={selectedMarket} onValueChange={onMarketChange}>
              <SelectTrigger className='w-full md:w-64'>
                <SelectValue placeholder='Market Sec' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tum Marketler</SelectItem>
                {marketOptions.map((market) => (
                  <SelectItem key={market.value} value={market.value}>
                    {market.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent className='flex-1 p-0 min-h-0 bg-slate-50/50'>
        <Tabs defaultValue='inventory-alerts' className='h-full flex flex-col'>
          <div className='px-4 pt-4'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='inventory-alerts'>Envanter Uyarıları</TabsTrigger>
              <TabsTrigger value='transfer-advices'>Transfer Önerileri</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='inventory-alerts' className='mt-0 flex-1'>
            <ScrollArea className='flex-1 h-129'>
              <div className='p-4 space-y-4'>
                {data.length > 0 ? (
                  data.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onActionClick={onActionClick}
                      period={period}
                    />
                  ))
                ) : (
                  <div className='flex flex-col items-center justify-center py-16 text-center text-muted-foreground'>
                    <Box className='h-12 w-12 mb-3 text-slate-300' />
                    <p className='text-sm font-medium'>Her şey yolunda</p>
                    <p className='text-xs'>
                      Şu an için kritik bir envanter uyarısı bulunmuyor.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value='transfer-advices' className='mt-0 flex-1'>
            <ScrollArea className='flex-1 h-129'>
              <div className='p-4 space-y-3'>
                {transferAdviceCards.length > 0 ? (
                  transferAdviceCards.map((advice) => (
                    <div
                      key={advice.id}
                      className='rounded-xl border bg-white shadow-sm p-4 space-y-3 cursor-pointer hover:border-emerald-300 transition-colors'
                      onClick={() =>
                        onTransferAdviceClick?.({
                          sku: advice.sku,
                          fromStore: advice.fromStore,
                          toStore: advice.toStore,
                          transferQty: advice.transferQty,
                        })
                      }
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold text-slate-900'>
                            {advice.productName}
                          </p>
                          <p className='text-xs text-slate-500 font-mono'>
                            {advice.sku}
                          </p>
                        </div>
                        <Badge
                          className='bg-emerald-100 text-emerald-800 border-0'
                          variant='outline'
                        >
                          {advice.transferQty.toLocaleString('tr-TR')} adet transfer
                        </Badge>
                      </div>

                      <div className='flex items-center gap-2 text-sm text-slate-800'>
                        <ArrowRightLeft className='h-3.5 w-3.5 text-emerald-600' />
                        <span className='font-semibold'>{advice.fromStore}</span>
                        <span className='text-slate-400'>→</span>
                        <span className='font-semibold'>{advice.toStore}</span>
                      </div>

                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                        <div className='rounded-lg border bg-slate-50 p-2'>
                          <p className='text-[10px] uppercase text-slate-500 font-semibold'>
                            Gönderen Sonrası
                          </p>
                          <p className='text-sm font-semibold text-slate-900'>
                            {advice.senderDaysAfter} gün
                          </p>
                          <p className='text-[11px] text-slate-500'>
                            Transfer sonrası tahmini stok kapsaması
                          </p>
                        </div>
                        <div className='rounded-lg border bg-slate-50 p-2'>
                          <p className='text-[10px] uppercase text-slate-500 font-semibold'>
                            Alan Mağaza Önce / Sonra
                          </p>
                          <p className='text-sm font-semibold text-slate-900'>
                            {advice.receiverDaysBefore} / {advice.receiverDaysAfter} gün
                          </p>
                          <p className='text-[11px] text-slate-500'>
                            20 gün hedef kapsama
                          </p>
                        </div>
                        <div className='rounded-lg border bg-slate-50 p-2'>
                          <p className='text-[10px] uppercase text-slate-500 font-semibold'>
                            20 Gün İhtiyaç
                          </p>
                          <p className='text-sm font-semibold text-slate-900'>
                            {advice.receiverNeedFor20Days.toLocaleString('tr-TR')} adet
                          </p>
                          <p className='text-[11px] text-slate-500'>
                            Transfer: {advice.transferQty.toLocaleString('tr-TR')} adet
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='flex flex-col items-center justify-center py-16 text-center text-muted-foreground'>
                    <Box className='h-12 w-12 mb-3 text-slate-300' />
                    <p className='text-sm font-medium'>Transfer önerisi bulunmuyor</p>
                    <p className='text-xs'>
                      Mevcut filtrelerde mağazalar arası uygun transfer senaryosu yok.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface AlertItemProps {
  alert: InventoryAlert;
  onActionClick?: (alert: InventoryAlert) => void;
  period?: number;
}

function AlertItem({ alert, onActionClick, period = 30 }: AlertItemProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'stockout':
        return <PackageMinus className='h-4 w-4 text-red-600' />;
      case 'reorder':
        return <RefreshCw className='h-4 w-4 text-orange-600' />;
      case 'surge':
        return <TrendingUp className='h-4 w-4 text-purple-600' />;
      case 'overstock':
        return <Box className='h-4 w-4 text-blue-600' />;
      default:
        return <AlertTriangle className='h-4 w-4 text-slate-600' />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'stockout':
        return 'Stok Tukendi';
      case 'reorder':
        return 'Kritik Seviye';
      case 'surge':
        return 'Talep Artisi';
      case 'overstock':
        return 'Fazla Stok';
      case 'deadstock':
        return 'Durgun Stok';
      default:
        return type.toUpperCase();
    }
  };

  const handleActionClick = () => {
    if (onActionClick) {
      onActionClick(alert);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200',
        'shadow-sm hover:shadow-md bg-white',
      )}
    >
      <div className='flex items-start justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <Badge
              variant='outline'
              className={cn(
                'px-2 py-0.5 text-[10px] font-semibold border-0 flex items-center gap-1.5',
                alert.severity === 'high'
                  ? 'bg-red-100 text-red-700'
                  : alert.severity === 'medium'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-100 text-blue-700',
              )}
            >
              {getIcon(alert.type)}
              {getLabel(alert.type)}
            </Badge>
            <span className='text-xs text-muted-foreground'>{alert.date}</span>
          </div>
          <h4 className='font-semibold text-sm text-slate-900 mt-1'>
            {alert.productName}
          </h4>
          <span className='text-xs text-slate-500 font-mono'>
            {alert.sku} • {alert.storeName || 'Tum Magazalar'}
          </span>
        </div>
      </div>

      <p className='text-xs text-slate-600 leading-relaxed'>{alert.message}</p>

      {alert.metrics && (
        <div className='grid grid-cols-3 gap-2 py-2 border-y border-dashed border-slate-100 my-1'>
          <div className='flex flex-col items-center justify-center p-2 rounded bg-slate-50'>
            <span className='text-[10px] text-slate-400 uppercase font-semibold'>
              Mevcut
            </span>
            <span
              className={cn(
                'text-sm font-bold',
                alert.metrics.currentStock === 0
                  ? 'text-red-600'
                  : 'text-slate-700',
              )}
            >
              {alert.metrics.currentStock}
            </span>
          </div>
          {alert.metrics.threshold !== undefined && (
            <div className='flex flex-col items-center justify-center p-2 rounded bg-slate-50'>
              <span className='text-[10px] text-slate-400 uppercase font-semibold'>
                Hedef/Min
              </span>
              <span className='text-sm font-bold text-slate-700'>
                {alert.metrics.threshold}
              </span>
            </div>
          )}
          {alert.metrics.forecastedDemand !== undefined && (
            <div className='flex flex-col items-center justify-center p-2 rounded bg-slate-50'>
              <span className='text-[10px] text-slate-400 uppercase font-semibold'>
                Tahmin ({period}G)
              </span>
              <span className='text-sm font-bold text-blue-600'>
                {alert.metrics.forecastedDemand}
              </span>
            </div>
          )}
        </div>
      )}

      {alert.proximityOptions && alert.proximityOptions.length > 0 && (
        <div className='relative overflow-hidden rounded-lg bg-emerald-50/50 border border-emerald-100 p-3'>
          <div className='flex items-start gap-3'>
            <div className='mt-0.5 p-1.5 bg-emerald-100 rounded-full'>
              <Lightbulb className='h-3.5 w-3.5 text-emerald-600' />
            </div>
            <div className='flex-1 space-y-1'>
              <p className='text-[11px] font-bold text-emerald-700 uppercase tracking-wide'>
                En Yakin Stok Kaynaklari
              </p>
              <div className='space-y-1'>
                {alert.proximityOptions.slice(0, 3).map((option, index) => (
                  <div
                    key={`${alert.id}-${option.storeName}-${String(index)}`}
                    className='flex items-center gap-2 text-xs text-emerald-900'
                  >
                    <span className='font-medium'>
                      {option.storeName || 'Bilinmeyen Magaza'}
                    </span>
                    <span className='text-muted-foreground'>•</span>
                    <span className='text-emerald-700 font-semibold'>
                      {option.distanceDisplay || '-'}
                    </span>
                    {option.availableStock > 0 && (
                      <span className='font-semibold text-emerald-700'>
                        ({option.availableStock} adet)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {alert.noTransferOptions && (
        <div className='relative overflow-hidden rounded-lg bg-amber-50/50 border border-amber-100 p-3'>
          <div className='flex items-start gap-3'>
            <div className='mt-0.5 p-1.5 bg-amber-100 rounded-full'>
              <AlertTriangle className='h-3.5 w-3.5 text-amber-600' />
            </div>
            <div className='flex-1 space-y-1'>
              <p className='text-[11px] font-bold text-amber-700 uppercase tracking-wide'>
                Stok Transferi Yok
              </p>
              <p className='text-xs text-amber-900 leading-relaxed'>
                Tum magazalarda stok yetersiz. Tedarikci ile iletisime gecin.
              </p>
            </div>
          </div>
        </div>
      )}

      {alert.recommendation && !alert.proximityOptions && (
        <div className='relative overflow-hidden rounded-lg bg-indigo-50/50 border border-indigo-100 p-3'>
          <div className='flex items-start gap-3'>
            <div className='mt-0.5 p-1.5 bg-indigo-100 rounded-full'>
              <Lightbulb className='h-3.5 w-3.5 text-indigo-600' />
            </div>
            <div className='flex-1 space-y-1'>
              <p className='text-[11px] font-bold text-indigo-700 uppercase tracking-wide'>
                Oneri
              </p>
              <p className='text-xs text-indigo-900 leading-relaxed'>
                {alert.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className='flex items-center gap-2 mt-1'>
        <Button
          className='w-full h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-none'
          onClick={handleActionClick}
        >
          <Zap className='mr-2 h-3.5 w-3.5' />
          Aksiyon Al
        </Button>
      </div>
    </div>
  );
}
