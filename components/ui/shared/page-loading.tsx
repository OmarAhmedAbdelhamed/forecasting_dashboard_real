import { Card, CardContent, CardHeader } from '@/components/ui/shared/card';
import { Skeleton } from '@/components/ui/shared/skeleton';
import { Spinner } from '@/components/ui/shared/spinner';

interface PageLoadingProps {
  title?: string;
  description?: string;
}

export function PageLoading({
  title = 'Yükleniyor…',
  description = 'Veriler hazırlanıyor.',
}: PageLoadingProps) {
  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-2 pt-3 px-4'>
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
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <Skeleton className='h-20' />
            <Skeleton className='h-20' />
            <Skeleton className='h-20' />
            <Skeleton className='h-20' />
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            <Skeleton className='h-72' />
            <Skeleton className='h-72' />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
