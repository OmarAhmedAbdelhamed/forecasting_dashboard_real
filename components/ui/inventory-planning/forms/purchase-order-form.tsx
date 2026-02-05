'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Textarea } from '@/components/ui/shared/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import { InventoryItem } from '@/types/inventory';
import { ArrowLeft, ShoppingCart, Calendar, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PurchaseOrderFormProps {
  item: InventoryItem;
  onBack: () => void;
  onSave: (data: PurchaseOrderData) => void;
}

export interface PurchaseOrderData {
  productKey: string;
  productName: string;
  sku: string;
  estimatedQuantity: number;
  orderQuantity: number;
  unitPrice: number;
  totalCost: number;
  supplier: string;
  priority: 'normal' | 'high' | 'urgent';
  expectedDelivery: string;
  notes: string;
  createdAt: string;
}

// Mock suppliers list
const SUPPLIERS = [
  { value: 'supplier_a', label: 'ABC Tedarik A.Ş.' },
  { value: 'supplier_b', label: 'Mega Gıda Ltd.' },
  { value: 'supplier_c', label: 'Toptan Market' },
  { value: 'supplier_d', label: 'Doğrudan Üretici' },
];

export function PurchaseOrderForm({
  item,
  onBack,
  onSave,
}: PurchaseOrderFormProps) {
  // Calculate estimated quantity based on reorder point and current stock
  const safetyBuffer = Math.ceil(item.forecastedDemand * 0.2); // 20% safety buffer
  const estimatedQuantity = Math.max(
    0,
    item.reorderPoint - item.stockLevel + safetyBuffer,
  );

  const [orderQuantity, setOrderQuantity] = useState(estimatedQuantity);
  const [unitPrice, setUnitPrice] = useState(item.price); // Initialized with last purchase price
  const [supplier, setSupplier] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>(
    'normal',
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalCost = orderQuantity * unitPrice;

  // Calculate expected delivery based on lead time and priority
  const getExpectedDelivery = () => {
    let baseDays = item.leadTimeDays;
    if (priority === 'high') {baseDays = Math.ceil(baseDays * 0.7);}
    if (priority === 'urgent') {baseDays = Math.ceil(baseDays * 0.5);}
    return addDays(new Date(), baseDays);
  };

  const handleSubmit = async () => {
    if (!supplier || orderQuantity <= 0) {return;}

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const data: PurchaseOrderData = {
      productKey: item.productKey || item.id,
      productName: item.productName,
      sku: item.sku,
      estimatedQuantity,
      orderQuantity,
      unitPrice,
      totalCost,
      supplier,
      priority,
      expectedDelivery: format(getExpectedDelivery(), 'yyyy-MM-dd'),
      notes,
      createdAt: new Date().toISOString(),
    };

    onSave(data);
    setIsSubmitting(false);
  };

  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex items-center gap-3 pb-3 border-b'>
        <Button
          variant='ghost'
          size='icon'
          onClick={onBack}
          className='h-8 w-8'
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div className='flex items-center gap-2'>
          <ShoppingCart className='h-5 w-5 text-primary' />
          <h3 className='font-semibold'>Satınalma Talebi Oluştur</h3>
        </div>
      </div>

      {/* Product Info */}
      <div className='p-3 bg-muted/50 rounded-lg text-sm'>
        <p className='font-medium'>{item.productName}</p>
        <p className='text-muted-foreground text-xs'>{item.sku}</p>
      </div>

      {/* Quantity Section */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>
            Tahmini Gereken Miktar
          </Label>
          <div className='p-3 bg-blue-50 rounded-lg border border-blue-100'>
            <p className='text-xl font-bold text-blue-700'>
              {estimatedQuantity.toLocaleString('tr-TR')}
            </p>
            <p className='text-[10px] text-blue-600'>Sistem önerisi</p>
          </div>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='orderQuantity' className='text-xs'>
            Sipariş Miktarı *
          </Label>
          <Input
            id='orderQuantity'
            type='number'
            value={orderQuantity}
            onChange={(e) =>
              { setOrderQuantity(Math.max(0, parseInt(e.target.value) || 0)); }
            }
            min={1}
            className='text-lg font-semibold'
          />
        </div>
      </div>

      {/* Price Info */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='unitPrice' className='text-xs'>
            Birim Fiyat *
          </Label>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
              ₺
            </span>
            <Input
              id='unitPrice'
              type='number'
              value={unitPrice}
              onChange={(e) =>
                { setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0)); }
              }
              min={0}
              step={0.01}
              className='pl-7 text-lg font-semibold'
            />
          </div>
          <p className='text-[10px] text-muted-foreground'>
            Son alım fiyatı: ₺{item.price.toLocaleString('tr-TR')}
          </p>
        </div>
        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>
            Toplam Maliyet
          </Label>
          <div className='p-3 bg-green-50 rounded-lg border border-green-100'>
            <p className='text-xl font-bold text-green-700'>
              ₺{totalCost.toLocaleString('tr-TR')}
            </p>
            <p className='text-[10px] text-green-600'>Hesaplanan tutar</p>
          </div>
        </div>
      </div>

      {/* Supplier */}
      <div className='space-y-2'>
        <Label className='text-xs'>Tedarikçi *</Label>
        <Select value={supplier} onValueChange={setSupplier}>
          <SelectTrigger>
            <SelectValue placeholder='Tedarikçi seçin...' />
          </SelectTrigger>
          <SelectContent>
            {SUPPLIERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className='space-y-2'>
        <Label className='text-xs'>Öncelik</Label>
        <Select
          value={priority}
          onValueChange={(v) => { setPriority(v as 'normal' | 'high' | 'urgent'); }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='normal'>Normal</SelectItem>
            <SelectItem value='high'>Yüksek</SelectItem>
            <SelectItem value='urgent'>Acil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expected Delivery */}
      <div className='flex items-center gap-2 p-3 bg-muted/30 rounded-lg'>
        <Calendar className='h-4 w-4 text-muted-foreground' />
        <div>
          <p className='text-xs text-muted-foreground'>Tahmini Teslimat</p>
          <p className='font-medium'>
            {format(getExpectedDelivery(), 'dd MMMM yyyy', { locale: tr })}
            <span className='text-xs text-muted-foreground ml-1'>
              ({item.leadTimeDays} gün temin süresi)
            </span>
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className='space-y-2'>
        <Label className='text-xs'>Notlar (Opsiyonel)</Label>
        <Textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); }}
          placeholder='Ek bilgiler...'
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className='flex gap-2 pt-2'>
        <Button variant='outline' onClick={onBack} className='flex-1'>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          className='flex-1'
          disabled={!supplier || orderQuantity <= 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Kaydediliyor...
            </>
          ) : (
            'Talebi Oluştur'
          )}
        </Button>
      </div>
    </div>
  );
}
