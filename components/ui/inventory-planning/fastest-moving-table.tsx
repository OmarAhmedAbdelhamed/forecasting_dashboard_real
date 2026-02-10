'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { useState, useMemo } from 'react';
import { InventoryItem } from '@/types/inventory';
import { CardDescription } from '@/components/ui/shared/card';

interface FastestMovingTableProps {
  items: InventoryItem[];
  onSeeAll?: (filterType: 'fast' | 'slow') => void;
  period?: number;
}

export function FastestMovingTable({
  items,
  onSeeAll,
  period = 30,
}: FastestMovingTableProps) {
  const [activeTab, setActiveTab] = useState('fastest');

  // Sort logic for tabs
  const fastMovingItems = useMemo(() => {
    return [...items]
      .sort((a, b) => b.forecastedDemand - a.forecastedDemand)
      .slice(0, 10);
  }, [items]);

  const slowMovingItems = useMemo(() => {
    return [...items]
      .sort((a, b) => a.forecastedDemand - b.forecastedDemand)
      .slice(0, 10);
  }, [items]);

  const renderTable = (data: InventoryItem[]) => (
    <div className='h-full overflow-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-xs text-muted-foreground font-normal text-center'>
              <div className='flex items-center justify-center gap-1'>SKU</div>
            </TableHead>
            <TableHead className='text-xs text-muted-foreground font-normal text-center'>
              <div className='flex items-center justify-center gap-1'>
                Ürün Adı
              </div>
            </TableHead>
            <TableHead className='text-xs text-muted-foreground font-normal text-center'>
              <div className='flex items-center justify-center gap-1'>
                Mevcut Stok
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className='h-3 w-3 text-muted-foreground hover:text-foreground cursor-help' />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Depoda fiziksel olarak bulunan miktar</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
            <TableHead className='text-xs text-muted-foreground font-normal text-center'>
              <div className='flex items-center justify-center gap-1'>
                Tahmini Talep
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className='h-3 w-3 text-muted-foreground hover:text-foreground cursor-help' />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gelecek {period} gün için öngörülen satış adedi</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
            <TableHead className='text-xs text-muted-foreground font-normal text-center'>
              <div className='flex items-center justify-center gap-1'>
                Stok Değeri
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className='h-3 w-3 text-muted-foreground hover:text-foreground cursor-help' />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stoktaki ürünlerin toplam maliyet değeri</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
            <TableHead className='text-xs text-muted-foreground font-normal text-center'>
              <div className='flex items-center justify-center gap-1'>
                Stok Günü
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <TableRow
                key={`${item.sku}-${index}`}
                className='border-b border-border/50'
              >
                <TableCell className='font-medium text-center text-xs py-3'>
                  {item.sku}
                </TableCell>
                <TableCell className='text-center text-xs py-3 max-w-37.5 truncate'>
                  {item.productName}
                </TableCell>
                <TableCell className='text-center text-xs py-3'>
                  {item.stockLevel}
                </TableCell>
                <TableCell className='text-center text-xs py-3 text-emerald-600 font-medium'>
                  {item.forecastedDemand.toLocaleString('tr-TR')}
                </TableCell>
                <TableCell className='text-center text-xs py-3'>
                  ₺{item.stockValue.toLocaleString('tr-TR')}
                </TableCell>
                <TableCell
                  className={`text-center text-xs py-3 font-medium ${
                    item.daysOfCoverage < 7 ? 'text-red-500' : ''
                  }`}
                >
                  {item.daysOfCoverage}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className='h-24 text-center text-muted-foreground'
              >
                Veri bulunamadı.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base font-semibold'>
            Ürün Performansı
          </CardTitle>
          <Button
            variant='ghost'
            className='text-blue-500 hover:text-blue-700 text-sm h-8 px-2'
            onClick={() =>
              onSeeAll?.(activeTab === 'fastest' ? 'fast' : 'slow')
            }
          >
            Tümünü Gör
          </Button>
        </div>
        <CardDescription>
          En çok ve en az satan ürünlerin listesi
        </CardDescription>
      </CardHeader>
      <CardContent className='flex-1 min-h-0 flex flex-col'>
        <Tabs
          defaultValue='fastest'
          className='w-full flex-1 flex flex-col min-h-0'
          onValueChange={setActiveTab}
        >
          <TabsList className='mb-4 grid grid-cols-2 bg-slate-100/50'>
            <TabsTrigger value='fastest' className='text-xs'>
              En Hızlı Gidenler
            </TabsTrigger>
            <TabsTrigger value='slowest' className='text-xs'>
              En Yavaş / Satmayan
            </TabsTrigger>
          </TabsList>
          <TabsContent value='fastest' className='flex-1 mt-0 overflow-hidden'>
            {renderTable(fastMovingItems)}
          </TabsContent>
          <TabsContent value='slowest' className='flex-1 mt-0 overflow-hidden'>
            {renderTable(slowMovingItems)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
