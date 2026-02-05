'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { DashboardProvider } from '@/contexts/dashboard-context';
import { ChatbotButton } from '@/components/chatbot/chatbot-button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, isLoading, profileLoading, profileError, clearProfileError, retryFetchProfile } = useAuth();
  const router = useRouter();

  // Generate unique error ID for support tracking
  const errorId = useMemo(() => {
    return `ERR_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }, []);

  useEffect(() => {
    // Only redirect to login if there's no user AND no error
    // (if there's an error, we show the error UI instead)
    if (!isLoading && !profileLoading && !user && !profileError) {
      router.push('/auth/login');
    }
  }, [user, isLoading, profileLoading, profileError, router]);

  // Log error to console for debugging
  useEffect(() => {
    if (profileError) {
      console.error('[DASHBOARD] Profile load error:', {
        errorId,
        errorName: profileError.name,
        errorMessage: profileError.message,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });
      // TODO: Send to Sentry or other error tracking service
      // Sentry.captureException(profileError, { tags: { errorId } });
    }
  }, [errorId, profileError, user]);

  // Error state (renders BEFORE loading state)
  if (profileError) {
    const isRLSError = profileError.name === 'RLSError';

    return (
      <div className='flex h-screen w-full items-center justify-center bg-background p-4'>
        <div className='max-w-md w-full'>
          <Alert variant="destructive">
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>{isRLSError ? 'Permission Error' : 'Loading Error'}</AlertTitle>
            <AlertDescription>{profileError.message}</AlertDescription>
          </Alert>

          <div className='flex gap-2 mt-4'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={() => { router.push('/auth/login'); }}
            >
              Back to Login
            </Button>
            <Button
              className='flex-1'
              onClick={() => {
                clearProfileError();
                retryFetchProfile();
              }}
            >
              <RefreshCw className='mr-2 h-4 w-4' />
              Retry
            </Button>
          </div>

          {/* Error Reference Code */}
          <div className='mt-4 text-xs text-muted-foreground border-t pt-2'>
            <p className='font-medium mb-1'>Error Reference: {errorId}</p>
            <p>Please include this code when contacting support.</p>
          </div>

          {isRLSError && (
            <details className='mt-4 text-sm text-muted-foreground'>
              <summary className='cursor-pointer font-medium'>Technical Details</summary>
              <div className='mt-2 pl-4 border-l-2 border-muted-foreground/20'>
                <p className='mb-1'>Error Code: RLS_PERMISSION_DENIED</p>
                <p className='mb-1'>This error occurs when database permissions prevent accessing your user profile.</p>
                <p className='mt-2'>Possible causes:</p>
                <ul className='list-disc pl-4 mt-1'>
                  <li>RLS policy not configured for your user ID</li>
                  <li>Database migration not run</li>
                  <li>User profile missing from database</li>
                </ul>
              </div>
            </details>
          )}

          {profileError.name === 'ProfileNotFound' && (
            <details className='mt-4 text-sm text-muted-foreground'>
              <summary className='cursor-pointer font-medium'>Technical Details</summary>
              <div className='mt-2 pl-4 border-l-2 border-muted-foreground/20'>
                <p className='mb-1'>Error Code: PROFILE_NOT_FOUND</p>
                <p className='mb-1'>Your user account exists but no profile was found in the database.</p>
                <p className='mt-2'>Possible causes:</p>
                <ul className='list-disc pl-4 mt-1'>
                  <li>Profile creation failed during registration</li>
                  <li>Profile was deleted by an administrator</li>
                  <li>Database migration for user_profiles not run</li>
                </ul>
                <p className='mt-2'>Please contact a system administrator to resolve this issue.</p>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  // Show loading spinner only if we're actually fetching, not if we have cached data
  if ((isLoading || profileLoading) && !userProfile) {
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

  return (
    <DashboardProvider>
      {children}
      <ChatbotButton />
    </DashboardProvider>
  );
}
