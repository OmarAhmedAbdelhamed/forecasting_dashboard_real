import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/shared/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { Info } from 'lucide-react';
import { StoreInventoryPerformance } from '@/types/inventory';

interface StoreComparisonProps {
  data: StoreInventoryPerformance[];
}

export function StoreComparison({ data }: StoreComparisonProps) {
  return (
    <Card className='col-span-1 h-full'>
      <CardHeader>
        <CardTitle>Mağaza Performansı</CardTitle>
        <CardDescription>
          Filtreli mağazaların stok ve satış performansı detayları
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='overflow-auto h-150'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='text-center'>Mağaza Adı</TableHead>
                <TableHead className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    Mevcut Stok
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        Mağazadaki toplam fiziksel stok miktarı
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    Günlük Satış
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        Son 30 günlük ortalama satış adedi
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    Stok Günü
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        Mevcut stokla kaç günlük talebin karşılanabileceği
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    Verimlilik
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent>
                        Stok devir hızı ve karlılık bazlı performans skoru
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.map((store) => (
                  <TableRow key={store.storeId}>
                    <TableCell className='font-medium text-center'>
                      {store.storeName}
                    </TableCell>
                    <TableCell className='text-center'>
                      {store.stockLevel.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell className='text-center'>
                      {store.dailySales.toLocaleString('tr-TR')} Adet
                    </TableCell>
                    <TableCell className='text-center text-muted-foreground'>
                      {store.daysOfInventory} Gün
                    </TableCell>
                    <TableCell className='text-center font-medium text-blue-600'>
                      %{store.stockEfficiency.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='h-24 text-center text-muted-foreground'
                  >
                    Mağaza verisi bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
