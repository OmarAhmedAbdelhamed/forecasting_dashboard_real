'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCenterLayout } from '@/components/alert-center/alert-center-layout';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import type { Section } from '@/types/types';

export default function AlertCenterPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Handle navigation back to dashboard sections
  const handleSectionChange = (section: Section) => {
    if (section !== 'alert_center') {
      router.push(`/dashboard?section=${section}`);
    }
  };

  return (
    <div className='flex min-h-screen bg-background'>
      <Sidebar
        activeSection='alert_center'
        onSectionChange={handleSectionChange}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className='flex-1 flex flex-col transition-all duration-300 ease-out ml-[55px]'>
        <Header activeSection='alert_center' />
        <main className='flex-1 p-6 overflow-auto'>
          <div className='animate-in fade-in slide-in-from-bottom-4 duration-500'>
            <AlertCenterLayout />
          </div>
        </main>
      </div>
    </div>
  );
}
