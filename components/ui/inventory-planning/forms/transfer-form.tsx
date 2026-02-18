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
import { useProductStoreComparison } from '@/services';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { Info } from 'lucide-react';

interface TransferFormProps {
  item: InventoryItem;
  storeOptions?: { value: string; label: string }[];
  periodDays?: number;
  initialData?: {
    sourceStoreLabel?: string;
    sourceStoreId?: string;
    destinationStoreId?: string;
    transferQuantity?: number;
    reason?: string;
    notes?: string;
  };
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

export function TransferForm({
  item,
  storeOptions = [],
  periodDays = 30,
  initialData,
  onBack,
  onSave,
}: TransferFormProps) {
  const stores = storeOptions.length > 0 ? storeOptions : getAllStores();

  // Determine current store from product key
  const productKeyParts = item.productKey?.split('_') || [];
  const currentStoreKey =
    productKeyParts.length >= 2
      ? `${productKeyParts[0]}_${productKeyParts[1]}`
      : '';
  const derivedStoreId = productKeyParts.length > 0 ? productKeyParts[0] : '';
  const currentStoreId =
    initialData?.sourceStoreId || derivedStoreId || currentStoreKey;
  const currentStore =
    stores.find((s) => s.value === currentStoreId) ||
    stores.find((s) => s.value === currentStoreKey);
  const sourceStoreLabel =
    initialData?.sourceStoreLabel || currentStore?.label || 'Merkez Depo';

  const [destinationStore, setDestinationStore] = useState(
    initialData?.destinationStoreId || '',
  );
  const [transferQuantity, setTransferQuantity] = useState(
    Math.min(initialData?.transferQuantity ?? 50, item.stockLevel),
  );
  const [reason, setReason] = useState(initialData?.reason || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out current store from destination options
  const destinationOptions = stores.filter((s) => s.value !== currentStoreId);
  const destinationStoreOption = stores.find((s) => s.value === destinationStore);
  const sourceStoreCode = currentStoreId || '-';
  const destinationStoreCode = destinationStore || '-';
  const sourceStockAfterTransfer = Math.max(0, item.stockLevel - transferQuantity);
  const transferRatioPct =
    item.stockLevel > 0 ? Math.round((transferQuantity / item.stockLevel) * 100) : 0;
  const sourceDemand30 =
    periodDays > 0
      ? Math.round((item.forecastedDemand / periodDays) * 30)
      : item.forecastedDemand;
  const sourceDailyDemand = sourceDemand30 / 30;
  const sourceCurrentDays =
    sourceDailyDemand > 0 ? Math.floor(item.stockLevel / sourceDailyDemand) : 0;
  const sourceAfterDays =
    sourceDailyDemand > 0
      ? Math.floor(sourceStockAfterTransfer / sourceDailyDemand)
      : sourceCurrentDays;

  const destinationStoreMetricsQuery = useProductStoreComparison(
    {
      productId: item.sku,
      storeIds: destinationStore ? [destinationStore] : [],
    },
    {
      enabled: destinationStore.length > 0 && item.sku.length > 0,
    },
  );
  const destinationMetrics =
    destinationStoreMetricsQuery.data?.items?.[0] ?? null;
  const destinationCurrentStock = Number(destinationMetrics?.stockLevel ?? 0);
  const destinationDemand30 = Number(destinationMetrics?.forecastedDemand ?? 0);
  const destinationDailyDemand = destinationDemand30 / 30;
  const destinationAfterStock = destinationCurrentStock + transferQuantity;
  const destinationCurrentDays =
    destinationDailyDemand > 0
      ? Math.floor(destinationCurrentStock / destinationDailyDemand)
      : 0;
  const destinationAfterDays =
    destinationDailyDemand > 0
      ? Math.floor(destinationAfterStock / destinationDailyDemand)
      : destinationCurrentDays;

  const handleSubmit = async () => {
    if (!destinationStore || !reason || transferQuantity <= 0) {return;}

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const data: TransferData = {
      productKey: item.productKey || item.id,
      productName: item.productName,
      sku: item.sku,
      sourceStore: sourceStoreLabel,
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
          <div className='p-3 bg-white rounded-lg border'>
            <p className='font-medium text-sm'>
              {sourceStoreLabel}
            </p>
            <p className='text-xs text-muted-foreground'>
              Mevcut: {item.stockLevel} adet
            </p>
            <p className='text-xs text-muted-foreground'>
              Kod: {sourceStoreCode}
            </p>
          </div>
        </div>
        <div className='space-y-2'>
          <Label className='text-xs'>Hedef Mağaza *</Label>
          <Select value={destinationStore} onValueChange={setDestinationStore}>
            <SelectTrigger className='bg-white'>
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
          <p className='text-xs text-muted-foreground'>
            Kod: {destinationStoreCode}
          </p>
        </div>
      </div>

      <div className='rounded-lg border bg-slate-50/70 p-3 space-y-2'>
        <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Transfer Özeti
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
          <div className='rounded-md border bg-white p-2'>
            <div className='flex items-center gap-1'>
              <p className='text-[11px] text-slate-500 uppercase'>Önerilen Transfer</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className='h-3.5 w-3.5 text-slate-400 cursor-help' />
                </TooltipTrigger>
                <TooltipContent>
                  Alıcı mağazanın 20 günlük stok hedefine ulaşması için önerilen transfer miktarı.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className='text-lg font-bold text-emerald-700'>
              {transferQuantity.toLocaleString('tr-TR')} adet
            </p>
          </div>
          <div className='rounded-md border bg-white p-2'>
            <div className='flex items-center gap-1'>
              <p className='text-[11px] text-slate-500 uppercase'>Alıcı Sonrası</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className='h-3.5 w-3.5 text-slate-400 cursor-help' />
                </TooltipTrigger>
                <TooltipContent>
                  Transfer tamamlandıktan sonra alıcı mağazada kalacak tahmini stok gün sayısı.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className='text-lg font-bold text-slate-900'>{destinationAfterDays} gün</p>
          </div>
          <div className='rounded-md border bg-white p-2'>
            <div className='flex items-center gap-1'>
              <p className='text-[11px] text-slate-500 uppercase'>Gönderen Sonrası</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className='h-3.5 w-3.5 text-slate-400 cursor-help' />
                </TooltipTrigger>
                <TooltipContent>
                  Transfer sonrası gönderen mağazada kalacak tahmini stok gün sayısı.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className='text-lg font-bold text-slate-900'>{sourceAfterDays} gün</p>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div className='rounded-md border bg-white p-3 space-y-2'>
            <p className='text-[11px] text-slate-500 uppercase'>Gönderen</p>
            <p className='text-base font-semibold text-slate-900'>{sourceStoreLabel}</p>
            <p className='text-sm text-slate-700'>
              Mevcut Stok: <span className='font-semibold'>{item.stockLevel}</span> adet
            </p>
            <p className='text-sm text-slate-700'>
              Talep Tahmini (30G): <span className='font-semibold'>{sourceDemand30}</span> adet
            </p>
            <p className='text-sm text-slate-700'>
              Ortalama Günlük Satış Miktarı:{' '}
              <span className='font-semibold'>{sourceDailyDemand.toFixed(1)}</span> adet
            </p>
            <p className='text-sm text-slate-700'>
              Stok Günü (Önce): <span className='font-semibold'>{sourceCurrentDays}</span> gün
            </p>
            <p className='text-sm text-slate-700'>
              Stok Günü (Sonra):{' '}
              <span className='font-semibold'>
                {sourceStockAfterTransfer} adet / {sourceAfterDays} gün
              </span>
            </p>
          </div>
          <div className='rounded-md border bg-white p-3 space-y-2'>
            <p className='text-[11px] text-slate-500 uppercase'>Alıcı</p>
            <p className='text-base font-semibold text-slate-900'>
              {destinationStoreOption?.label || 'Mağaza seçiniz'}
            </p>
            <p className='text-sm text-slate-700'>
              Mevcut Stok:{' '}
              <span className='font-semibold'>
                {destinationCurrentStock}
              </span>{' '}
              adet
            </p>
            <p className='text-sm text-slate-700'>
              Talep Tahmini (30G):{' '}
              <span className='font-semibold'>
                {destinationDemand30}
              </span>{' '}
              adet
            </p>
            <p className='text-sm text-slate-700'>
              Ortalama Günlük Satış Miktarı:{' '}
              <span className='font-semibold'>
                {destinationDailyDemand.toFixed(1)}
              </span>{' '}
              adet
            </p>
            <p className='text-sm text-slate-700'>
              Stok Günü (Önce):{' '}
              <span className='font-semibold'>
                {destinationCurrentDays}
              </span>{' '}
              gün
            </p>
            <p className='text-sm text-slate-700'>
              Stok Günü (Sonra):{' '}
              <span className='font-semibold'>
                {destinationAfterStock} adet / {destinationAfterDays} gün
              </span>
            </p>
            <p className='text-xs text-slate-500'>
              Transfer oranı: %{transferRatioPct}
            </p>
          </div>
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
          className='text-lg font-semibold bg-white'
          value={transferQuantity}
          onChange={(e) =>
            { setTransferQuantity(
              Math.min(
                maxTransferQty,
                Math.max(0, parseInt(e.target.value) || 0),
              ),
            ); }
          }
          min={1}
          max={maxTransferQty}
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
          <SelectTrigger className='bg-white'>
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
          className='bg-white'
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
