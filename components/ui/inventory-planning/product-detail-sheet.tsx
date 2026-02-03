'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import { InventoryItem } from '@/types/inventory';
import { Badge } from '@/components/ui/shared/badge';
import { Separator } from '@/components/ui/shared/separator';
import { Button } from '@/components/ui/shared/button';
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
import { CheckCircle2, Tag, Lightbulb } from 'lucide-react';

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

// Generate AI recommendation based on product status
function getRecommendation(item: InventoryItem): string | null {
  if (item.status === 'Out of Stock') {
    return `Bu ürün stokta kalmadı. Acil sipariş vererek ${item.forecastedDemand} adetlik 30 günlük talebi karşılayabilirsiniz. Tedarikçi ile hızlı teslimat için iletişime geçmenizi öneriyoruz.`;
  }
  if (item.status === 'Low Stock') {
    const daysLeft = Math.floor(item.stockLevel / (item.forecastedDemand / 30));
    return `Stok seviyesi kritik! Tahmini ${daysLeft} gün içinde stok tükenebilir. Sipariş noktasına (${item.reorderPoint} adet) ulaşmadan yeniden sipariş vermenizi öneriyoruz.`;
  }
  if (item.status === 'Overstock') {
    const excessStock = item.stockLevel - item.forecastedDemand;
    return `Bu üründe ${excessStock.toLocaleString('tr-TR')} adet fazla stok bulunuyor. Depo maliyetlerini azaltmak için promosyon düzenlemeyi veya diğer mağazalara transfer etmeyi düşünebilirsiniz.`;
  }
  // In Stock - provide optimization tips
  if (item.daysOfCoverage > 60) {
    return `Stok seviyeniz iyi durumda. ${item.daysOfCoverage} günlük kapsama ile rahat bir süreç yönetebilirsiniz. Talep değişikliklerini takip etmeye devam edin.`;
  }
  return null;
}

interface ProductDetailSheetProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActiveForm = 'none' | 'purchase' | 'transfer' | 'safety';

export function ProductDetailSheet({
  item,
  open,
  onOpenChange,
}: ProductDetailSheetProps) {
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<ActiveForm>('none');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Generate trend data dynamically based on the selected product
  const trendData = useMemo(() => {
    if (!item) return [];
    // Generate 15 days of stock trends specific to this product
    return generateSingleProductStockTrends(item, 15);
  }, [item]);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setActiveForm('none');
      setSuccessMessage(null);
    }
    onOpenChange(newOpen);
  };

  // Handle form saves
  const handlePurchaseOrderSave = (data: PurchaseOrderData) => {
    savePurchaseOrder(data);
    setSuccessMessage('Satınalma talebi başarıyla oluşturuldu!');
    setActiveForm('none');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleTransferSave = (data: TransferData) => {
    saveTransfer(data);
    setSuccessMessage('Transfer talebi başarıyla oluşturuldu!');
    setActiveForm('none');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSafetyStockSave = (data: SafetyStockData) => {
    saveSafetyStockChange(data);
    setSuccessMessage('Güvenlik stoğu başarıyla güncellendi!');
    setActiveForm('none');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePromotionClick = () => {
    onOpenChange(false);
    router.push('/dashboard?section=promotions');
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto pt-8'>
        {/* Success Message */}
        {successMessage && (
          <div className='absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg border border-green-200 shadow-lg animate-in fade-in slide-in-from-top-2'>
            <CheckCircle2 className='h-4 w-4' />
            <span className='text-sm font-medium'>{successMessage}</span>
          </div>
        )}

        {/* Render active form or default view */}
        {activeForm === 'purchase' && (
          <PurchaseOrderForm
            item={item}
            onBack={() => setActiveForm('none')}
            onSave={handlePurchaseOrderSave}
          />
        )}

        {activeForm === 'transfer' && (
          <TransferForm
            item={item}
            onBack={() => setActiveForm('none')}
            onSave={handleTransferSave}
          />
        )}

        {activeForm === 'safety' && (
          <SafetyStockForm
            item={item}
            onBack={() => setActiveForm('none')}
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

            <div className='space-y-6'>
              {/* Key Metrics Grid */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='p-4 bg-muted/30 rounded-lg border border-border hover:border-muted-foreground/20 transition-colors'>
                  <p className='text-xs text-muted-foreground font-medium mb-1.5'>
                    Mevcut Stok
                  </p>
                  <p className='text-2xl font-bold text-foreground'>
                    {item.stockLevel.toLocaleString('tr-TR')}
                  </p>
                </div>
                <div className='p-4 bg-muted/30 rounded-lg border border-border hover:border-muted-foreground/20 transition-colors'>
                  <p className='text-xs text-muted-foreground font-medium mb-1.5'>
                    Tahmini Talep (30 Gün)
                  </p>
                  <p className='text-2xl font-bold text-foreground'>
                    {item.forecastedDemand.toLocaleString('tr-TR')}
                  </p>
                </div>
                <div className='p-4 bg-muted/30 rounded-lg border border-border hover:border-muted-foreground/20 transition-colors'>
                  <p className='text-xs text-muted-foreground font-medium mb-1.5'>
                    Kapsama Günü
                  </p>
                  <p className='text-2xl font-bold text-foreground'>
                    {item.daysOfCoverage}
                  </p>
                </div>
                <div className='p-4 bg-muted/30 rounded-lg border border-border hover:border-muted-foreground/20 transition-colors'>
                  <p className='text-xs text-muted-foreground font-medium mb-1.5'>
                    Yeniden Sipariş Noktası
                  </p>
                  <p className='text-2xl font-bold text-foreground'>
                    {item.reorderPoint}
                  </p>
                </div>
              </div>

              {/* AI Recommendation */}
              {getRecommendation(item) && (
                <div className='relative overflow-hidden rounded-lg bg-indigo-50/50 border border-indigo-100 p-3'>
                  <div className='flex items-start gap-3'>
                    <div className='mt-0.5 p-1.5 bg-indigo-100 rounded-full shrink-0'>
                      <Lightbulb className='h-3.5 w-3.5 text-indigo-600' />
                    </div>
                    <div className='flex-1 space-y-1'>
                      <p className='text-[11px] font-bold text-indigo-700 uppercase tracking-wide'>
                        Yapay Zeka Önerisi
                      </p>
                      <p className='text-xs text-indigo-900 leading-relaxed'>
                        {getRecommendation(item)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Mini Chart */}
              <div>
                <h3 className='text-sm font-semibold mb-4'>
                  15 Günlük Stok Hareketi
                </h3>
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
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px',
                          padding: '8px 12px',
                        }}
                        labelStyle={{
                          fontSize: '12px',
                          fontWeight: 600,
                          marginBottom: '4px',
                        }}
                        itemStyle={{
                          fontSize: '12px',
                          color: '#2563eb',
                        }}
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

              {/* Actions */}
              <div className='space-y-3'>
                <h3 className='text-sm font-semibold'>Aksiyonlar</h3>
                <div className='flex flex-col gap-2'>
                  <Button
                    className='w-full'
                    size='lg'
                    onClick={() => setActiveForm('purchase')}
                  >
                    Satınalma Talebi Oluştur
                  </Button>
                  <Button
                    variant='outline'
                    className='w-full'
                    size='lg'
                    onClick={() => setActiveForm('transfer')}
                  >
                    Mağazalar Arası Transfer
                  </Button>
                  <Button
                    variant='outline'
                    className='w-full'
                    size='lg'
                    onClick={() => setActiveForm('safety')}
                  >
                    Güvenlik Stoğunu Düzenle ({item.minStockLevel})
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
                Son güncelleme: {item.lastRestockDate}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
