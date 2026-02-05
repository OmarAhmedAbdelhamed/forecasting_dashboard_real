'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/shared/sheet';
import { InventoryItem } from '@/types/inventory';
import { Badge } from '@/components/ui/shared/badge';
import { Separator } from '@/components/ui/shared/separator';
import { Button } from '@/components/ui/shared/button';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { generateStockTrends } from '@/data/mock-data';

interface ProductDetailSheetProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const trendData = generateStockTrends(15);

export function ProductDetailSheet({
  item,
  open,
  onOpenChange,
}: ProductDetailSheetProps) {
  if (!item) {return null;}

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-100 sm:w-135 overflow-y-auto'>
        <SheetHeader className='mb-6'>
          <div className='flex items-center justify-between'>
            <Badge variant='outline'>{item.category}</Badge>
            <Badge
              variant={
                item.status === 'Out of Stock'
                  ? 'destructive'
                  : item.status === 'Low Stock'
                    ? 'default' // Changed from 'warning' to 'default' as 'warning' might not exist
                    : 'secondary'
              }
            >
              {item.status}
            </Badge>
          </div>
          <SheetTitle className='text-xl'>{item.productName}</SheetTitle>
          <SheetDescription>{item.sku}</SheetDescription>
        </SheetHeader>

        <div className='space-y-6'>
          {/* Key Metrics Grid */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='p-3 bg-muted rounded-lg'>
              <p className='text-xs text-muted-foreground'>Mevcut Stok</p>
              <p className='text-xl font-bold'>{item.stockLevel}</p>
            </div>
            <div className='p-3 bg-muted rounded-lg'>
              <p className='text-xs text-muted-foreground'>
                Tahmini Talep (30 Gün)
              </p>
              <p className='text-xl font-bold'>{item.forecastedDemand}</p>
            </div>
            <div className='p-3 bg-muted rounded-lg'>
              <p className='text-xs text-muted-foreground'>Kapsama Günü</p>
              <p className='text-xl font-bold'>{item.daysOfCoverage}</p>
            </div>
            <div className='p-3 bg-muted rounded-lg'>
              <p className='text-xs text-muted-foreground'>
                Yeniden Sipariş Noktası
              </p>
              <p className='text-xl font-bold'>{item.reorderPoint}</p>
            </div>
          </div>

          <Separator />

          {/* Mini Chart */}
          <div>
            <h3 className='text-sm font-medium mb-3'>
              15 Günlük Stok Hareketi
            </h3>
            <div className='h-37.5 w-full'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={trendData}>
                  <XAxis
                    dataKey='date'
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelStyle={{ fontSize: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Line
                    type='monotone'
                    dataKey='actualStock'
                    stroke='#2563eb'
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className='space-y-3'>
            <h3 className='text-sm font-medium'>Aksiyonlar</h3>
            <div className='flex flex-col gap-2'>
              <Button className='w-full'>Satınalma Talebi Oluştur</Button>
              <Button variant='outline' className='w-full'>
                Mağazalar Arası Transfer
              </Button>
              <Button variant='ghost' className='w-full'>
                Güvenlik Stoğunu Düzenle ({item.minStockLevel})
              </Button>
            </div>
          </div>

          <div className='pt-4 text-xs text-muted-foreground text-center'>
            Son güncelleme: {item.lastRestockDate}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
