"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { STORES, PRODUCTS } from "@/lib/constants";
import { Filter, Calendar as CalendarIcon } from "lucide-react";

interface FilterBarProps {
  // Store Selection
  selectedStore: string;
  onStoreChange: (value: string) => void;

  // Product Selection (Optional)
  selectedProduct?: string;
  onProductChange?: (value: string) => void;

  // Date Range (Optional)
  startDate?: Date;
  setStartDate?: (date: Date | undefined) => void;
  endDate?: Date;
  setEndDate?: (date: Date | undefined) => void;
  
  // Extra content (e.g. Horizon buttons)
  children?: React.ReactNode;
}

export function FilterBar({
  selectedStore,
  onStoreChange,
  selectedProduct,
  onProductChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  children
}: FilterBarProps) {
  return (
    <div className="w-full bg-card border border-border rounded-lg p-3 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between animate-in fade-in-50 slide-in-from-top-2">
      
      {/* Primary Filters */}
      <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto items-end md:items-center">
        
        {/* Store Select */}
        <div className="flex flex-col gap-1.5 w-full md:w-[240px]">
          <label className="text-xs font-medium text-muted-foreground ml-1">Mağaza</label>
          <Select value={selectedStore} onValueChange={onStoreChange}>
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="Mağaza Seçiniz" />
            </SelectTrigger>
            <SelectContent>
              {STORES.map((store) => (
                <SelectItem key={store.value} value={store.value}>
                  {store.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Select (Conditional) */}
        {selectedProduct && onProductChange && (
          <div className="flex flex-col gap-1.5 w-full md:w-[240px]">
            <label className="text-xs font-medium text-muted-foreground ml-1">Ürün</label>
            <Select value={selectedProduct} onValueChange={onProductChange}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Ürün Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTS.map((product) => (
                  <SelectItem key={product.value} value={product.value}>
                    {product.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Range (Conditional) */}
        {startDate && setStartDate && endDate && setEndDate && (
           <div className="flex flex-col gap-1.5 w-full md:w-auto">
             <label className="text-xs font-medium text-muted-foreground ml-1">Tarih Aralığı</label>
             <div className="flex items-center gap-2">
                <DatePicker 
                    date={startDate} 
                    setDate={setStartDate} 
                    placeholder="Başlangıç" 
                    className="h-9 w-[130px] bg-background" 
                />
                <span className="text-muted-foreground">-</span>
                <DatePicker 
                    date={endDate} 
                    setDate={setEndDate} 
                    placeholder="Bitiş" 
                    className="h-9 w-[130px] bg-background" 
                />
             </div>
           </div>
        )}
      </div>

      {/* Extra Controls (Horizon, Refresh etc.) */}
      {children && (
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {children}
        </div>
      )}

    </div>
  );
}
