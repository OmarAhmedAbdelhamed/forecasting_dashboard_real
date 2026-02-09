'use client';

import { useEffect, useMemo, useState } from 'react';
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

import { HistoricalChartData } from '@/services/types/api';

interface HistoricalUnitsChartProps {
  data: HistoricalChartData[];
  currentWeek?: number;
}

export function HistoricalUnitsChart({
  data,
  currentWeek,
}: HistoricalUnitsChartProps) {
  const [screenWidth, setScreenWidth] = useState<number>(1920);

  useEffect(() => {
    const updateScreenWidth = () => setScreenWidth(window.innerWidth);
    updateScreenWidth();
    window.addEventListener('resize', updateScreenWidth);
    return () => window.removeEventListener('resize', updateScreenWidth);
  }, []);

  const xAxisInterval = useMemo(() => {
    if (screenWidth >= 2100) {return 0;} // show every week
    if (screenWidth >= 1280) {return 1;} // skip 1 week
    return 3; // skip 3 weeks
  }, [screenWidth]);

  const monthNames = [
    'ocak',
    'subat',
    'mart',
    'nisan',
    'mayis',
    'haziran',
    'temmuz',
    'agustos',
    'eylul',
    'ekim',
    'kasim',
    'aralik',
  ];

  const getWeekNumber = (weekLabel: string) => {
    const match = weekLabel.match(/\d+/);
    return match ? Number(match[0]) : NaN;
  };

  const getWeekEndDate = (weekNumber: number, year: number) => {
    // ISO week 1 starts on the week containing Jan 4. We display the week-end (Sunday).
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() === 0 ? 7 : jan4.getDay();
    const firstIsoMonday = new Date(jan4);
    firstIsoMonday.setDate(jan4.getDate() - jan4Day + 1);

    const weekEnd = new Date(firstIsoMonday);
    weekEnd.setDate(firstIsoMonday.getDate() + (weekNumber - 1) * 7 + 6);
    return weekEnd;
  };

  const formatWeekTick = (weekLabel: string) => {
    const weekNumber = getWeekNumber(weekLabel);
    if (!weekNumber || Number.isNaN(weekNumber)) return weekLabel;

    const year = new Date().getFullYear();
    const weekEndDate = getWeekEndDate(weekNumber, year);
    const day = weekEndDate.getDate();
    const month = monthNames[weekEndDate.getMonth()];
    return `H${weekNumber} (${day} ${month})`;
  };

  const formatYAxisTick = (value: number) => {
    if (value >= 1_000_000) {
      const millions = value / 1_000_000;
      return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toLocaleString('tr-TR');
  };

  return (
    <Card className='col-span-1'>
      <CardHeader className='pb-0 pt-3 px-4'>
        <CardTitle className='text-base md:text-lg lg:text-xl font-semibold text-gray-800'>
          Geçmiş Satışlar (Haftalık)
        </CardTitle>
        <CardDescription className='text-xs md:text-sm lg:text-base text-gray-500'>
          Mevcut tahminler ve geçmiş yılların satış karşılaştırması. (Hafta{' '}
          {currentWeek ?? 4})
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
              interval={xAxisInterval}
              tickFormatter={formatWeekTick}
              angle={-45}
              textAnchor='end'
              height={60}
              dy={5}
            />
            <YAxis
              tick={{ fontSize: 13, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxisTick}
              domain={['auto', 'auto']}
              width={60}
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
                if (value === null || value === undefined) {
                  return ['-', ''];
                }
                const numValue =
                  typeof value === 'number' ? value : Number(value);
                const yearLabel =
                  name === 'y2024'
                    ? '2024'
                    : name === 'y2025'
                      ? '2025'
                      : '2026';
                return [numValue.toLocaleString('tr-TR'), yearLabel];
              }}
              labelFormatter={(label) => formatWeekTick(String(label))}
            />
            <Legend
              verticalAlign='top'
              align='right'
              wrapperStyle={{ paddingBottom: '10px', fontSize: '14px' }}
              iconType='plainline'
              formatter={(value) => {
                if (value === 'y2024') {
                  return '2024';
                }
                if (value === 'y2025') {
                  return '2025';
                }
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
