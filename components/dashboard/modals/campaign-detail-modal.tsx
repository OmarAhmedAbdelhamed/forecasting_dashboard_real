'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/shared/dialog';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { SimilarCampaign } from '@/data/mock-data';
import { CheckCircle2, TrendingUp, Package, BarChart3, AlertTriangle, Info } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipTrigger as UITooltipTrigger,
} from '@/components/ui/shared/tooltip';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface CampaignDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: SimilarCampaign | null;
  onApply: (campaign: SimilarCampaign) => void;
}

// Helper to generate mock daily data for the chart based on the campaign's monthly stats
const generateMockChartData = (campaign: SimilarCampaign) => {
  if (!campaign) return [];
  const days = 14; // assume 2 week campaign view
  const data = [];
  const baseSales = 100;
  const liftMultiplier = 1 + (campaign.lift / 100);

  for (let i = 1; i <= days; i++) {
    // Random noise
    const noise = Math.random() * 20 - 10;
    // Forecast curve
    const forecast = Math.round(baseSales * liftMultiplier + noise);
    // Actual (realized) sales - slightly different
    const actual = Math.round(forecast * (Math.random() * 0.2 + 0.9)); 

    data.push({
      day: `Gün ${i}`,
      forecast,
      actual,
    });
  }
  return data;
};

export function CampaignDetailModal({
  isOpen,
  onClose,
  campaign,
  onApply,
}: CampaignDetailModalProps) {
  if (!campaign) return null;

  const chartData = generateMockChartData(campaign);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[700px]'>
        <DialogHeader>
          <div className="flex items-center gap-2">
             <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
               <TrendingUp className="h-5 w-5" />
             </div>
             <div>
                <DialogTitle className='text-xl'>{campaign.name}</DialogTitle>
                <DialogDescription>
                  {campaign.date} • {campaign.type} Kampanyası Detay Analizi
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 py-2'>
            {/* KPI Cards */}
             <div className="space-y-3">
                <Card className="bg-emerald-50/50 border-emerald-100">
                   <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-emerald-800 flex items-center gap-1">
                           ROI (Yatırım Getirisi)
                           <UITooltip>
                              <UITooltipTrigger>
                                 <Info className="h-3 w-3 text-emerald-600/70 hover:text-emerald-800 transition-colors" />
                              </UITooltipTrigger>
                              <UITooltipContent>
                                 <p className="max-w-xs">Kampanyanın getirdiği net karın yatırım maliyetine oranı.</p>
                              </UITooltipContent>
                           </UITooltip>
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">%{campaign.roi}</div>
                      </div>
                      <TrendingUp className="h-8 w-8 text-emerald-200" />
                   </CardContent>
                </Card>
                <Card className="bg-blue-50/50 border-blue-100">
                   <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-blue-800 flex items-center gap-1">
                           Ciro Artışı (Lift)
                           <UITooltip>
                              <UITooltipTrigger>
                                 <Info className="h-3 w-3 text-blue-600/70 hover:text-blue-800 transition-colors" />
                              </UITooltipTrigger>
                              <UITooltipContent>
                                 <p className="max-w-xs">Promosyon olmasaydı gerçekleşecek tahmini satışların üzerine eklenen ciro artışı.</p>
                              </UITooltipContent>
                           </UITooltip>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">%{campaign.lift}</div>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-200" />
                   </CardContent>
                </Card>
                <Card className={`${campaign.stockOutDays > 0 ? 'bg-red-50/50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                   <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-medium ${campaign.stockOutDays > 0 ? 'text-red-800' : 'text-gray-600'} flex items-center gap-1`}>
                           Stok Durumu (OOS)
                           <UITooltip>
                              <UITooltipTrigger>
                                 <Info className={`h-3 w-3 transition-colors ${campaign.stockOutDays > 0 ? 'text-red-600/70 hover:text-red-800' : 'text-gray-400 hover:text-gray-600'}`} />
                              </UITooltipTrigger>
                              <UITooltipContent>
                                 <p className="max-w-xs">Kampanya döneminde ürünün stokta bulunmadığı gün sayısı.</p>
                              </UITooltipContent>
                           </UITooltip>
                        </div>
                        <div className={`text-2xl font-bold ${campaign.stockOutDays > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                           {campaign.stockOutDays > 0 ? `${campaign.stockOutDays} Gün Yok` : 'Yeterli Stok'}
                        </div>
                      </div>
                      {campaign.stockOutDays > 0 ? (
                         <AlertTriangle className="h-8 w-8 text-red-200" />
                      ) : (
                         <Package className="h-8 w-8 text-gray-300" />
                      )}
                   </CardContent>
                </Card>
             </div>

            {/* Chart Area */}
            <Card className="flex flex-col">
               <CardHeader className="py-2 pb-0">
                  <CardTitle className="text-sm font-medium">Satış Performansı (Tahmin vs Gerçek)</CardTitle>
               </CardHeader>
               <CardContent className="flex-1 p-2 pt-4">
                  <div className="h-[200px] w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} width={30} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="forecast" name="Tahmin" stroke="#4f46e5" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="actual" name="Gerçekleşen" stroke="#22c55e" strokeWidth={2} dot={{r: 4, strokeWidth: 0}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </CardContent>
            </Card>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2 border-t pt-4">
          <div className="text-xs text-muted-foreground hidden sm:block">
             Bu konfigürasyonu uygulamak mevcut tahminleme parametrelerini güncelleyecektir.
          </div>
          <div className="flex gap-2">
            <Button variant='outline' onClick={onClose} >
              Kapat
            </Button>
            <Button onClick={() => {
                onApply(campaign);
                onClose();
            }} className="bg-indigo-600 hover:bg-indigo-700">
              <CheckCircle2 className='mr-2 h-4 w-4' />
              Yapılandırmayı Uygula
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
