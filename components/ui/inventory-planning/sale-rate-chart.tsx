'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { useMemo } from 'react';
import { InventoryItem } from '@/types/inventory';

interface SaleRateChartProps {
  items: InventoryItem[];
}

export function SaleRateChart({ items = [] }: SaleRateChartProps) {
  const chartData = useMemo(() => {
    let fast = 0;
    let medium = 0;
    let slow = 0;

    items.forEach((item) => {
      const dailySales = item.forecastedDemand / 30;
      if (dailySales > 20) fast++;
      else if (dailySales > 5) medium++;
      else slow++;
    });

    return [
      { name: 'Hızlı Giden', value: fast, color: '#bbf7d0' }, // Green-200
      { name: 'Orta', value: medium, color: '#bfdbfe' }, // Blue-200
      { name: 'Yavaş Giden', value: slow, color: '#bae6fd' }, // Cyan-200
    ];
  }, [items]);

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-semibold'>
          Satış Hızı Dağılımı
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 min-h-75 p-0 pb-4'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            layout='vertical'
          >
            <CartesianGrid
              strokeDasharray='3 3'
              horizontal={true}
              vertical={false}
              stroke='#e5e7eb'
            />
            <XAxis
              type='number'
              axisLine={false}
              tickLine={false}
              fontSize={12}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              dataKey='name'
              type='category'
              axisLine={false}
              tickLine={false}
              fontSize={12}
              width={100}
              tick={{ fill: '#6b7280' }}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey='value' radius={[0, 4, 4, 0]} barSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
