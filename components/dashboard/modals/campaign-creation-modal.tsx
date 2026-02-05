import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/shared/dialog';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/shared/select';
import { Textarea } from '@/components/ui/shared/textarea';
import { Save, TrendingUp, Package, Tag, MapPin, Store, Calendar, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface SimulationMetrics {
    targetRevenue: string; // Formatted string e.g. "120K TL"
    lift: string; // e.g. "+15%"
    stockStatus: string; // e.g. "Optimal"
}

interface CampaignContext {
    regions: string[];
    stores: string[];
    products: string[];
    startDate: Date | undefined;
    endDate: Date | undefined;
    duration: number;
}

interface CampaignCreationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    simulationMetrics?: SimulationMetrics;
    campaignContext?: CampaignContext;
    onSave: (data: { name: string; status: string; notes: string }) => void;
}

export function CampaignCreationModal({
    open,
    onOpenChange,
    simulationMetrics,
    campaignContext,
    onSave,
}: CampaignCreationModalProps) {
    const [name, setName] = useState('');
    const [status, setStatus] = useState('draft');
    const [notes, setNotes] = useState('');

    const handleSave = () => {
        onSave({ name, status, notes });
        onOpenChange(false);
        // Reset form
        setName('');
        setStatus('draft');
        setNotes('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Kampanya Planla</DialogTitle>
                    <DialogDescription>
                        Simülasyon sonuçlarına göre yeni bir promosyon kurgusu oluşturun.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Context Info */}
                    {campaignContext && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                             <div className="space-y-1">
                                <div className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Bölge / Mağaza</div>
                                <div className="font-medium truncate" title={campaignContext.stores.join(', ')}>
                                    {campaignContext.stores.length > 0
                                        ? `${campaignContext.stores.length} Mağaza (${campaignContext.regions.join(', ')})`
                                        : 'Tüm Mağazalar'}
                                </div>
                             </div>
                             <div className="space-y-1">
                                <div className="text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Kapsam</div>
                                <div className="font-medium truncate" title={campaignContext.products.join(', ')}>
                                    {campaignContext.products.length > 0 ? `${campaignContext.products.length} Ürün` : 'Tüm Ürünler'}
                                </div>
                             </div>
                             <div className="space-y-1 col-span-2">
                                <div className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Tarih Aralığı</div>
                                <div className="font-medium">
                                    {campaignContext.startDate && campaignContext.endDate
                                        ? `${format(campaignContext.startDate, 'd MMMM', { locale: tr })} - ${format(campaignContext.endDate, 'd MMMM yyyy', { locale: tr })} (${campaignContext.duration} Gün)`
                                        : '-'}
                                </div>
                             </div>
                        </div>
                    )}

                    {/* Summary Card */}
                    {simulationMetrics && (
                        <div className="bg-muted/40 p-3 rounded-lg border border-border/50 text-sm space-y-2">
                            <div className="font-semibold text-muted-foreground text-xs uppercase mb-2">Simülasyon Özeti</div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white p-2 rounded shadow-sm border">
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> Hedef Ciro
                                    </div>
                                    <div className="font-bold text-indigo-600">{simulationMetrics.targetRevenue}</div>
                                </div>
                                <div className="bg-white p-2 rounded shadow-sm border">
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Tag className="w-3 h-3" /> Lift
                                    </div>
                                    <div className="font-bold text-emerald-600">{simulationMetrics.lift}</div>
                                </div>
                                <div className="bg-white p-2 rounded shadow-sm border">
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Package className="w-3 h-3" /> Stok
                                    </div>
                                    <div className="font-bold text-gray-700">{simulationMetrics.stockStatus}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="camp-name">Kampanya Adı</Label>
                        <Input
                            id="camp-name"
                            placeholder="Örn: Şubat Sonu Stok Eritme"
                            value={name}
                            onChange={(e) => { setName(e.target.value); }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Statü</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">Taslak (Draft)</SelectItem>
                                <SelectItem value="pending">Onay Bekliyor</SelectItem>
                                <SelectItem value="active">Yayına Al (Onaylı)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Kampanya detayları veya onay notu..."
                            className="h-20 max-h-32 min-h-[5rem]"
                            value={notes}
                            onChange={(e) => { setNotes(e.target.value); }}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => { onOpenChange(false); }}>Vazgeç</Button>
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                        <Save className="w-4 h-4 mr-2" />
                        Kaydet ve Planla
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
