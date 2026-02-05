'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCenterLayout } from '@/components/alert-center/alert-center-layout';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Spinner } from '@/components/ui/shared/spinner';
import type { Section } from '@/types/types';
import { usePermissions } from '@/hooks/use-permissions';
import type { DataScope } from '@/types/permissions';

export default function AlertCenterPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const {
    canViewSection,
    hasPermission,
    dataScope,
    isLoading,
    userRole,
  } = usePermissions();

  // Check if user can access alert center
  const canAccessAlertCenter = canViewSection('alert-center');
  const canResolveAlerts = hasPermission('alert_center', 'resolve');

  // Redirect to dashboard if user doesn't have access
  useEffect(() => {
    if (!isLoading && !canAccessAlertCenter) {
      router.push('/dashboard');
    }
  }, [isLoading, canAccessAlertCenter, router]);

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className='flex min-h-screen bg-background items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <Spinner className='h-8 w-8' />
          <p className='text-sm text-muted-foreground'>Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render if user doesn't have access (redirect will happen)
  if (!canAccessAlertCenter) {
    return null;
  }

  // Handle navigation back to dashboard sections
  const handleSectionChange = (section: Section) => {
    if (section !== 'alert_center') {
      router.push('/dashboard');
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
            <AlertCenterLayout
              dataScope={dataScope}
              canResolveAlerts={canResolveAlerts}
              userRole={userRole}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
