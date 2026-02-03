'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  secondaryValue?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  icon: LucideIcon;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  secondaryValue,
  change,
  changeType,
  subtext,
  icon: Icon,
  delay = 0,
}: MetricCardProps) {
  return (
    <div
      className='group relative rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden border-border p-0 hover:border-accent/50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 h-full max-w-125'
      style={{ animationDelay: `${delay * 100}ms`, animationFillMode: 'both' }}
    >
      {/* Subtle gradient on hover */}
      <div className='absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

      <div className='relative flex flex-col justify-between h-full'>
        <div className='flex flex-row items-center justify-between pb-0 pt-2 2xl:pt-3 px-3 2xl:px-3'>
          <span className='text-xs 2xl:text-sm font-medium text-muted-foreground truncate'>
            {title}
          </span>
          <div className='w-6 h-6 2xl:w-8 2xl:h-8 rounded-md bg-accent/10 flex items-center justify-center shrink-0 transition-colors duration-300'>
            <Icon className='w-3.5 h-3.5 2xl:w-5 2xl:h-5 text-accent transition-colors duration-300' />
          </div>
        </div>

        <div className='px-3 2xl:px-3 pb-2 2xl:pb-3 pt-0'>
          <div className='flex items-end gap-2'>
            <span className='text-lg md:text-xl 2xl:text-2xl font-bold text-foreground tracking-tight'>
              {value}
            </span>
            {change && (
              <div
                className={cn(
                  'flex items-center gap-0.5 text-xs 2xl:text-sm font-medium mb-0.5',
                  changeType === 'positive' && 'text-success',
                  changeType === 'negative' && 'text-destructive',
                  changeType === 'neutral' && 'text-muted-foreground',
                )}
              >
                {changeType === 'positive' && (
                  <TrendingUp className='w-2 h-2 2xl:w-3 2xl:h-3' />
                )}
                {changeType === 'negative' && (
                  <TrendingDown className='w-2 h-2 2xl:w-3 2xl:h-3' />
                )}
                <span>{change}</span>
              </div>
            )}
          </div>
          {secondaryValue && (
            <p className='text-xs md:text-sm 2xl:text-base font-semibold text-muted-foreground mt-0.5'>
              {secondaryValue}
            </p>
          )}
          {subtext && (
            <p className='text-xs md:text-sm 2xl:text-base text-muted-foreground mt-0.5'>
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
