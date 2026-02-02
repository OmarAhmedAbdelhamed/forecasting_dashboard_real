import { CircleAlert } from 'lucide-react';
import { Card } from '@/components/ui/shared/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

import { InventoryKPIs } from '@/types/inventory';

interface InventoryKpiSectionProps {
  data: InventoryKPIs;
}

// Mock sparkline data
const SPARKLINE_DATA = [
  { value: 10 },
  { value: 12 },
  { value: 8 },
  { value: 15 },
  { value: 10 },
  { value: 12 },
  { value: 18 },
  { value: 20 },
  { value: 14 },
  { value: 18 },
  { value: 25 },
  { value: 22 },
  { value: 30 },
  { value: 28 },
];

const SPARKLINE_DATA_2 = [
  { value: 25 },
  { value: 22 },
  { value: 24 },
  { value: 20 },
  { value: 18 },
  { value: 15 },
  { value: 18 },
  { value: 12 },
  { value: 10 },
  { value: 14 },
  { value: 8 },
  { value: 12 },
  { value: 15 },
  { value: 18 },
];

export function InventoryKpiSection({ data }: InventoryKpiSectionProps) {
  const kpiData = data;

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {/* 1. Total Inventory */}
      <Card className='py-2.5 px-6 border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300'>
        <div className='flex flex-col h-full justify-between gap-1.5'>
          <div className='flex items-center gap-1.5'>
            <span className='text-[13px] font-medium text-muted-foreground tracking-tight'>
              Toplam Envanter
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleAlert className='h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground/80 cursor-help transition-colors' />
              </TooltipTrigger>
              <TooltipContent side='top' className='bg-slate-900 text-white'>
                <p className='text-xs'>
                  Mevcut tüm ürünlerin toplam parasal değeri
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className='flex flex-col mt-auto'>
            <span className='text-2xl font-bold text-card-foreground tabular-nums leading-none tracking-tight'>
              ₺
              {kpiData.totalStockValue.toLocaleString('tr-TR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <p className='text-[11px] text-muted-foreground/80 font-medium mt-1'>
              {kpiData.totalInventoryItems} ürün
            </p>
          </div>
        </div>
      </Card>

      {/* 2. Excess Inventory */}
      <Card className='py-2.5 px-6 border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300'>
        <div className='flex flex-col h-full gap-1.5'>
          <div className='flex items-center gap-1.5'>
            <span className='text-[13px] font-medium text-muted-foreground tracking-tight'>
              Fazla Stok
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleAlert className='h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground/80 cursor-help transition-colors' />
              </TooltipTrigger>
              <TooltipContent side='top' className='bg-slate-900 text-white'>
                <p className='text-xs'>
                  İhtiyaç fazlası tutulan ürünlerin maliyet değeri
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className='flex flex-col'>
            <span className='text-2xl font-bold text-card-foreground tabular-nums leading-none tracking-tight'>
              ₺
              {kpiData.excessInventoryValue.toLocaleString('tr-TR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <p className='text-[11px] text-muted-foreground/80 font-medium mt-1'>
              {kpiData.excessInventoryItems} ürün
            </p>
          </div>
          <div className='h-6 w-full mt-1'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={SPARKLINE_DATA}>
                <defs>
                  <linearGradient id='grad1' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#628BB1' stopOpacity={0.2} />
                    <stop offset='95%' stopColor='#628BB1' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type='monotone'
                  dataKey='value'
                  stroke='#628BB1'
                  fill='url(#grad1)'
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* 3. Stock-out Risk */}
      <Card className='py-2.5 px-6 border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300'>
        <div className='flex flex-col h-full gap-1.5'>
          <div className='flex items-center gap-1.5'>
            <span className='text-[13px] font-medium text-muted-foreground tracking-tight'>
              Stok Kaybı Riski
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleAlert className='h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground/80 cursor-help transition-colors' />
              </TooltipTrigger>
              <TooltipContent side='top' className='bg-slate-900 text-white'>
                <p className='text-xs'>
                  Tükenmek üzere olan ürünlerin tahmini satış kaybı değeri
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className='flex flex-col'>
            <span className='text-2xl font-bold text-card-foreground tabular-nums leading-none tracking-tight'>
              ₺
              {kpiData.stockOutRiskValue.toLocaleString('tr-TR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <p className='text-[11px] text-muted-foreground/80 font-medium mt-1'>
              {kpiData.stockOutRiskItems} ürün
            </p>
          </div>
          <div className='h-6 w-full mt-1'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={SPARKLINE_DATA_2}>
                <defs>
                  <linearGradient id='grad2' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#2dd4bf' stopOpacity={0.2} />
                    <stop offset='95%' stopColor='#2dd4bf' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type='monotone'
                  dataKey='value'
                  stroke='#2dd4bf'
                  fill='url(#grad2)'
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* 4. Never Sold */}
      <Card className='py-2.5 px-6 border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300'>
        <div className='flex flex-col h-full justify-between gap-1.5'>
          <div className='flex items-center gap-1.5'>
            <span className='text-[13px] font-medium text-muted-foreground tracking-tight'>
              Hiç Satılmayanlar
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleAlert className='h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground/80 cursor-help transition-colors' />
              </TooltipTrigger>
              <TooltipContent side='top' className='bg-slate-900 text-white'>
                <p className='text-xs'>Son 30 günlük ortalama satış adedi</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className='flex flex-col mt-auto'>
            <span className='text-2xl font-bold text-card-foreground tabular-nums leading-none tracking-tight'>
              ₺
              {kpiData.neverSoldValue.toLocaleString('tr-TR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <p className='text-[11px] text-muted-foreground/80 font-medium mt-1'>
              {kpiData.neverSoldItems} ürün
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
