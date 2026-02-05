import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import {
  Plus,
  List,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Check,
} from 'lucide-react';
import { generateInventoryItems } from '@/data/mock-data';
import { useCustomLists } from '@/context/custom-lists-context';
import { ScrollArea } from '@/components/ui/shared/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/shared/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Checkbox } from '@/components/ui/shared/checkbox';
import { format } from 'date-fns';
import { CustomProductList } from '@/types/inventory';
import { useToast } from '@/components/ui/shared/use-toast';
import { cn } from '@/lib/utils';

interface CustomProductListsProps {
  onListSelect?: (skus: string[]) => void;
}

export function CustomProductLists({ onListSelect }: CustomProductListsProps) {
  const { toast } = useToast();
  const { lists, addList, updateList, deleteList } = useCustomLists();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomProductList | null>(
    null,
  );
  const [listName, setListName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());

  // Get all available products
  const allProducts = useMemo(() => generateInventoryItems([], [], [], []), []);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {return allProducts;}
    const lowerSearch = searchTerm.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(lowerSearch) ||
        p.sku.toLowerCase().includes(lowerSearch),
    );
  }, [allProducts, searchTerm]);

  const handleOpenAddDialog = () => {
    setEditingList(null);
    setListName('');
    setSearchTerm('');
    setSelectedSkus(new Set());
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (list: CustomProductList) => {
    setEditingList(list);
    setListName(list.name);
    setSearchTerm('');
    setSelectedSkus(new Set(list.skus || []));
    setIsDialogOpen(true);
  };

  const toggleSku = (sku: string) => {
    const next = new Set(selectedSkus);
    if (next.has(sku)) {
      next.delete(sku);
    } else {
      next.add(sku);
    }
    setSelectedSkus(next);
  };

  const handleSaveList = () => {
    if (!listName.trim()) {
      toast({
        title: 'Hata',
        description: 'Lütfen bir liste ismi girin.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedSkus.size === 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen en az bir ürün seçin.',
        variant: 'destructive',
      });
      return;
    }

    const skusArray = Array.from(selectedSkus);

    if (editingList) {
      // Update existing
      updateList({
        ...editingList,
        name: listName,
        skus: skusArray,
        itemCount: skusArray.length,
        lastModified: format(new Date(), 'yyyy-MM-dd'),
      });
      toast({
        title: 'Başarılı',
        description: 'Liste güncellendi.',
      });
      // Automatically apply the updated list
      onListSelect?.(skusArray);
    } else {
      // Add new
      const newList: CustomProductList = {
        id: Math.random().toString(36).substr(2, 9),
        name: listName,
        itemCount: skusArray.length,
        lastModified: format(new Date(), 'yyyy-MM-dd'),
        skus: skusArray,
      };
      addList(newList);
      toast({
        title: 'Başarılı',
        description: 'Yeni liste oluşturuldu.',
      });
      // Automatically apply the new list
      onListSelect?.(skusArray);
    }

    setIsDialogOpen(false);
  };

  const handleDeleteList = (id: string) => {
    deleteList(id);
    toast({
      title: 'Silindi',
      description: 'Liste başarıyla silindi.',
    });
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='space-y-1.5'>
            <CardTitle className='flex items-center gap-2'>
              <List className='h-5 w-5 text-blue-500' />
              Özel Listeler
            </CardTitle>
            <CardDescription>
              Planlama için kaydedilmiş ürün grupları
            </CardDescription>
          </div>
          <Button
            size='icon'
            variant='outline'
            className='h-8 w-8'
            onClick={handleOpenAddDialog}
          >
            <Plus className='h-4 w-4' />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='flex-1 p-0 min-h-0'>
        <ScrollArea className='flex-1 h-112.5'>
          <div className='px-6 pb-4 space-y-3'>
            {lists.map((list) => (
              <div
                key={list.id}
                className='flex items-center justify-between p-3 border rounded-lg bg-card hover:border-blue-500/50 transition-colors group cursor-pointer'
              >
                <div
                  className='flex items-center gap-3 flex-1'
                  onClick={(e) => {
                    e.stopPropagation();
                    onListSelect?.(list.skus);
                    toast({
                      title: 'Liste Uygulandı',
                      description: `${list.name} sepetindeki ${list.itemCount} ürün filtrelendi.`,
                    });
                  }}
                >
                  <div className='h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs'>
                    {list.itemCount}
                  </div>
                  <div>
                    <p className='text-sm font-medium leading-none'>
                      {list.name}
                    </p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      Son düzenleme: {list.lastModified}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 opacity-0 group-hover:opacity-100'
                    >
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                      onClick={() => { handleOpenEditDialog(list); }}
                    >
                      <Pencil className='mr-2 h-4 w-4' />
                      Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className='text-destructive'
                      onClick={() => { handleDeleteList(list.id); }}
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {lists.length === 0 && (
              <div className='text-center py-10 text-muted-foreground'>
                <p className='text-sm'>Henüz bir listeniz bulunmuyor.</p>
                <Button
                  variant='link'
                  className='text-xs'
                  onClick={handleOpenAddDialog}
                >
                  İlk listeni oluştur
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className='sm:max-w-2xl h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden border-0 shadow-2xl'
          onInteractOutside={(e) => { e.preventDefault(); }}
        >
          {/* Header - Navy Blue Theme */}
          <div className='px-6 py-4 bg-[#0D1E3A] text-white shrink-0'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div className='p-2 bg-[#FFB840] rounded-lg shadow-lg'>
                  <List className='h-6 w-6 text-[#0D1E3A]' />
                </div>
                <div>
                  <DialogTitle className='text-xl font-bold text-white'>
                    {editingList ? 'Listeyi Düzenle' : 'Yeni Liste Oluştur'}
                  </DialogTitle>
                  <DialogDescription className='text-[#628BB1] text-sm mt-0.5'>
                    Ürünleri seçerek özel bir liste oluşturun.
                  </DialogDescription>
                </div>
              </div>

              {selectedSkus.size > 0 && (
                <div className='flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 border border-white/5'>
                  <Check className='h-4 w-4 text-[#FFB840]' />
                  <span className='text-xl font-bold leading-none'>
                    {selectedSkus.size}
                  </span>
                  <span className='text-[#628BB1] text-xs uppercase tracking-wider font-semibold'>
                    Seçili
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className='flex-1 flex flex-col p-6 overflow-hidden gap-6 bg-[#F4F7FA] dark:bg-slate-900/50'>
            {/* List Name Input */}
            <div className='space-y-2'>
              <Label
                htmlFor='listName'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300'
              >
                Liste İsmi
              </Label>
              <Input
                id='listName'
                placeholder='Örn: Kritik Ürünler...'
                value={listName}
                onChange={(e) => { setListName(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveList();
                  }
                }}
                className='h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-[#FFB840] focus-visible:border-[#FFB840] transition-all'
              />
            </div>

            {/* Product Selection Area */}
            <div className='flex-1 flex flex-col min-h-0 gap-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-sm font-semibold text-slate-700 dark:text-slate-300'>
                  Ürün Seçimi
                </Label>
                {selectedSkus.size > 0 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => { setSelectedSkus(new Set()); }}
                    className='h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50'
                  >
                    Seçimi Temizle
                  </Button>
                )}
              </div>

              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
                <Input
                  placeholder='Ürün adı veya SKU ile ara...'
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); }}
                  className='pl-10 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-[#FFB840]'
                />
              </div>

              <div className='flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col min-h-0'>
                <div className='grid grid-cols-12 gap-0 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-bold text-slate-400 tracking-wider'>
                  <div className='col-span-1 flex justify-center'>Seç</div>
                  <div className='col-span-7 text-center'>Ürün Bilgisi</div>
                  <div className='col-span-2 text-center'>Mevcut Stok</div>
                  <div className='col-span-2 text-center'>Birim Fiyat</div>
                </div>

                <ScrollArea className='flex-1 h-full'>
                  <div className='p-1'>
                    {filteredProducts.length === 0 ? (
                      <div className='h-40 flex flex-col items-center justify-center text-slate-400 gap-2'>
                        <Search className='h-8 w-8 opacity-20' />
                        <span className='text-sm italic'>Sonuç bulunamadı</span>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <div
                          key={product.sku}
                          className={cn(
                            'grid grid-cols-12 items-center gap-0 p-3 rounded-lg transition-all cursor-pointer mb-0.5 group',
                            selectedSkus.has(product.sku)
                              ? 'bg-blue-50/50 dark:bg-blue-900/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                          )}
                          onClick={() => { toggleSku(product.sku); }}
                        >
                          <div className='col-span-1 flex justify-center'>
                            <Checkbox
                              checked={selectedSkus.has(product.sku)}
                              onCheckedChange={() => { toggleSku(product.sku); }}
                              className={cn(
                                'h-4 w-4 border-2 transition-all duration-200',
                                selectedSkus.has(product.sku)
                                  ? 'bg-[#FFB840] border-[#FFB840] text-[#0D1E3A]'
                                  : 'border-slate-300',
                              )}
                            />
                          </div>
                          <div className='col-span-7 px-2 flex flex-col items-center'>
                            <p className='text-sm font-semibold text-slate-700 dark:text-slate-200 truncate'>
                              {product.productName}
                            </p>
                            <div className='flex items-center gap-2 mt-0.5'>
                              <span className='text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500'>
                                {product.sku}
                              </span>
                              <span className='text-[10px] text-slate-400'>
                                {product.category}
                              </span>
                            </div>
                          </div>
                          <div className='col-span-2 text-center'>
                            <span
                              className={cn(
                                'text-xs font-medium',
                                product.stockLevel < 100
                                  ? 'text-amber-500'
                                  : 'text-slate-600',
                              )}
                            >
                              {product.stockLevel}
                            </span>
                          </div>
                          <div className='col-span-2 text-center font-semibold text-slate-800 dark:text-slate-100 text-xs'>
                            ₺{product.stockValue.toLocaleString('tr-TR')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter className='p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800'>
            <div className='flex items-center justify-between w-full'>
              <div className='text-xs text-slate-400'>
                * Listeye eklemek için ürünleri işaretleyin.
              </div>
              <div className='flex gap-3'>
                <Button
                  variant='outline'
                  onClick={() => { setIsDialogOpen(false); }}
                  className='h-10 px-6 border-slate-200 dark:border-slate-700'
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSaveList}
                  className='h-10 px-8 bg-[#0D1E3A] hover:bg-[#1a2b4b] text-white font-bold shadow-lg shadow-blue-900/10 transition-all active:scale-95'
                >
                  {editingList ? 'Değişiklikleri Kaydet' : 'Listeyi Oluştur'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
