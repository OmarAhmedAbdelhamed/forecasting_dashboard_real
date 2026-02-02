'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { CircleAlert } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/shared/card';
import { StockTrendPoint } from '@/types/inventory';

// Dynamically import the chart component with SSR disabled
// This fixes the hydration mismatch and "setState synchronously in effect" warning
const InventoryTrendsCharts = dynamic(
  () => import('./inventory-trends-charts'),
  {
    ssr: false,
    loading: () => (
      <div className='w-full h-87.5 bg-slate-50/50 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-sm'>
        Grafikler yükleniyor...
      </div>
    ),
  },
);

interface InventoryChartsProps {
  data: StockTrendPoint[];
  hasSelection?: boolean;
}

export function InventoryCharts({
  data = [],
  hasSelection = true,
}: InventoryChartsProps) {
  // We can treat 'data' as the display data directly.
  const displayData = data;

  // 1. Initial State: No Selection
  if (!hasSelection) {
    return (
      <Card className='col-span-1 flex flex-col h-full'>
        <CardHeader>
          <CardTitle>Stok ve Talep Trendleri</CardTitle>
          <CardDescription>
            Trend analizlerini görüntülemek için seçim yapın
          </CardDescription>
        </CardHeader>
        <CardContent className='flex-1 flex items-center justify-center text-center p-6'>
          <div className='max-w-xs space-y-2'>
            <CircleAlert className='h-8 w-8 text-slate-300 mx-auto' />
            <p className='text-sm text-muted-foreground font-medium'>
              Analiz grafiklerini görüntülemek için lütfen bir mağaza veya ürün
              seçin.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. Data State: Empty or Populated
  return (
    <Card className='col-span-1 flex flex-col h-full'>
      <CardHeader>
        <CardTitle>Stok ve Talep Trendleri</CardTitle>
        <CardDescription>
          Son 30 günlük stok değişimi ve talep tahmin karşılaştırması
        </CardDescription>
      </CardHeader>
      <CardContent className='flex-1 flex flex-col'>
        {displayData.length === 0 ? (
          <div className='flex h-87.5 items-center justify-center text-muted-foreground'>
            Veri Bulunamadı
          </div>
        ) : (
          <InventoryTrendsCharts data={displayData} />
        )}
      </CardContent>
    </Card>
  );
}
