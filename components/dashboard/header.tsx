'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Section } from '@/types/types';
import { Bell, User, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shared/dropdown-menu';

interface HeaderProps {
  activeSection: Section;
}

const sectionTitles: any = {
  overview: 'Genel Bakış',
  demand_forecasting: 'Talep Tahminleme',
  inventory_planning: 'Envanter Planlama',
  pricing_promotion: 'Fiyatlandırma & Promosyon',
  seasonal_planning: 'Sezonluk Planlama',
};

export function Header({ activeSection }: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    // Clear any auth state here if needed
    router.push('/auth/login');
  };

  return (
    <header className='h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6'>
      <div className='flex items-center gap-6'>
        <h1 className='text-xl font-semibold text-foreground'>
          Forecasting Dashboard
        </h1>
      </div>

      <div className='flex items-center gap-4'>
        {/* Notifications */}
        <button className='relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200'>
          <Bell className='w-5 h-5' />
          <span className='absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse' />
        </button>

        {/* User avatar with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='w-9 h-9 2xl:w-11 2xl:h-11 rounded-lg overflow-hidden bg-secondary ring-2 ring-transparent hover:ring-accent/50 transition-all duration-200 focus:outline-none focus:ring-accent/50'>
              <div className='w-full h-full bg-gradient-to-br from-accent/80 to-chart-1 flex items-center justify-center text-xs 2xl:text-sm font-semibold text-accent-foreground'>
                JD
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48 2xl:w-56'>
            <DropdownMenuItem className='cursor-pointer 2xl:py-3'>
              <User className='mr-2 h-4 w-4 2xl:h-5 2xl:w-5' />
              <span className='2xl:text-base'>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem className='cursor-pointer 2xl:py-3'>
              <Settings className='mr-2 h-4 w-4 2xl:h-5 2xl:w-5' />
              <span className='2xl:text-base'>Ayarlar</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 2xl:py-3'
              onClick={handleLogout}
            >
              <LogOut className='mr-2 h-4 w-4 2xl:h-5 2xl:w-5' />
              <span className='2xl:text-base'>Çıkış Yap</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
