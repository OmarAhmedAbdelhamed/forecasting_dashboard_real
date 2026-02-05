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
import { ArrowLeft, Truck, Loader2 } from 'lucide-react';
import { getAllStores } from '@/data/mock-data';

interface TransferFormProps {
  item: InventoryItem;
  onBack: () => void;
  onSave: (data: TransferData) => void;
}

export interface TransferData {
  productKey: string;
  productName: string;
  sku: string;
  sourceStore: string;
  destinationStore: string;
  transferQuantity: number;
  reason: string;
  notes: string;
  createdAt: string;
}

const TRANSFER_REASONS = [
  { value: 'stock_balancing', label: 'Stok Dengeleme' },
  { value: 'emergency', label: 'Acil Talep' },
  { value: 'seasonal', label: 'Sezonluk Düzenleme' },
  { value: 'promotion', label: 'Promosyon Hazırlığı' },
];

export function TransferForm({ item, onBack, onSave }: TransferFormProps) {
  const stores = getAllStores();

  // Determine current store from product key
  const productKeyParts = item.productKey?.split('_') || [];
  const currentStoreKey =
    productKeyParts.length >= 2
      ? `${productKeyParts[0]}_${productKeyParts[1]}`
      : '';
  const currentStore = stores.find((s) => s.value === currentStoreKey);

  const [destinationStore, setDestinationStore] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(
    Math.min(50, item.stockLevel),
  );
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out current store from destination options
  const destinationOptions = stores.filter((s) => s.value !== currentStoreKey);

  const handleSubmit = async () => {
    if (!destinationStore || !reason || transferQuantity <= 0) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const data: TransferData = {
      productKey: item.productKey || item.id,
      productName: item.productName,
      sku: item.sku,
      sourceStore: currentStore?.label || 'Merkez Depo',
      destinationStore:
        stores.find((s) => s.value === destinationStore)?.label ||
        destinationStore,
      transferQuantity,
      reason,
      notes,
      createdAt: new Date().toISOString(),
    };

    onSave(data);
    setIsSubmitting(false);
  };

  const maxTransferQty = item.stockLevel;

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
          <Truck className='h-5 w-5 text-primary' />
          <h3 className='font-semibold'>Mağazalar Arası Transfer</h3>
        </div>
      </div>

      {/* Product Info */}
      <div className='p-3 bg-muted/50 rounded-lg text-sm'>
        <p className='font-medium'>{item.productName}</p>
        <p className='text-muted-foreground text-xs'>{item.sku}</p>
      </div>

      {/* Store Transfer Info */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>Kaynak Mağaza</Label>
          <div className='p-3 bg-muted/30 rounded-lg border'>
            <p className='font-medium text-sm'>
              {currentStore?.label || 'Merkez Depo'}
            </p>
            <p className='text-xs text-muted-foreground'>
              Mevcut: {item.stockLevel} adet
            </p>
          </div>
        </div>
        <div className='space-y-2'>
          <Label className='text-xs'>Hedef Mağaza *</Label>
          <Select value={destinationStore} onValueChange={setDestinationStore}>
            <SelectTrigger>
              <SelectValue placeholder='Mağaza seçin...' />
            </SelectTrigger>
            <SelectContent>
              {destinationOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transfer Quantity */}
      <div className='space-y-2'>
        <div className='flex justify-between'>
          <Label htmlFor='transferQuantity' className='text-xs'>
            Transfer Miktarı *
          </Label>
          <span className='text-xs text-muted-foreground'>
            Maks: {maxTransferQty}
          </span>
        </div>
        <Input
          id='transferQuantity'
          type='number'
          value={transferQuantity}
          onChange={(e) =>
            setTransferQuantity(
              Math.min(
                maxTransferQty,
                Math.max(0, parseInt(e.target.value) || 0),
              ),
            )
          }
          min={1}
          max={maxTransferQty}
          className='text-lg font-semibold'
        />
        {transferQuantity > maxTransferQty * 0.8 && (
          <p className='text-xs text-amber-600'>
            ⚠️ Yüksek transfer miktarı kaynak mağazada stok eksikliğine neden
            olabilir.
          </p>
        )}
      </div>

      {/* Reason */}
      <div className='space-y-2'>
        <Label className='text-xs'>Transfer Nedeni *</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue placeholder='Neden seçin...' />
          </SelectTrigger>
          <SelectContent>
            {TRANSFER_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className='space-y-2'>
        <Label className='text-xs'>Notlar (Opsiyonel)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
          disabled={
            !destinationStore ||
            !reason ||
            transferQuantity <= 0 ||
            isSubmitting
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Kaydediliyor...
            </>
          ) : (
            'Transfer Oluştur'
          )}
        </Button>
      </div>
    </div>
  );
}
