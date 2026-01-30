'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
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

import { RevenueChartData } from '@/data/mock-data';

interface RevenueTargetChartProps {
  data: RevenueChartData[];
}

export function RevenueTargetChart({ data }: RevenueTargetChartProps) {
  return (
    <Card className='col-span-2'>
      <CardHeader className='pb-0 pt-3 px-4'>
        <CardTitle className='text-base md:text-lg lg:text-xl font-semibold text-gray-800'>
          Ciro ve Hedef Karşılaştırması (Haftalık)
        </CardTitle>
        <CardDescription className='text-xs md:text-sm lg:text-base text-gray-500'>
          Haftalık gerçekleşen ciro ile hedeflenen cironun karşılaştırması.
        </CardDescription>
      </CardHeader>
      <CardContent className='pt-2'>
        <ResponsiveContainer width='100%' height={300}>
          <ComposedChart
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
              stroke='#6b7280'
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
              angle={-45}
              textAnchor='end'
              height={60}
              interval={0}
              dy={5}
            />
            <YAxis
              stroke='#6b7280'
              fontSize={13}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              domain={[0, 'auto']}
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
                const numValue =
                  typeof value === 'number' ? value : Number(value);
                const label = name === 'actual' ? 'Gerçekleşen' : 'Hedef';
                return [`₺${(numValue / 1000000).toFixed(2)}M`, label];
              }}
            />
            <Legend
              verticalAlign='top'
              align='right'
              wrapperStyle={{ paddingBottom: '10px', fontSize: '14px' }}
              iconType='plainline'
            />
            <Bar
              dataKey='actual'
              name='Gerçekleşen Ciro'
              fill='#3b82f6'
              radius={[0, 0, 0, 0]}
              barSize={24}
            />
            <Line
              type='linear'
              dataKey='plan'
              name='Hedef Ciro'
              stroke='#10b981'
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#10b981' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
