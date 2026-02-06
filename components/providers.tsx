'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/use-auth';
import { CustomListsProvider } from '@/contexts/custom-lists-context';
import { TooltipProvider } from '@/components/ui/shared/tooltip';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CustomListsProvider>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </CustomListsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
