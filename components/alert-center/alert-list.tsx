'use client';

import { useMemo, useState } from 'react';
import {
  GROWTH_PRODUCTS_DATA,
  FORECAST_ERROR_DATA,
  GrowthProduct,
  ForecastErrorProduct,
} from '@/data/mock-alerts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Input } from '@/components/ui/shared/input';
import { Button } from '@/components/ui/shared/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import {
  Search,
  Info,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';

interface ResolvedAlert {
  id: string;
  type: string;
  name: string;
  action: string;
  comment: string;
  date: Date;
  data: any;
}

interface AlertListProps {
  type: 'low-growth' | 'high-growth' | 'forecast-error';
  filters: {
    selectedRegions: string[];
    selectedStores: string[];
    selectedCategories: string[];
  };
  resolvedAlerts: ResolvedAlert[];
  onResolve: (alert: ResolvedAlert) => void;
}

export function AlertList({
  type,
  filters,
  resolvedAlerts,
  onResolve,
}: AlertListProps) {
  const [search, setSearch] = useState('');
  // Local state to track comments and actions for demo purposes
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actions, setActions] = useState<Record<string, string>>({});

  const filteredData = useMemo(() => {
    let data: any[] = [];
    if (type === 'low-growth') {
      data = GROWTH_PRODUCTS_DATA.filter((p) => p.type === 'low');
    } else if (type === 'high-growth') {
      data = GROWTH_PRODUCTS_DATA.filter((p) => p.type === 'high');
    } else {
      data = FORECAST_ERROR_DATA;
    }

    // Filter out already resolved items
    const resolvedIds = resolvedAlerts
      .filter((r) => r.type === type)
      .map((r) => r.id);

    return data
      .filter((item) => !resolvedIds.includes(item.id))
      .filter((item) => {
        const matchesSearch =
          search === '' ||
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.id.toLowerCase().includes(search.toLowerCase());

        const matchesStore =
          filters.selectedStores.length === 0 ||
          filters.selectedStores.includes(item.store);

        return matchesSearch && matchesStore;
      });
  }, [type, filters, search, resolvedAlerts]);

  const currentTabResolvedAlerts = useMemo(() => {
    return resolvedAlerts.filter((alert) => alert.type === type);
  }, [resolvedAlerts, type]);

  const handleResolve = (item: any) => {
    onResolve({
      id: item.id,
      type: type,
      name: item.name,
      action: actions[item.id] || 'review', // Default action if none selected
      comment: comments[item.id] || '',
      date: new Date(),
      data: item,
    });

    // Clear local state
    setComments((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setActions((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  const isGrowthType = type === 'low-growth' || type === 'high-growth';

  const actionOptions = [
    { value: 'review', label: 'İncelemeye Al' },
    { value: 'adjust_forecast', label: 'Tahmini Güncelle' },
    { value: 'check_stock', label: 'Stok Kontrolü' },
    { value: 'promote', label: 'Promosyon Planla' },
    { value: 'ignore', label: 'Yoksay' },
  ];

  return (
    <div className='flex flex-col gap-6 h-full'>
      {/* Active Alerts Card */}
      <Card className='flex-1 flex flex-col min-h-100'>
        <CardHeader className='pb-3'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div>
              <CardTitle className='text-lg font-semibold flex items-center gap-2'>
                {type === 'low-growth' && (
                  <>
                    <TrendingDown className='h-5 w-5 text-red-500' />
                    Düşük Büyüme Gösteren Ürünler
                  </>
                )}
                {type === 'high-growth' && (
                  <>
                    <TrendingUp className='h-5 w-5 text-green-500' />
                    Yüksek Büyüme Gösteren Ürünler
                  </>
                )}
                {type === 'forecast-error' && (
                  <>
                    <AlertTriangle className='h-5 w-5 text-orange-500' />
                    Tahmin Sapmaları
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {type === 'low-growth' &&
                  'Satış performansı düşen ve inceleme gereken ürünler.'}
                {type === 'high-growth' &&
                  'Beklenenden hızlı büyüyen ve stok takibi gereken ürünler.'}
                {type === 'forecast-error' &&
                  'AI tahmini ile gerçekleşen satış arasında yüksek fark olan ürünler.'}
              </CardDescription>
            </div>
            <div className='relative w-full md:w-72'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='SKU veya Ürün Ara...'
                className='pl-9'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className='flex-1 overflow-auto'>
          <div className='rounded-md border'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50 sticky top-0 z-10'>
                <tr className='border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'>
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground w-24'>
                    SKU
                  </th>
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[150px]'>
                    Ürün
                  </th>

                  {isGrowthType ? (
                    <>
                      <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                        Büyüme
                      </th>
                      <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                        Tahmin
                      </th>
                      <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                        Gerçekleşen
                      </th>
                    </>
                  ) : (
                    <>
                      <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                        Hata (MAPE)
                      </th>
                      <th className='h-12 px-4 text-center align-middle font-medium text-muted-foreground'>
                        Öncelik
                      </th>
                    </>
                  )}

                  {/* Inline Action Columns */}
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[200px]'>
                    Yorum
                  </th>
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[180px]'>
                    Aksiyon Seçimi
                  </th>
                  <th className='h-12 px-4 text-center align-middle font-medium text-muted-foreground w-[100px]'>
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isGrowthType ? 8 : 7}
                      className='h-24 text-center text-muted-foreground'
                    >
                      Kriterlere uygun kayıt bulunamadı veya tümü çözümlendi.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr
                      key={item.id}
                      className='border-b transition-colors hover:bg-muted/50'
                    >
                      <td className='p-4 font-mono text-xs'>{item.id}</td>
                      <td className='p-4 font-medium'>{item.name}</td>

                      {isGrowthType ? (
                        <>
                          <td
                            className={cn(
                              'p-4 text-right font-bold',
                              (item as GrowthProduct).growth > 0
                                ? 'text-green-600'
                                : 'text-red-600',
                            )}
                          >
                            {(item as GrowthProduct).growth > 0 ? '+' : ''}
                            {(item as GrowthProduct).growth}%
                          </td>
                          <td className='p-4 text-right'>
                            {(item as GrowthProduct).forecast.toLocaleString()}
                          </td>
                          <td className='p-4 text-right'>
                            {(
                              item as GrowthProduct
                            ).actualSales.toLocaleString()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className='p-4 text-right font-bold text-orange-600'>
                            %{(item as ForecastErrorProduct).mape}
                          </td>
                          <td className='p-4 text-center'>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                {
                                  'bg-red-100 text-red-800':
                                    (item as ForecastErrorProduct).severity ===
                                    'critical',
                                  'bg-orange-100 text-orange-800':
                                    (item as ForecastErrorProduct).severity ===
                                    'high',
                                  'bg-yellow-100 text-yellow-800':
                                    (item as ForecastErrorProduct).severity ===
                                    'medium',
                                  'bg-green-100 text-green-800': [
                                    'low',
                                    'ok',
                                  ].includes(
                                    (item as ForecastErrorProduct).severity,
                                  ),
                                },
                              )}
                            >
                              {(
                                item as ForecastErrorProduct
                              ).severity.toUpperCase()}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Inline Actions */}
                      <td className='p-4'>
                        <Input
                          placeholder='Yorum...'
                          className='h-8 text-xs'
                          value={comments[item.id] || ''}
                          onChange={(e) =>
                            setComments((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className='p-4'>
                        <Select
                          value={actions[item.id]}
                          onValueChange={(val) =>
                            setActions((prev) => ({ ...prev, [item.id]: val }))
                          }
                        >
                          <SelectTrigger className='h-8 text-xs w-full'>
                            <SelectValue placeholder='Aksiyon Seç' />
                          </SelectTrigger>
                          <SelectContent>
                            {actionOptions.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className='text-xs'
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className='p-4 text-center'>
                        <Button
                          size='sm'
                          className='h-8 w-8 p-0'
                          variant='ghost'
                          onClick={() => handleResolve(item)}
                          title='Çözüldü Olarak İşaretle'
                        >
                          <CheckCircle className='h-5 w-5 text-green-600 hover:text-green-700' />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resolved Alerts List */}
      {currentTabResolvedAlerts.length > 0 && (
        <Card className='min-h-[200px] bg-slate-50/50'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg font-semibold flex items-center gap-2 text-muted-foreground'>
              <CheckCircle className='h-5 w-5' />
              Çözümlenen Uyarılar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='rounded-md border bg-background'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/50'>
                  <tr className='border-b'>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground w-24'>
                      SKU
                    </th>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      Ürün
                    </th>

                    {/* Dynamic Columns based on type */}
                    {isGrowthType ? (
                      <>
                        <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                          Büyüme
                        </th>
                        <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                          Tahmin
                        </th>
                        <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                          Gerçekleşen
                        </th>
                      </>
                    ) : (
                      <>
                        <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                          Hata (MAPE)
                        </th>
                        <th className='h-12 px-4 text-center align-middle font-medium text-muted-foreground'>
                          Öncelik
                        </th>
                      </>
                    )}

                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      Aksiyon
                    </th>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      Yorum
                    </th>
                    <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                      Tarih
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentTabResolvedAlerts.map((alert, index) => (
                    <tr
                      key={`${alert.id}-${index}`}
                      className='border-b last:border-0'
                    >
                      <td className='p-4 font-mono text-xs text-muted-foreground'>
                        {alert.id}
                      </td>
                      <td className='p-4 font-medium text-muted-foreground'>
                        {alert.name}
                      </td>

                      {/* Dynamic Data Columns */}
                      {isGrowthType ? (
                        <>
                          <td
                            className={cn(
                              'p-4 text-right font-bold text-muted-foreground opacity-80',
                            )}
                          >
                            {((alert.data as GrowthProduct)?.growth || 0) > 0
                              ? '+'
                              : ''}
                            {(alert.data as GrowthProduct)?.growth}%
                          </td>
                          <td className='p-4 text-right text-muted-foreground opacity-80'>
                            {(
                              alert.data as GrowthProduct
                            )?.forecast?.toLocaleString()}
                          </td>
                          <td className='p-4 text-right text-muted-foreground opacity-80'>
                            {(
                              alert.data as GrowthProduct
                            )?.actualSales?.toLocaleString()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className='p-4 text-right font-bold text-muted-foreground opacity-80'>
                            %{(alert.data as ForecastErrorProduct)?.mape}
                          </td>
                          <td className='p-4 text-center'>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600',
                              )}
                            >
                              {(
                                alert.data as ForecastErrorProduct
                              )?.severity?.toUpperCase()}
                            </span>
                          </td>
                        </>
                      )}

                      <td className='p-4'>
                        <span className='inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10'>
                          {actionOptions.find((o) => o.value === alert.action)
                            ?.label || alert.action}
                        </span>
                      </td>
                      <td className='p-4 text-muted-foreground italic max-w-[200px] truncate'>
                        "{alert.comment || '-'}"
                      </td>
                      <td className='p-4 text-right text-muted-foreground text-xs whitespace-nowrap'>
                        {alert.date.toLocaleDateString('tr-TR')}{' '}
                        {alert.date.toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
