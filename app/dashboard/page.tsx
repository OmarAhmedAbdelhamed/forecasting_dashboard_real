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
import type { Section } from '@/types/types';

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get section from URL or default to 'overview'
  const initialSection = (searchParams.get('section') as Section) || 'overview';
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const handleSectionChange = (section: Section) => {
    if (section === 'alert_center') {
      router.push('/alert-center');
    } else {
      setActiveSection(section);
      // Update URL without page reload
      router.push(`/dashboard?section=${section}`, { scroll: false });
    }
  };

  const renderSection = () => {
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
