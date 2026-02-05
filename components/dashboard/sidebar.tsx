'use client';

import React from 'react';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Section } from '@/types/types';
import type { DashboardSection } from '@/types/permissions';
import { usePermissions } from '@/hooks/use-permissions';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Tag,
  CalendarRange,
  AlertTriangle,
  Shield,
  Settings,
  FolderTree,
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
  { name: 'Uyarı Merkezi', href: 'alert_center', icon: AlertTriangle },
];

// Mapping from Section type to DashboardSection type
const sectionToDashboardSection: Record<Section, DashboardSection> = {
  overview: 'overview',
  demand_forecasting: 'demand-forecasting',
  inventory_planning: 'inventory-planning',
  pricing_promotion: 'pricing-promotion',
  seasonal_planning: 'seasonal-planning',
  alert_center: 'alert-center',
  user_management: 'user-management',
  administration: 'administration',
  category_management: 'category-management',
  financial_overview: 'financial-overview',
  operational_overview: 'operational-overview',
};

// Helper function to format role name for display
function formatRoleName(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function Sidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const { allowedSections, userRole, canViewSection, isLoading } = usePermissions();

  // Filter navigation based on user's allowed sections
  const filteredNavigation = React.useMemo(() => {
    if (isLoading) {return [];}

    return navigation.filter((item) => {
      const dashboardSection = sectionToDashboardSection[item.href];
      return canViewSection(dashboardSection);
    });
  }, [allowedSections, canViewSection, isLoading]);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out flex flex-col overflow-hidden',
        collapsed ? 'w-13.75' : 'w-60 lg:w-70 shadow-2xl',
      )}
      onMouseEnter={() => { onCollapsedChange(false); }}
      onMouseLeave={() => { onCollapsedChange(true); }}
    >
      {/* Logo */}
      <div className='h-14 flex items-center border-b border-sidebar-border overflow-hidden'>
        {/* Fixed-width logo container for centering when collapsed */}
        <div className='w-16 shrink-0 flex items-center justify-center'>
          <div className='w-8 h-8 rounded-lg flex items-center justify-center bg-white overflow-hidden p-1'>
            <Image
              src='/bee2_ai_logo.svg'
              alt='Bee2 AI'
              width={32}
              height={32}
              className='w-full h-full object-contain'
              priority
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
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.href;

          return (
            <button
              key={item.href}
              onClick={() => { onSectionChange(item.href); }}
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

      {/* Role Badge Footer */}
      {userRole && !isLoading && (
        <div className='border-t border-sidebar-border p-3 overflow-hidden'>
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent/10 border border-accent/20',
              'transition-all duration-300',
            )}
          >
            <div className='w-5 h-5 shrink-0 flex items-center justify-center'>
              <Shield className='w-4 h-4 text-accent' />
            </div>
            <div
              className={cn(
                'flex flex-col transition-opacity duration-300',
                collapsed ? 'opacity-0' : 'opacity-100',
              )}
            >
              <span className='text-[10px] text-muted-foreground uppercase tracking-wider font-medium'>
                Role
              </span>
              <span className='text-xs font-semibold text-accent'>{formatRoleName(userRole)}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
