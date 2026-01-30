'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // Show loading spinner while checking auth or if not authenticated (redirecting)
  if (isLoading || !user) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-background'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='h-8 w-8 animate-spin text-[#FFB840]' />
          <p className='text-sm text-muted-foreground animate-pulse'>
            Yetki kontrol ediliyor...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
