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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { AlertCircle } from 'lucide-react';

const risks = [
  {
    sku: '30000332',
    name: 'Yudum Ayçiçek Yağı 5L',
    stock: 120,
    forecast: 450,
    days: '2 Gün',
    action: 'Acil Sipariş',
  },
  {
    sku: '30045925',
    name: 'Lipton Yellow Label 1kg',
    stock: 85,
    forecast: 150,
    days: '4 Gün',
    action: 'Transfer',
  },
  {
    sku: '30431002',
    name: 'Solo Tuvalet Kağıdı 32li',
    stock: 200,
    forecast: 240,
    days: '6 Gün',
    action: 'İzle',
  },
];

export function StockRiskTable() {
  return (
    <Card className='border-red-200 bg-red-50/20 h-full flex flex-col'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-red-600'>
          <AlertCircle className='h-5 w-5' />
          Kritik Stok Uyarıları
        </CardTitle>
        <CardDescription>7 günden az stoku kalan ürünler.</CardDescription>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün Adı</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Kalan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.map((item) => (
              <TableRow
                key={item.sku}
                className='cursor-pointer hover:bg-red-100/50 transition-colors'
                onClick={() => console.log('Navigate to', item.sku)}
              >
                <TableCell className='font-medium p-3'>
                  <div className='flex flex-col'>
                    <span className='text-sm'>{item.name}</span>
                    <span className='text-[10px] text-muted-foreground'>
                      {item.sku}
                    </span>
                  </div>
                </TableCell>
                <TableCell className='text-red-600 font-bold p-3'>
                  {item.stock}
                </TableCell>
                <TableCell className='p-3'>
                  <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700'>
                    {item.days}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
