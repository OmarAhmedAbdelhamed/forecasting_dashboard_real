'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Calendar, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shared/tooltip';
import { addDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';

const UPCOMING_PROMOTIONS = [
  {
    id: 1,
    name: 'Bahar Temizliği',
    start: 1, // Day offset from start
    duration: 10,
    type: 'İnternet İndirimi',
    color: 'bg-emerald-500', 
  },
  {
    id: 2,
    name: 'Ramazan Paketi',
    start: 5,
    duration: 14,
    type: 'Alışveriş İndirimi 500TL+',
    color: 'bg-amber-500',
  },
  {
    id: 3,
    name: 'Haftasonu İndirimi',
    start: 15,
    duration: 3,
    type: 'Çoklu Alım',
    color: 'bg-blue-500',
  },
   {
    id: 4,
    name: 'Yaz Öncesi Fırsat',
    start: 22,
    duration: 7,
    type: 'Özel Gün İndirimi',
    color: 'bg-purple-500',
  },
];

export function PromotionCalendar() {
  const totalDays = 30; // 1 Month view
  const today = new Date();

  return (
    <Card className="h-full">
      <CardHeader className="py-3 pb-2 2xl:py-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base 2xl:text-lg">Promosyon Takvimi (Çakışma Analizi)</CardTitle>
        </div>
        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Önümüzdeki 30 Gün</Badge>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative pt-6">
            {/* Timeline Axis */}
             <div className="flex justify-between text-[10px] text-muted-foreground mb-2 px-1">
                <span>{format(today, 'd MMM', { locale: tr })}</span>
                <span>{format(addDays(today, 15), 'd MMM', { locale: tr })}</span>
                <span>{format(addDays(today, 30), 'd MMM', { locale: tr })}</span>
            </div>
            
            <div className="relative space-y-3">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-px h-full bg-slate-900/50 dashed" />
                    ))}
                </div>

                {UPCOMING_PROMOTIONS.map((promo) => {
                    const startDate = addDays(today, promo.start);
                    const endDate = addDays(startDate, promo.duration);
                    return (
                    <div key={promo.id} className="relative h-8 flex items-center group">
                        {/* Bar */}
                        <div 
                            className={`absolute h-6 rounded-md shadow-sm ${promo.color} bg-opacity-90 flex items-center px-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md`}
                            style={{
                                left: `${(promo.start / totalDays) * 100}%`,
                                width: `${(promo.duration / totalDays) * 100}%`,
                            }}
                        >
                            <span className="text-[10px] font-bold text-white truncate w-full">
                                {promo.name}
                            </span>
                        </div>
                        
                        {/* Tooltip via Group Hover */}
                         <div className="absolute top-[-35px] left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-1.5 rounded-md z-20 whitespace-nowrap shadow-xl">
                            <div className="font-semibold mb-0.5">{promo.type}</div>
                            <div className="text-[10px] opacity-80">
                                {format(startDate, 'd MMMM', { locale: tr })} - {format(endDate, 'd MMMM', { locale: tr })} ({promo.duration} gün)
                            </div>
                        </div>
                    </div>
                )})}
            </div>
            
             <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> İnternet
                </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> 500TL+
                </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Çoklu Alım
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
