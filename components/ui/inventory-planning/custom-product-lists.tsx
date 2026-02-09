'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { List } from 'lucide-react';
import { useCustomLists } from '@/contexts/custom-lists-context';
import { ScrollArea } from '@/components/ui/shared/scroll-area';
import { useToast } from '@/components/ui/shared/use-toast';

interface CustomProductListsProps {
  onListSelect?: (skus: string[]) => void;
}

export function CustomProductLists({ onListSelect }: CustomProductListsProps) {
  const { toast } = useToast();
  const { lists } = useCustomLists();

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='space-y-1.5'>
            <CardTitle className='flex items-center gap-2'>
              <List className='h-5 w-5 text-blue-500' />
              Ozel Listeler
            </CardTitle>
            <CardDescription>
              Mevcut urunlerden otomatik olusturulan urun gruplari
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex-1 p-0 min-h-0'>
        <ScrollArea className='flex-1 h-112.5'>
          <div className='px-6 pb-4 space-y-3'>
            {lists.map((list) => (
              <button
                key={list.id}
                type='button'
                className='w-full flex items-center gap-3 p-3 border rounded-lg bg-card hover:border-blue-500/50 transition-colors text-left'
                onClick={() => {
                  onListSelect?.(list.skus);
                  toast({
                    title: 'Liste uygulandi',
                    description: `${list.name} listesindeki ${String(list.itemCount)} urun filtrelendi.`,
                  });
                }}
              >
                <div className='h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs'>
                  {list.itemCount}
                </div>
                <div>
                  <p className='text-sm font-medium leading-none'>{list.name}</p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    Son duzenleme: {list.lastModified}
                  </p>
                </div>
              </button>
            ))}

            {lists.length === 0 && (
              <div className='text-center py-10 text-muted-foreground'>
                <p className='text-sm'>Urun bulunamadigi icin liste olusturulamadi.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
