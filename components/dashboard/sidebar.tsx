'use client';

import React from 'react';

import { cn } from '@/lib/utils';
import type { Section } from '@/types/types';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Tag,
  CalendarRange,
  AlertTriangle,
} from 'lucide-react';

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const navigation: { name: string; href: Section; icon: React.ElementType }[] = [
  { name: 'Genel Bakış', href: 'overview', icon: LayoutDashboard },
  { name: 'Talep Tahminleme', href: 'demand_forecasting', icon: TrendingUp },
  { name: 'Envanter Planlama', href: 'inventory_planning', icon: Package },
  { name: 'Fiyatlandırma & Promosyon', href: 'pricing_promotion', icon: Tag },
  { name: 'Sezonluk Planlama', href: 'seasonal_planning', icon: CalendarRange },
  { name: 'Alert Center', href: 'alert_center', icon: AlertTriangle },
];

export function Sidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out flex flex-col overflow-hidden',
        collapsed ? 'w-[55px]' : 'w-[240px] lg:w-[280px] shadow-2xl',
      )}
      onMouseEnter={() => onCollapsedChange(false)}
      onMouseLeave={() => onCollapsedChange(true)}
    >
      {/* Logo */}
      <div className='h-14 flex items-center border-b border-sidebar-border overflow-hidden'>
        {/* Fixed-width logo container for centering when collapsed */}
        <div className='w-[64px] shrink-0 flex items-center justify-center'>
          <div className='w-8 h-8 rounded-lg flex items-center justify-center bg-white overflow-hidden p-1'>
            <img
              src='/bee2_ai_logo.svg'
              alt='Bee2 AI'
              className='w-full h-full object-contain'
            />
          </div>
        </div>
        {/* Text that fades out - positioned after the fixed container */}
        <span
          className={cn(
            'font-semibold text-base lg:text-lg text-sidebar-foreground whitespace-nowrap transition-opacity duration-300',
            collapsed ? 'opacity-0' : 'opacity-100',
          )}
        >
          Bee2 AI Forecasting
        </span>
      </div>

      {/* Navigation */}
      <nav className='flex-1 py-4 px-1 space-y-1 overflow-hidden'>
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.href;

          return (
            <button
              key={item.href}
              onClick={() => onSectionChange(item.href)}
              className={cn(
                'w-full flex items-center py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors duration-200 group relative',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
            >
              {/* Active indicator */}
              <span
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent transition-opacity duration-300',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
              {/* Fixed-width icon container for centering */}
              <div className='w-12 shrink-0 flex items-center justify-center'>
                <Icon
                  className={cn(
                    'w-4 h-4 lg:w-5 lg:h-5 transition-transform duration-200',
                    isActive ? 'text-accent' : 'group-hover:scale-110',
                  )}
                />
              </div>
              {/* Text with opacity transition */}
              <span
                className={cn(
                  'whitespace-nowrap transition-opacity duration-300',
                  collapsed ? 'opacity-0' : 'opacity-100',
                )}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
