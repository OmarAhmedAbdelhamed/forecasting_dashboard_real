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
  ReferenceLine,
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

// Weekly data with realistic variability - comparing 2024, 2025, and 2026 forecast
const data = [
  { week: 'Wk 1', y2024: 18200, y2025: 20100, y2026: 21800 },
  { week: 'Wk 2', y2024: 19100, y2025: 21400, y2026: 22500 },
  { week: 'Wk 3', y2024: 18700, y2025: 20800, y2026: 22100 },
  { week: 'Wk 4', y2024: 19500, y2025: 22100, y2026: 22900 }, // Current week
  { week: 'Wk 5', y2024: 20200, y2025: 21800, y2026: null },
  { week: 'Wk 6', y2024: 19800, y2025: 22500, y2026: null },
  { week: 'Wk 7', y2024: 21100, y2025: 23200, y2026: null },
  { week: 'Wk 8', y2024: 20400, y2025: 22800, y2026: null },
  { week: 'Wk 9', y2024: 21800, y2025: 24100, y2026: null },
  { week: 'Wk 10', y2024: 22500, y2025: 23700, y2026: null },
  { week: 'Wk 11', y2024: 21900, y2025: 24800, y2026: null },
  { week: 'Wk 12', y2024: 23200, y2025: 25200, y2026: null },
  { week: 'Wk 13', y2024: 22600, y2025: 24600, y2026: null },
  { week: 'Wk 14', y2024: 24100, y2025: 26100, y2026: null },
  { week: 'Wk 15', y2024: 23500, y2025: 25800, y2026: null },
  { week: 'Wk 16', y2024: 24800, y2025: 27200, y2026: null },
  { week: 'Wk 17', y2024: 25200, y2025: 26800, y2026: null },
  { week: 'Wk 18', y2024: 24600, y2025: 28100, y2026: null },
  { week: 'Wk 19', y2024: 26100, y2025: 27500, y2026: null },
  { week: 'Wk 20', y2024: 25400, y2025: 28800, y2026: null },
  { week: 'Wk 21', y2024: 26800, y2025: 29200, y2026: null },
  { week: 'Wk 22', y2024: 25900, y2025: 28500, y2026: null },
  { week: 'Wk 23', y2024: 24200, y2025: 27100, y2026: null },
  { week: 'Wk 24', y2024: 23100, y2025: 25800, y2026: null },
  { week: 'Wk 25', y2024: 22400, y2025: 24200, y2026: null },
  { week: 'Wk 26', y2024: 21800, y2025: 23500, y2026: null },
  { week: 'Wk 27', y2024: 21100, y2025: 22800, y2026: null },
  { week: 'Wk 28', y2024: 20500, y2025: 22100, y2026: null },
  { week: 'Wk 29', y2024: 19800, y2025: 21500, y2026: null },
  { week: 'Wk 30', y2024: 20200, y2025: 20800, y2026: null },
  { week: 'Wk 31', y2024: 19400, y2025: 21200, y2026: null },
  { week: 'Wk 32', y2024: 18900, y2025: 20500, y2026: null },
  { week: 'Wk 33', y2024: 19200, y2025: 19800, y2026: null },
  { week: 'Wk 34', y2024: 18500, y2025: 20200, y2026: null },
  { week: 'Wk 35', y2024: 17800, y2025: 19500, y2026: null },
  { week: 'Wk 36', y2024: 18200, y2025: 18900, y2026: null },
  { week: 'Wk 37', y2024: 17500, y2025: 19200, y2026: null },
  { week: 'Wk 38', y2024: 17900, y2025: 18600, y2026: null },
  { week: 'Wk 39', y2024: 18400, y2025: 19100, y2026: null },
  { week: 'Wk 40', y2024: 17800, y2025: 18800, y2026: null },
  { week: 'Wk 41', y2024: 18600, y2025: 19400, y2026: null },
  { week: 'Wk 42', y2024: 19100, y2025: 20100, y2026: null },
  { week: 'Wk 43', y2024: 18500, y2025: 19800, y2026: null },
  { week: 'Wk 44', y2024: 19300, y2025: 20500, y2026: null },
  { week: 'Wk 45', y2024: 18800, y2025: 19900, y2026: null },
  { week: 'Wk 46', y2024: 19600, y2025: 20800, y2026: null },
  { week: 'Wk 47', y2024: 20200, y2025: 21400, y2026: null },
  { week: 'Wk 48', y2024: 19500, y2025: 20900, y2026: null },
  { week: 'Wk 49', y2024: 18900, y2025: 20200, y2026: null },
  { week: 'Wk 50', y2024: 19400, y2025: 19600, y2026: null },
  { week: 'Wk 51', y2024: 18200, y2025: 19100, y2026: null },
  { week: 'Wk 52', y2024: 17800, y2025: 18500, y2026: null },
];

export function HistoricalUnitsChart() {
  return (
    <Card className='col-span-1'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-lg md:text-xl lg:text-2xl font-semibold text-gray-800'>
          Geçmiş Satışlar (Haftalık)
        </CardTitle>
        <CardDescription className='text-sm md:text-base lg:text-lg text-gray-500'>
          Mevcut tahminler ve geçmiş yılların satış karşılaştırması. (Hafta{' '}
          {CURRENT_WEEK})
        </CardDescription>
      </CardHeader>
      <CardContent className='pt-4'>
        <ResponsiveContainer width='100%' height={400}>
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
              domain={[15000, 32000]}
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
                if (value === null || value === undefined) return ['—', ''];
                const numValue =
                  typeof value === 'number' ? value : Number(value);
                const yearLabel =
                  name === 'y2024'
                    ? '2024'
                    : name === 'y2025'
                      ? '2025'
                      : '2026';
                return [`${numValue.toLocaleString()}`, yearLabel];
              }}
            />
            <Legend
              verticalAlign='top'
              align='right'
              wrapperStyle={{ paddingBottom: '10px', fontSize: '14px' }}
              iconType='plainline'
              formatter={(value) => {
                if (value === 'y2024') return '2024';
                if (value === 'y2025') return '2025';
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
