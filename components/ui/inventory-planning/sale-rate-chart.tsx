'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/shared/card';
import { useMemo, useState } from 'react';
import { InventoryItem } from '@/types/inventory';

interface CategoryDistributionChartProps {
  items: InventoryItem[];
  selectedCategories?: string[];
  onCategoryClick?: (categoryValue: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  gida: '#10b981', // Green - Food
  icecek: '#06b6d4', // Cyan - Drinks
  temizlik: '#3b82f6', // Blue - Cleaning
  kisisel_bakim: '#ec4899', // Pink - Personal Care
  elektronik: '#8b5cf6', // Purple - Electronics
};

const CATEGORY_LABELS: Record<string, string> = {
  gida: 'Gıda',
  icecek: 'İçecek',
  temizlik: 'Temizlik',
  kisisel_bakim: 'Kişisel Bakım',
  elektronik: 'Elektronik',
};

interface CategoryData {
  name: string;
  value: number;
  categoryValue: string;
  color: string;
  percentage: number;
}

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  percent: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: CategoryData }[];
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload?.length) {
    const data = payload[0].payload;
    return (
      <div className='bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200'>
        <p className='font-semibold text-sm text-gray-900'>{data.name}</p>
        <p className='text-xs text-gray-600'>
          {data.value} ürün ({data.percentage.toFixed(1)}%)
        </p>
        <p className='text-xs text-indigo-600 mt-1'>Tıklayarak filtrele</p>
      </div>
    );
  }
  return null;
};

export function CategoryDistributionChart({
  items,
  selectedCategories = [],
  onCategoryClick,
}: CategoryDistributionChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};

    // Initialize all categories with 0
    Object.keys(CATEGORY_LABELS).forEach((key) => {
      categoryCounts[key] = 0;
    });

    // Count products per category
    // Note: item.category is already in lowercase format (e.g., "gida", "temizlik")
    items.forEach((item) => {
      const categoryKey = item.category.toLowerCase();
      if (categoryCounts[categoryKey] !== undefined) {
        categoryCounts[categoryKey]++;
      }
    });

    const total = items.length || 1;

    const data: CategoryData[] = Object.entries(categoryCounts).map(
      ([key, count]) => ({
        name: CATEGORY_LABELS[key] || key,
        value: count,
        categoryValue: key,
        color: CATEGORY_COLORS[key] || '#94a3b8',
        percentage: (count / total) * 100,
      }),
    );

    // Filter out categories with 0 products for cleaner visualization
    return data.filter((d) => d.value > 0);
  }, [items]);

  const totalProducts = items.length;

  const handleClick = (data: CategoryData) => {
    if (onCategoryClick) {
      onCategoryClick(data.categoryValue);
    }
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
  }: CustomLabelProps) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) {return null;} // Don't show label for very small slices

    return (
      <text
        x={x}
        y={y}
        fill='#6b7280'
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline='central'
        fontSize={11}
        fontWeight={500}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const renderCenterLabel = () => {
    return (
      <text
        x='50%'
        y='50%'
        textAnchor='middle'
        dominantBaseline='middle'
        className='pointer-events-none'
      >
        <tspan
          x='50%'
          dy='-0.5em'
          fontSize={12}
          fill='#9ca3af'
          fontWeight={500}
        >
          Toplam
        </tspan>
        <tspan x='50%' dy='1.4em' fontSize={24} fill='#1f2937' fontWeight={700}>
          {totalProducts}
        </tspan>
        <tspan x='50%' dy='1.2em' fontSize={12} fill='#9ca3af' fontWeight={500}>
          Ürün
        </tspan>
      </text>
    );
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-semibold'>
          Kategori Dağılımı
        </CardTitle>
        <CardDescription>Tüm ürünlerin kategori bazlı dağılımı</CardDescription>
      </CardHeader>
      <CardContent className='flex-1 min-h-75 p-0 pb-4 relative'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie
              data={chartData}
              cx='50%'
              cy='50%'
              labelLine={false}
              label={renderCustomLabel}
              outerRadius='85%'
              innerRadius='60%'
              dataKey='value'
              onMouseEnter={(_, index) => { setActiveIndex(index); }}
              onMouseLeave={() => { setActiveIndex(null); }}
              onClick={(data) => { handleClick(data); }}
              style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
            >
              {chartData.map((entry, index) => {
                // Check if this category is selected
                // selectedCategories contains keys like "ist_kadikoy_gida"
                // entry.categoryValue is just "gida"
                const isSelected = selectedCategories.includes(
                  entry.categoryValue,
                );
                const isActive = activeIndex === index;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={isSelected ? entry.color : 'white'}
                    strokeWidth={isSelected ? 3 : 2}
                    opacity={isActive ? 0.8 : 1}
                    style={{
                      filter: isSelected
                        ? 'brightness(0.9) drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                        : 'none',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {renderCenterLabel()}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Export with old name for backward compatibility
export { CategoryDistributionChart as SaleRateChart };
