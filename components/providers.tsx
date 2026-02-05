'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { CustomListsProvider } from '@/contexts/custom-lists-context';
import { TooltipProvider } from '@/components/ui/shared/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CustomListsProvider>
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </CustomListsProvider>
    </AuthProvider>
  );
}
