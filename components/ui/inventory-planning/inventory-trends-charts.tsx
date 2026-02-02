'use client';

import React from 'react';
import {
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import { CircleAlert } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shared/tooltip';
import { StockTrendPoint } from '@/types/inventory';

interface InventoryTrendsChartsProps {
  data: StockTrendPoint[];
}

export default function InventoryTrendsCharts({
  data,
}: InventoryTrendsChartsProps) {
  return (
    <Tabs defaultValue='trend' className='w-full flex-1 flex flex-col'>
      <TabsList className='grid w-full grid-cols-2 lg:w-100 mb-6 shrink-0'>
        <TabsTrigger value='trend' className='flex items-center gap-2 group'>
          Stok Seviyesi
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='p-1 -m-1 cursor-help outline-none'>
                <CircleAlert className='h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors' />
              </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={8} side='top' className='z-50'>
              <p className='max-w-xs'>
                Mevcut stok miktarının ve güvenlik stoğu limitinin zaman
                içindeki değişimi
              </p>
            </TooltipContent>
          </Tooltip>
        </TabsTrigger>

        <TabsTrigger value='forecast' className='flex items-center gap-2 group'>
          Tahmin vs Gerçekleşen
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='p-1 -m-1 cursor-help outline-none'>
                <CircleAlert className='h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors' />
              </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={8} side='top' className='z-50'>
              <p className='max-w-xs'>
                Gelecek dönem talep tahmini ile stok bakiyesinin karşılaştırmalı
                analizi
              </p>
            </TooltipContent>
          </Tooltip>
        </TabsTrigger>
      </TabsList>
      <div className='flex-1 relative'>
        <TabsContent
          value='trend'
          className='absolute inset-0 h-87.5 w-full bg-slate-50/50 rounded-xl p-4 mt-0 border border-slate-100 shadow-inner'
        >
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id='colorStock' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#3b82f6' stopOpacity={0.3} />
                  <stop offset='95%' stopColor='#3b82f6' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray='3 3'
                vertical={false}
                stroke='#e5e7eb'
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey='date'
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
                dy={10}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
                tickFormatter={(val) => val.toLocaleString()}
              />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '12px',
                }}
              />
              <Legend
                verticalAlign='top'
                height={36}
                iconType='circle'
                wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
              />
              <Area
                type='monotone'
                dataKey='actualStock'
                name='Mevcut Stok'
                stroke='#3b82f6'
                strokeWidth={2.5}
                fillOpacity={1}
                fill='url(#colorStock)'
              />
              <Area
                type='step'
                dataKey='safetyStock'
                name='Güvenlik Stoğu'
                stroke='#ef4444'
                fill='none'
                strokeDasharray='5 5'
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent
          value='forecast'
          className='absolute inset-0 h-87.5 w-full bg-slate-50/50 rounded-xl p-4 mt-0 border border-slate-100 shadow-inner'
        >
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray='3 3'
                vertical={false}
                stroke='#e5e7eb'
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey='date'
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
                dy={10}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
              />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '12px',
                }}
              />
              <Legend
                verticalAlign='top'
                height={36}
                iconType='circle'
                wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
              />
              <Line
                type='monotone'
                dataKey='forecastDemand'
                name='Tahmini Talep'
                stroke='#93c5fd'
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#93c5fd' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type='monotone'
                dataKey='actualStock'
                name='Stok Bakiyesi'
                stroke='#2563eb'
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </TabsContent>
      </div>
      <div className='h-87.5' /> {/* Spacer */}
    </Tabs>
  );
}
