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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';

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
  products?: { value: string; label: string }[];
  selectedProductId?: string;
  onProductChange?: (val: string) => void;
  period?: number;
}

export function InventoryCharts({
  data = [],
  hasSelection = true,
  products = [],
  selectedProductId,
  onProductChange,
  period = 30,
}: InventoryChartsProps) {
  // We can treat 'data' as the display data directly.
  const displayData = data;

  // 1. Initial State: No Selection (Only if no data and no product selected)
  // If we have a selected product, we should try to show data or "No Data" for that product
  if (!hasSelection && !selectedProductId) {
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
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <div className='space-y-1'>
          <CardTitle>Stok ve Talep Trendleri</CardTitle>
          <CardDescription>
            Geçmiş {period} gün ve Gelecek {period} günlük stok değişimi ve
            talep tahmin karşılaştırması
          </CardDescription>
        </div>
        {products.length > 0 && onProductChange && (
          <div className='min-w-[200px]'>
            <Select value={selectedProductId} onValueChange={onProductChange}>
              <SelectTrigger>
                <SelectValue placeholder='Ürün Seçin' />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.value} value={product.value}>
                    {product.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent className='flex-1 flex flex-col pt-4'>
        {displayData.length === 0 ? (
          <div className='flex h-87.5 items-center justify-center text-muted-foreground'>
            {selectedProductId
              ? 'Bu ürün için trend verisi bulunamadı'
              : 'Veri Bulunamadı'}
          </div>
        ) : (
          <InventoryTrendsCharts data={displayData} />
        )}
      </CardContent>
    </Card>
  );
}
