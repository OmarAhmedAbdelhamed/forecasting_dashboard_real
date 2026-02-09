'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Calendar } from 'lucide-react';

import { addDays, differenceInCalendarDays, format, isWithinInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { PromotionCalendarEvent } from '@/services/types/api';

type PromotionCalendarProps = {
  events?: PromotionCalendarEvent[];
  isLoading?: boolean;
};

const colorByType: Record<string, string> = {
  internet: 'bg-emerald-500',
  'internet indirimi': 'bg-emerald-500',
  katalog: 'bg-amber-500',
  '500tl+': 'bg-amber-500',
  '500 tl+': 'bg-amber-500',
  leaflet: 'bg-blue-500',
  hybrid: 'bg-indigo-500',
  'gazete ilanı': 'bg-cyan-500',
  'çoklu alım': 'bg-blue-500',
};

const normalize = (value: string) => value.trim().toLowerCase();

export function PromotionCalendar({ events = [], isLoading = false }: PromotionCalendarProps) {
  const totalDays = 30;
  const maxVisibleRows = 10;
  const today = new Date();

  const timelineStart = today;
  const timelineEnd = addDays(today, totalDays);

  const grouped: Record<string, { name: string; type: string; discount: number | null; dates: Date[] }> = {};

  events.forEach((event) => {
    const eventDate = new Date(event.date);
    if (Number.isNaN(eventDate.getTime())) return;

    if (!isWithinInterval(eventDate, { start: timelineStart, end: timelineEnd })) {
      return;
    }

    event.promotions.forEach((promo) => {
      const key = `${promo.id}-${promo.type}-${promo.name}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: promo.name,
          type: promo.type,
          discount: promo.discount,
          dates: [],
        };
      }
      grouped[key].dates.push(eventDate);
    });
  });

  const segments = Object.entries(grouped).flatMap(([key, promo]) => {
    const sortedDates = promo.dates
      .map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (sortedDates.length === 0) {
      return [];
    }

    const ranges: { start: Date; end: Date }[] = [];
    let rangeStart = sortedDates[0];
    let prev = sortedDates[0];

    for (let i = 1; i < sortedDates.length; i++) {
      const curr = sortedDates[i];
      if (differenceInCalendarDays(curr, prev) > 1) {
        ranges.push({ start: rangeStart, end: prev });
        rangeStart = curr;
      }
      prev = curr;
    }
    ranges.push({ start: rangeStart, end: prev });

    return ranges.map((range, index) => {
      const startOffset = Math.max(0, differenceInCalendarDays(range.start, timelineStart));
      const duration = differenceInCalendarDays(range.end, range.start) + 1;
      const typeKey = normalize(promo.type);

      return {
        id: `${key}-${index}`,
        name: promo.name,
        type: promo.type,
        discount: promo.discount,
        startOffset,
        duration,
        color: colorByType[typeKey] || 'bg-slate-500',
        startDate: range.start,
        endDate: range.end,
      };
    });
  });

  const visibleSegments = segments.slice(0, maxVisibleRows);
  const hiddenSegmentsCount = Math.max(0, segments.length - visibleSegments.length);

  return (
    <Card className="h-full">
      <CardHeader className="py-3 pb-2 2xl:py-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base 2xl:text-lg">Promosyon Takvimi (Çakışma Analizi)</CardTitle>
        </div>
        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Önümüzdeki 30 Gün</Badge>
      </CardHeader>
      <CardContent className="pb-3 overflow-hidden">
        <div className="relative pt-5 overflow-hidden">
            {/* Timeline Axis */}
             <div className="flex justify-between text-[10px] text-muted-foreground mb-2 px-1">
                <span>{format(today, 'd MMM', { locale: tr })}</span>
                <span>{format(addDays(today, 15), 'd MMM', { locale: tr })}</span>
                <span>{format(addDays(today, 30), 'd MMM', { locale: tr })}</span>
            </div>

            <div className="relative space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-px h-full bg-slate-900/50 dashed" />
                    ))}
                </div>

                {visibleSegments.map((promo) => {
                    const startDate = promo.startDate;
                    const endDate = promo.endDate;
                    return (
                    <div key={promo.id} className="relative h-6 flex items-center group">
                        {/* Bar */}
                        <div
                            className={`absolute h-4 rounded-md shadow-sm ${promo.color} bg-opacity-90 flex items-center px-2 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md`}
                            style={{
                                left: `${(promo.startOffset / totalDays) * 100}%`,
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
                            {promo.discount !== null && (
                              <div className="text-[10px] opacity-80">İndirim: %{promo.discount}</div>
                            )}
                        </div>
                    </div>
                );})}

                {!isLoading && segments.length === 0 && (
                  <div className='h-16 border border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground'>
                    Seçili dönem için backend promosyon verisi bulunamadı.
                  </div>
                )}

                {isLoading && (
                  <div className='h-16 border border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground'>
                    Takvim verisi yükleniyor...
                  </div>
                )}

                {hiddenSegmentsCount > 0 && (
                  <div className='text-[11px] text-muted-foreground border-t pt-2'>
                    +{hiddenSegmentsCount} kampanya daha var. Tümünü görmek için kaydırın.
                  </div>
                )}
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
