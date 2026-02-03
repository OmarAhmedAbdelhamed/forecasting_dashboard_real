'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import { InventoryItem } from '@/types/inventory';
import {
  ArrowLeft,
  Shield,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface SafetyStockFormProps {
  item: InventoryItem;
  onBack: () => void;
  onSave: (data: SafetyStockData) => void;
}

export interface SafetyStockData {
  productKey: string;
  productName: string;
  sku: string;
  previousValue: number;
  newValue: number;
  reason: string;
  createdAt: string;
}

const ADJUSTMENT_REASONS = [
  { value: 'demand_increase', label: 'Talep Artışı Beklentisi' },
  { value: 'demand_decrease', label: 'Talep Azalması Beklentisi' },
  { value: 'seasonal', label: 'Sezonluk Düzenleme' },
  { value: 'supplier_issue', label: 'Tedarikçi Sorunu' },
  { value: 'lead_time_change', label: 'Temin Süresi Değişikliği' },
  { value: 'promotion_planned', label: 'Planlı Promosyon' },
];

export function SafetyStockForm({
  item,
  onBack,
  onSave,
}: SafetyStockFormProps) {
  const currentValue = item.minStockLevel;
  const [newValue, setNewValue] = useState(currentValue);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const change = newValue - currentValue;
  const changePercent =
    currentValue > 0 ? ((change / currentValue) * 100).toFixed(1) : 0;

  const handleSubmit = async () => {
    if (!reason || newValue < 0) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const data: SafetyStockData = {
      productKey: item.productKey || item.id,
      productName: item.productName,
      sku: item.sku,
      previousValue: currentValue,
      newValue,
      reason,
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
          <Shield className='h-5 w-5 text-primary' />
          <h3 className='font-semibold'>Güvenlik Stoğunu Düzenle</h3>
        </div>
      </div>

      {/* Product Info */}
      <div className='p-3 bg-muted/50 rounded-lg text-sm'>
        <p className='font-medium'>{item.productName}</p>
        <p className='text-muted-foreground text-xs'>{item.sku}</p>
      </div>

      {/* Current vs New Value */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>Mevcut Değer</Label>
          <div className='p-4 bg-muted/30 rounded-lg border text-center'>
            <p className='text-2xl font-bold text-muted-foreground'>
              {currentValue}
            </p>
            <p className='text-xs text-muted-foreground'>adet</p>
          </div>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='newValue' className='text-xs'>
            Yeni Değer *
          </Label>
          <Input
            id='newValue'
            type='number'
            value={newValue}
            onChange={(e) =>
              setNewValue(Math.max(0, parseInt(e.target.value) || 0))
            }
            min={0}
            className='text-2xl font-bold text-center h-auto py-3'
          />
        </div>
      </div>

      {/* Change Indicator */}
      {change !== 0 && (
        <div
          className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
            change > 0
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {change > 0 ? (
            <TrendingUp className='h-4 w-4' />
          ) : (
            <TrendingDown className='h-4 w-4' />
          )}
          <span className='text-sm font-medium'>
            {change > 0 ? '+' : ''}
            {change} adet ({changePercent}%)
          </span>
        </div>
      )}

      {/* Impact Info */}
      <div className='p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700'>
        <p className='font-medium mb-1'>📊 Değişiklik Etkisi</p>
        <ul className='space-y-1 text-blue-600'>
          <li>
            • Yeni sipariş noktası: {item.reorderPoint + change} adet olacaktır
          </li>
          <li>
            • Tahmini ek stok maliyeti: ₺
            {Math.abs(change * item.price).toLocaleString('tr-TR')}
          </li>
        </ul>
      </div>

      {/* Reason */}
      <div className='space-y-2'>
        <Label className='text-xs'>Değişiklik Nedeni *</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue placeholder='Neden seçin...' />
          </SelectTrigger>
          <SelectContent>
            {ADJUSTMENT_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className='flex gap-2 pt-2'>
        <Button variant='outline' onClick={onBack} className='flex-1'>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          className='flex-1'
          disabled={!reason || newValue < 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Kaydediliyor...
            </>
          ) : (
            'Değişikliği Kaydet'
          )}
        </Button>
      </div>
    </div>
  );
}
