'use client';

import { FinancialOverviewSection } from '@/components/dashboard/sections/financial-overview';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/hooks/use-auth';

export default function FinancialOverviewPage() {
  const { canViewSection, isLoading, userRole } = usePermissions();
  const { user } = useAuth();

  // Check access
  const hasAccess = canViewSection('financial-overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Erişim Reddedildi</h2>
          <p className="text-muted-foreground">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </p>
        </div>
      </div>
    );
  }

  return <FinancialOverviewSection />;
}
