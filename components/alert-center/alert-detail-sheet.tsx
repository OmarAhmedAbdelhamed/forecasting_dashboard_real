'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/shared/sheet';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Textarea } from '@/components/ui/shared/textarea';
import { GrowthProduct, ForecastErrorProduct } from '@/data/mock-alerts';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  CheckCircle,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface AlertDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: GrowthProduct | ForecastErrorProduct | null;
  type: 'growth' | 'error';
}

export function AlertDetailSheet({
  open,
  onOpenChange,
  alert,
  type,
}: AlertDetailSheetProps) {
  const [comment, setComment] = useState('');

  if (!alert) return null;

  const handleResolve = () => {
    // Mock resolve action
    console.log('Resolving alert:', alert.id);
    onOpenChange(false);
  };

  const isGrowth = type === 'growth';
  // Type guards or casting for simplicity
  const growthAlert = isGrowth ? (alert as GrowthProduct) : null;
  const errorAlert = !isGrowth ? (alert as ForecastErrorProduct) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-md w-full'>
        <SheetHeader className='space-y-4'>
          <div className='flex items-start justify-between'>
            <div className='space-y-1'>
              <SheetTitle className='text-xl font-bold flex items-center gap-2'>
                {alert.name}
              </SheetTitle>
              <SheetDescription className='font-mono text-xs'>
                {alert.id}
              </SheetDescription>
            </div>
            {isGrowth ? (
              <Badge
                variant={
                  growthAlert!.type === 'high' ? 'secondary' : 'destructive'
                }
                className={cn(
                  growthAlert!.type === 'high'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800',
                )}
              >
                {growthAlert!.type === 'high'
                  ? 'Yüksek Büyüme'
                  : 'Düşük Büyüme'}
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className={cn(
                  errorAlert!.severity === 'critical'
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : errorAlert!.severity === 'high'
                      ? 'bg-orange-100 text-orange-800 border-orange-200'
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200',
                )}
              >
                {errorAlert!.severity.toUpperCase()}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className='py-6 space-y-6'>
          {/* Key Metrics Grid */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='p-3 bg-muted/30 rounded-lg space-y-1'>
              <div className='text-xs text-muted-foreground font-medium'>
                Mağaza
              </div>
              <div className='text-sm font-semibold'>{alert.store}</div>
            </div>

            {isGrowth ? (
              <>
                <div className='p-3 bg-muted/30 rounded-lg space-y-1'>
                  <div className='text-xs text-muted-foreground font-medium'>
                    Büyüme
                  </div>
                  <div
                    className={cn(
                      'text-sm font-bold flex items-center gap-1',
                      growthAlert!.growth > 0
                        ? 'text-green-600'
                        : 'text-red-600',
                    )}
                  >
                    {growthAlert!.growth > 0 ? (
                      <TrendingUp className='h-3 w-3' />
                    ) : (
                      <TrendingDown className='h-3 w-3' />
                    )}
                    {growthAlert!.growth}%
                  </div>
                </div>
                <div className='p-3 bg-muted/30 rounded-lg space-y-1'>
                  <div className='text-xs text-muted-foreground font-medium'>
                    Tahmin
                  </div>
                  <div className='text-sm font-semibold'>
                    {growthAlert!.forecast.toLocaleString()}
                  </div>
                </div>
                <div className='p-3 bg-muted/30 rounded-lg space-y-1'>
                  <div className='text-xs text-muted-foreground font-medium'>
                    Gerçekleşen
                  </div>
                  <div className='text-sm font-semibold'>
                    {growthAlert!.actualSales.toLocaleString()}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className='p-3 bg-muted/30 rounded-lg space-y-1'>
                  <div className='text-xs text-muted-foreground font-medium'>
                    Hata Payı (MAPE)
                  </div>
                  <div className='text-sm font-bold text-orange-600'>
                    %{errorAlert!.mape}
                  </div>
                </div>
                <div className='p-3 bg-muted/30 rounded-lg space-y-1'>
                  <div className='text-xs text-muted-foreground font-medium'>
                    Bias
                  </div>
                  <div className='text-sm font-semibold capitalize'>
                    {errorAlert!.bias}
                  </div>
                </div>
                <div className='p-3 bg-muted/30 rounded-lg space-y-1'>
                  <div className='text-xs text-muted-foreground font-medium'>
                    Aksiyon
                  </div>
                  <div className='text-sm font-semibold'>
                    {errorAlert!.action}
                  </div>
                </div>
              </>
            )}
          </div>

          {!isGrowth && (
            <div className='p-3 border border-orange-200 bg-orange-50 rounded-lg'>
              <div className='flex items-start gap-2'>
                <AlertTriangle className='h-4 w-4 text-orange-600 mt-0.5' />
                <div className='text-xs text-orange-800'>
                  <strong>Neden Önemli:</strong> Yüksek sapma stok sorunlarına
                  yol açabilir. {errorAlert!.action} önerilmektedir.
                </div>
              </div>
            </div>
          )}

          {/* Interactive Section */}
          <div className='space-y-3 pt-2 border-t'>
            <label className='text-sm font-medium flex items-center gap-2'>
              <MessageSquare className='h-4 w-4' /> Not / Yorum Ekle
            </label>
            <Textarea
              placeholder='Aksiyon hakkında notunuzu buraya girin...'
              className='resize-none text-sm'
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className='flex-col gap-2 sm:flex-col sm:space-x-0'>
          <Button className='w-full' onClick={handleResolve}>
            <CheckCircle className='mr-2 h-4 w-4' />
            Çözüldü Olarak İşaretle
          </Button>
          <Button
            variant='outline'
            className='w-full'
            onClick={() => onOpenChange(false)}
          >
            Kapat
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
