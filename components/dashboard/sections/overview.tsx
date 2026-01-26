"use client";

import { useState } from "react";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RevenueTargetChart } from "@/components/dashboard/charts/revenue-target-chart";
import { CategoryGrowthChart } from "@/components/dashboard/charts/category-growth-chart";
import { UpcomingPromotions } from "@/components/dashboard/tables/upcoming-promotions";
import { StockRiskTable } from "@/components/dashboard/tables/stock-risk-table";
import { 
    TrendingUp, 
    Target, 
    AlertTriangle, 
    CalendarRange,
    Tags
} from "lucide-react";

export function OverviewSection() {
  const [selectedStore, setSelectedStore] = useState("1001");

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-1 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Genel Bakış</h2>
        <p className="text-sm text-muted-foreground">
          Forecasting ve promosyon performansınıza genel bir bakış.
        </p>
      </div>

      {/* 2. Global Filter */}
      <FilterBar 
        selectedStore={selectedStore} 
        onStoreChange={setSelectedStore} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: KPIs (2x2 Grid) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
            title="Gelecek 30 Günlük Tahmin"
            value="1.4M"
            subtext="Adet Satış"
            icon={TrendingUp}
            change="+8.2%"
            changeType="positive"
            delay={0}
            />
            <MetricCard
            title="Aktif Promosyonlar"
            value="12"
            subtext="Kampanya Yürürlükte"
            icon={Tags}
            delay={0.1}
            />
            <MetricCard
            title="Model Doğruluğu (YTD)"
            value="94.2%"
            subtext="Ortalama Başarı"
            icon={Target}
            change="+1.5%"
            changeType="positive"
            delay={0.2}
            />
            <MetricCard
            title="Stok Devir Hızı"
            value="4.2"
            subtext="Yıllık Devir"
            icon={CalendarRange}
            change="+0.3"
            changeType="positive"
            delay={0.3}
            />
        </div>

        {/* Right Column: Critical Risks (Tall) */}
        <div className="lg:col-span-4">
            <StockRiskTable />
        </div>

        {/* Middle Row: Charts */}
        <div className="lg:col-span-8">
            <RevenueTargetChart />
        </div>
        <div className="lg:col-span-4">
            <CategoryGrowthChart />
        </div>
        
        {/* Bottom Row: Tables */}
        <div className="lg:col-span-12">
            <UpcomingPromotions />
        </div>
      </div>
    </div>
  );
}
