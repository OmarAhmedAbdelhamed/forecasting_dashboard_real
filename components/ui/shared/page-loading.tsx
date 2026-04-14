import { Card, CardContent, CardHeader } from '@/components/ui/shared/card';
import { Skeleton } from '@/components/ui/shared/skeleton';
import { Spinner } from '@/components/ui/shared/spinner';

interface PageLoadingProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'overview' | 'demand' | 'inventory' | 'forecasting';
}

export function PageLoading({
  title = 'Yukleniyor...',
  description = 'Veriler hazirlaniyor.',
  variant = 'default',
}: PageLoadingProps) {
  const renderBody = () => {
    switch (variant) {
      case 'overview':
        return (
          <>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <Skeleton className='h-32 rounded-2xl' />
              <Skeleton className='h-32 rounded-2xl' />
              <Skeleton className='h-32 rounded-2xl' />
              <Skeleton className='h-32 rounded-2xl' />
            </div>
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]'>
              <Skeleton className='h-96 rounded-2xl' />
              <div className='space-y-4'>
                <Skeleton className='h-44 rounded-2xl' />
                <Skeleton className='h-44 rounded-2xl' />
              </div>
            </div>
          </>
        );
      case 'demand':
        return (
          <>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6'>
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
            </div>
            <Skeleton className='h-[26rem] rounded-2xl' />
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
              <Skeleton className='h-80 rounded-2xl' />
              <Skeleton className='h-80 rounded-2xl' />
            </div>
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
              <Skeleton className='h-72 rounded-2xl' />
              <Skeleton className='h-72 rounded-2xl' />
            </div>
          </>
        );
      case 'inventory':
        return (
          <>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5'>
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
            </div>
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
              <Skeleton className='h-96 rounded-2xl' />
              <Skeleton className='h-96 rounded-2xl' />
            </div>
            <Skeleton className='h-[28rem] rounded-2xl' />
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
              <Skeleton className='h-72 rounded-2xl' />
              <Skeleton className='h-72 rounded-2xl' />
            </div>
          </>
        );
      case 'forecasting':
        return (
          <>
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]'>
              <Skeleton className='h-[34rem] rounded-2xl' />
              <div className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  <Skeleton className='h-28 rounded-2xl' />
                  <Skeleton className='h-28 rounded-2xl' />
                  <Skeleton className='h-28 rounded-2xl' />
                </div>
                <Skeleton className='h-[19rem] rounded-2xl' />
                <Skeleton className='h-[11rem] rounded-2xl' />
              </div>
            </div>
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
              <Skeleton className='h-80 rounded-2xl' />
              <Skeleton className='h-80 rounded-2xl' />
            </div>
          </>
        );
      default:
        return (
          <>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
              <Skeleton className='h-20' />
              <Skeleton className='h-20' />
              <Skeleton className='h-20' />
              <Skeleton className='h-20' />
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <Skeleton className='h-72' />
              <Skeleton className='h-72' />
            </div>
          </>
        );
    }
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='px-4 pb-2 pt-3'>
          <div className='flex items-center justify-between gap-3'>
            <div className='space-y-2'>
              <Skeleton className='h-5 w-52' />
              <Skeleton className='h-3 w-80 max-w-[70vw]' />
            </div>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Spinner className='size-5' />
              <span className='hidden sm:inline'>{title}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='text-sm text-muted-foreground'>{description}</div>
          {renderBody()}
        </CardContent>
      </Card>
    </div>
  );
}
