'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { demandApi } from '@/services/api/demand';
import type { GrowthProduct, ForecastErrorProduct } from '@/services/types/api';
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
import { Search, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataScope } from '@/types/permissions';
import type { UserRole } from '@/types/auth';

interface ResolvedAlert {
  id: string;
  type: string;
  name: string;
  action: string;
  comment: string;
  date: Date;
  data: GrowthProduct | ForecastErrorProduct;
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
  canResolveAlerts: boolean;
  dataScope: DataScope;
  userRole: UserRole | null;
}

export function AlertList({
  type,
  filters,
  resolvedAlerts,
  onResolve,
  canResolveAlerts,
}: AlertListProps) {
  const [search, setSearch] = useState('');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actions, setActions] = useState<Record<string, string>>({});

  // Keep behavior consistent with the Demand Forecasting page alerts.
  const days = 30;
  const storeIds = filters.selectedStores.length > 0 ? filters.selectedStores : undefined;
  const categoryIds =
    filters.selectedCategories.length > 0 ? filters.selectedCategories : undefined;

  const growthType = type === 'low-growth' ? 'low' : type === 'high-growth' ? 'high' : null;

  const growthQuery = useQuery({
    queryKey: ['alert-center', 'growth', growthType, storeIds, categoryIds, days],
    queryFn: async () => {
      if (!growthType) {
        return { products: [] as GrowthProduct[] };
      }
      return demandApi.getGrowthProducts({
        type: growthType,
        storeIds,
        categoryIds,
        productIds: undefined,
        days,
      });
    },
    enabled: growthType !== null,
    staleTime: 1000 * 30,
  });

  const forecastErrorsQuery = useQuery({
    queryKey: ['alert-center', 'forecast-errors', storeIds, categoryIds, days],
    queryFn: () =>
      demandApi.getForecastErrors({
        storeIds,
        categoryIds,
        productIds: undefined,
        severityFilter: 'all',
        days,
      }),
    enabled: type === 'forecast-error',
    staleTime: 1000 * 30,
  });

  const resolvedIds = useMemo(() => {
    return new Set(resolvedAlerts.filter((r) => r.type === type).map((r) => r.id));
  }, [resolvedAlerts, type]);

  const apiData = useMemo(() => {
    if (type === 'forecast-error') {
      return (forecastErrorsQuery.data?.products ?? []) as ForecastErrorProduct[];
    }
    return (growthQuery.data?.products ?? []) as GrowthProduct[];
  }, [type, forecastErrorsQuery.data, growthQuery.data]);

  const filteredData = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return apiData
      .filter((item) => !resolvedIds.has(item.id))
      .filter((item) => {
        if (needle === '') {
          return true;
        }
        const name = (item.name ?? '').toLowerCase();
        const id = item.id.toLowerCase();
        return name.includes(needle) || id.includes(needle);
      });
  }, [apiData, resolvedIds, search]);

  const currentTabResolvedAlerts = useMemo(() => {
    return resolvedAlerts.filter((alert) => alert.type === type);
  }, [resolvedAlerts, type]);

  const handleResolve = (item: GrowthProduct | ForecastErrorProduct) => {
    onResolve({
      id: item.id,
      type,
      name: item.name || 'Ürün',
      action: actions[item.id] || 'review',
      comment: comments[item.id] || '',
      date: new Date(),
      data: item,
    });

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

  const actionOptionsExtended = [
    { value: 'review', label: 'İncelemeye Al' },
    { value: 'adjust_forecast', label: 'Tahmini Güncelle' },
    { value: 'check_stock', label: 'Stok Kontrolü' },
    { value: 'promote', label: 'Promosyon Planla' },
  ];

  const getSeverity = (item: ForecastErrorProduct) => {
    const raw = item.severity?.toLowerCase?.();
    if (raw) {
      return raw;
    }
    const errorValue = item.error ?? 0;
    if (errorValue >= 20) return 'critical';
    if (errorValue >= 10) return 'high';
    if (errorValue >= 5) return 'medium';
    if (errorValue > 0) return 'low';
    return 'ok';
  };

  const actionOptions = [
    { value: 'review', label: 'İnceleme Bekliyor' },
    { value: 'investigate', label: 'İncele' },
    { value: 'action', label: 'Aksiyon Al' },
  ];

  return (
    <div className='flex flex-col space-y-6'>
      <Card>
        <CardHeader className='pb-2'>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                {type === 'low-growth' ? (
                  <TrendingDown className='h-5 w-5 text-red-500' />
                ) : type === 'high-growth' ? (
                  <TrendingUp className='h-5 w-5 text-green-500' />
                ) : (
                  <AlertTriangle className='h-5 w-5 text-orange-500' />
                )}
                {type === 'low-growth'
                  ? 'Düşük Büyüme Uyarıları'
                  : type === 'high-growth'
                    ? 'Yüksek Büyüme Uyarıları'
                    : 'Tahmin Hatası Uyarıları'}
              </CardTitle>
              <CardDescription className='text-xs'>
                Seçilen filtrelere göre API üzerinden güncellenir.
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <div className='relative w-64'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Ara...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='rounded-md border overflow-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                    SKU
                  </th>
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
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
                        Satış
                      </th>
                    </>
                  ) : (
                    <>
                      <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                        Hata
                      </th>
                      <th className='h-12 px-4 text-center align-middle font-medium text-muted-foreground'>
                        Seviye
                      </th>
                    </>
                  )}
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                    Aksiyon
                  </th>
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                    Yorum
                  </th>
                  <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'></th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className='border-b last:border-0'>
                    <td className='p-4 font-mono text-xs text-muted-foreground'>
                      {item.id}
                    </td>
                    <td className='p-4 font-medium text-muted-foreground'>
                      {item.name}
                    </td>

                    {isGrowthType ? (
                      <>
                        <td
                          className={cn(
                            'p-4 text-right font-bold',
                            ((item as GrowthProduct).growth || 0) > 0
                              ? 'text-green-600'
                              : 'text-red-600',
                          )}
                        >
                          {((item as GrowthProduct).growth || 0) > 0 ? '+' : ''}
                          {(item as GrowthProduct).growth}%
                        </td>
                        <td className='p-4 text-right text-muted-foreground opacity-80'>
                          {(item as GrowthProduct).forecast?.toLocaleString?.()}
                        </td>
                        <td className='p-4 text-right text-muted-foreground opacity-80'>
                          {(item as GrowthProduct).actualSales?.toLocaleString?.()}
                        </td>
                      </>
                    ) : (
                      <>
                        <td
                          className={cn(
                            'p-4 text-right font-bold',
                            getSeverity(item as ForecastErrorProduct) === 'critical'
                              ? 'text-red-700'
                              : getSeverity(item as ForecastErrorProduct) === 'high'
                                ? 'text-orange-600'
                                : getSeverity(item as ForecastErrorProduct) === 'medium'
                                  ? 'text-yellow-600'
                                  : 'text-green-600',
                          )}
                        >
                          %{(item as ForecastErrorProduct).error}
                        </td>
                        <td className='p-4 text-center'>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              getSeverity(item as ForecastErrorProduct) === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : getSeverity(item as ForecastErrorProduct) === 'high'
                                  ? 'bg-orange-100 text-orange-800'
                                  : getSeverity(item as ForecastErrorProduct) === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800',
                            )}
                          >
                            {getSeverity(item as ForecastErrorProduct).toUpperCase()}
                          </span>
                        </td>
                      </>
                    )}

                    <td className='p-4'>
                      <Select
                        value={actions[item.id] || 'review'}
                        onValueChange={(val) =>
                          setActions((prev) => ({ ...prev, [item.id]: val }))
                        }
                      >
                        <SelectTrigger className='h-8 w-44'>
                          <SelectValue placeholder='Aksiyon' />
                        </SelectTrigger>
                        <SelectContent>
                          {actionOptionsExtended.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className='p-4'>
                      <Input
                        value={comments[item.id] || ''}
                        onChange={(e) =>
                          setComments((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder='Yorum ekle...'
                        className='h-8'
                      />
                    </td>
                    <td className='p-4 text-right'>
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={() => handleResolve(item)}
                        disabled={!canResolveAlerts}
                      >
                        Çöz
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td
                      colSpan={isGrowthType ? 8 : 7}
                      className='p-6 text-center text-sm text-muted-foreground'
                    >
                      Gösterilecek kayıt yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {currentTabResolvedAlerts.length > 0 && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='flex items-center gap-2'>
              <CheckCircle className='h-5 w-5 text-green-500' />
              Çözülen Uyarılar
            </CardTitle>
            <CardDescription className='text-xs'>
              Bu sekmede çözülen kayıtlar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='rounded-md border overflow-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/50'>
                  <tr>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      ID
                    </th>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      Ürün
                    </th>
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
                      <td className='p-4'>
                        <span className='inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10'>
                          {actionOptionsExtended.find((o) => o.value === alert.action)
                            ?.label || alert.action}
                        </span>
                      </td>
                      <td className='p-4 text-muted-foreground italic max-w-[200px] truncate'>
                        &quot;{alert.comment || '-'}&quot;
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
