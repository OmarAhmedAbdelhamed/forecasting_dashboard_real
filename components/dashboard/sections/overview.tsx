"use client";

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
  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Genel Bakış</h2>
        <p className="text-sm text-muted-foreground">
          Forecasting ve promosyon performansınıza genel bir bakış.
        </p>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          title="Kritik Stok Uyarısı"
          value="3"
          subtext="Ürün (Riskli)"
          icon={AlertTriangle}
          change="Acil Aksiyon"
          changeType="negative"
          delay={0.3}
        />
      </div>

      {/* 3. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RevenueTargetChart />
        <CategoryGrowthChart />
      </div>

      {/* 4. Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingPromotions />
        <StockRiskTable />
      </div>
    </div>
  );
}
