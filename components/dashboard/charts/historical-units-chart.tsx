'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';

// Current date: 2026-01-28 = Week 4
const CURRENT_WEEK = 4;

import { HistoricalChartData } from '@/data/mock-data';

interface HistoricalUnitsChartProps {
  data: HistoricalChartData[];
}

export function HistoricalUnitsChart({ data }: HistoricalUnitsChartProps) {
  return (
    <Card className='col-span-1'>
      <CardHeader className='pb-0 pt-3 px-4'>
        <CardTitle className='text-base md:text-lg lg:text-xl font-semibold text-gray-800'>
          Geçmiş Satışlar (Haftalık)
        </CardTitle>
        <CardDescription className='text-xs md:text-sm lg:text-base text-gray-500'>
          Mevcut tahminler ve geçmiş yılların satış karşılaştırması. (Hafta{' '}
          {CURRENT_WEEK})
        </CardDescription>
      </CardHeader>
      <CardContent className='pt-2'>
        <ResponsiveContainer width='100%' height={300}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, bottom: 60, left: 10 }}
          >
            <CartesianGrid
              strokeDasharray='0'
              vertical={false}
              stroke='#e5e7eb'
            />
            <XAxis
              dataKey='week'
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={false}
              interval={3}
              angle={-45}
              textAnchor='end'
              height={60}
              dy={5}
            />
            <YAxis
              tick={{ fontSize: 13, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              domain={['auto', 'auto']}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                padding: '8px 12px',
                fontSize: '13px',
              }}
              labelStyle={{
                fontWeight: 600,
                marginBottom: '4px',
                color: '#374151',
              }}
              formatter={(value, name) => {
                if (value === null || value === undefined) {return ['—', ''];}
                const numValue =
                  typeof value === 'number' ? value : Number(value);
                const yearLabel =
                  name === 'y2024'
                    ? '2024'
                    : name === 'y2025'
                      ? '2025'
                      : '2026';
                return [numValue.toLocaleString(), yearLabel];
              }}
            />
            <Legend
              verticalAlign='top'
              align='right'
              wrapperStyle={{ paddingBottom: '10px', fontSize: '14px' }}
              iconType='plainline'
              formatter={(value) => {
                if (value === 'y2024') {return '2024';}
                if (value === 'y2025') {return '2025';}
                return '2026';
              }}
            />
            <Line
              type='monotone'
              dataKey='y2024'
              stroke='#9ca3af'
              strokeWidth={2}
              dot={{ r: 2, fill: '#9ca3af' }}
              activeDot={{ r: 4 }}
              connectNulls
            />
            <Line
              type='monotone'
              dataKey='y2025'
              stroke='#374151'
              strokeWidth={2}
              dot={{ r: 2, fill: '#374151' }}
              activeDot={{ r: 4 }}
              connectNulls
            />
            <Line
              type='monotone'
              dataKey='y2026'
              stroke='#3b82f6'
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
