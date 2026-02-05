'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { OverviewSection } from '@/components/dashboard/sections/overview';
import { ForecastingSection } from '@/components/dashboard/sections/forecasting';
import { DemandForecastingSection } from '@/components/dashboard/sections/demand-forecasting';
import { InventoryPlanningSection } from '@/components/dashboard/sections/inventory-planning';
import { SeasonalPlanningSection } from '@/components/dashboard/sections/seasonal-planning';
import { AdministrationSection } from '@/components/dashboard/sections/administration';
import { CategoryManagementSection } from '@/components/dashboard/sections/category-management';
import type { Section } from '@/types/types';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/hooks/use-auth';

// Mapping between Section (internal state) and DashboardSection (permissions)
const SECTION_TO_PERMISSION_MAP: Record<Section, DashboardSection> = {
  overview: 'overview',
  demand_forecasting: 'demand-forecasting',
  inventory_planning: 'inventory-planning',
  pricing_promotion: 'pricing-promotion',
  seasonal_planning: 'seasonal-planning',
  alert_center: 'alert-center',
  user_management: 'user-management',
  administration: 'administration',
  category_management: 'category-management',
};

const PERMISSION_TO_SECTION_MAP: Record<DashboardSection, Section> = {
  overview: 'overview',
  'demand-forecasting': 'demand_forecasting',
  'inventory-planning': 'inventory_planning',
  'pricing-promotion': 'pricing_promotion',
  'seasonal-planning': 'seasonal_planning',
  'alert-center': 'alert_center',
  'user-management': 'user_management',
  administration: 'administration',
  'category-management': 'category_management',
};

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canViewSection } = usePermissions();
  const { user, userRole, isLoading, profileError } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>(
    (searchParams.get('section') as Section) || 'overview',
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const handleSectionChange = (section: Section) => {
    if (section === 'alert_center') {
      router.push('/alert-center');
    } else {
      // Update URL without page reload
      router.push(`/dashboard?section=${section}`, { scroll: false });
    }

    // Check if user has permission to view this section
    const permissionSection = SECTION_TO_PERMISSION_MAP[section];
    if (!canViewSection(permissionSection)) {
      console.warn(`Access denied to section: ${section}`);
      return;
    }

    setActiveSection(section);
  };

  const renderSection = () => {
    // Check if user has access to current section
    const permissionSection = SECTION_TO_PERMISSION_MAP[activeSection];
    const hasAccess = canViewSection(permissionSection);

    if (isLoading) {
      return (
        <div className='flex items-center justify-center h-full'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-muted-foreground'>Loading dashboard...</p>
          </div>
        </div>
      );
    }

    // Show profile error if exists
    if (profileError && user && !userRole) {
      return (
        <div className='flex items-center justify-center h-full'>
          <div className='text-center max-w-md'>
            <div className='mb-4'>
              <svg
                className='mx-auto h-12 w-12 text-yellow-500'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
            </div>
            <h2 className='text-2xl font-semibold mb-2'>Profile Not Found</h2>
            <p className='text-muted-foreground mb-4'>
              {profileError.message ||
                'Your user profile could not be loaded. Please contact an administrator.'}
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Grant default access for authenticated users without a role (development mode)
    if (!hasAccess && user && !userRole) {
      // Fall through to render the section
    } else if (!hasAccess) {
      return (
        <div className='flex items-center justify-center h-full'>
          <div className='text-center max-w-md'>
            <div className='mb-4'>
              <svg
                className='mx-auto h-12 w-12 text-muted-foreground'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
            </div>
            <h2 className='text-2xl font-semibold mb-2'>Access Denied</h2>
            <p className='text-muted-foreground mb-4'>
              You don't have permission to view this section. Please contact
              your administrator if you believe this is an error.
            </p>
            {allowedSections && allowedSections.length > 0 && (
              <div className='text-sm text-muted-foreground'>
                <p>You have access to:</p>
                <ul className='list-disc list-inside mt-2'>
                  {allowedSections.map((section) => (
                    <li key={section} className='capitalize'>
                      {section.replace(/-/g, ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'demand_forecasting':
        return <DemandForecastingSection />;
      case 'inventory_planning':
        return <InventoryPlanningSection />;
      case 'pricing_promotion':
        return <ForecastingSection />;
      case 'seasonal_planning':
        return <SeasonalPlanningSection />;
      case 'administration':
        return <AdministrationSection />;
      case 'category_management':
        return <CategoryManagementSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className='flex min-h-screen bg-background'>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className='flex-1 flex flex-col transition-all duration-300 ease-out ml-[55px]'>
        <Header activeSection={activeSection} />
        <main className='flex-1 p-6 overflow-auto'>
          <div
            key={activeSection}
            className='animate-in fade-in slide-in-from-bottom-4 duration-500'
          >
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
