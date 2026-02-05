'use client';

import { useState, useMemo } from 'react';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import { MetricCard } from '@/components/dashboard/metric-card';
import { usePermissions } from '@/hooks/use-permissions';
import { useVisibility } from '@/hooks/use-visibility';
import { useDataView } from '@/hooks/use-data-view';
import { TrendingUp, DollarSign, Target, Package, AlertCircle } from 'lucide-react';
import {
  REGIONS,
  getStoresByRegions,
  getCategoriesByStores,
  getMetrics,
} from '@/data/mock-data';

/**
 * Financial Overview Section
 * Displays financial KPIs and metrics in TL (Turkish Lira)
 * Only accessible to Finance role users
 */
export function FinancialOverviewSection() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Get hooks
  const { canSeeKpi, canSeeChart, canSeeTable, canSeeFilter } = useVisibility('financialOverview');
  const { userRole } = usePermissions();
  const { transformKPIValue, format, currentMode } = useDataView();

  // Compute filtered options
  const regionOptions = useMemo(
    () => REGIONS.map((r) => ({ value: r.value, label: r.label })),
    []
  );

  const storeOptions = useMemo(
    () => getStoresByRegions(selectedRegions),
    [selectedRegions]
  );

  const categoryOptions = useMemo(
    () => getCategoriesByStores(selectedStores),
    [selectedStores]
  );

  // Get metrics
  const metrics = useMemo(
    () => getMetrics(selectedRegions, selectedStores, selectedCategories),
    [selectedRegions, selectedStores, selectedCategories]
  );

  // Filter handlers
  const handleRegionChange = (regions: string[]) => {
    setSelectedRegions(regions);
    setSelectedStores([]);
    setSelectedCategories([]);
  };

  const handleStoreChange = (stores: string[]) => {
    setSelectedStores(stores);
    setSelectedCategories([]);
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar - Only region and category for Finance role */}
      <FilterBar
        title="Finansal Genel Bakış"
        selectedRegions={selectedRegions}
        onRegionChange={canSeeFilter('filter-region') ? handleRegionChange : undefined}
        regionOptions={canSeeFilter('filter-region') ? regionOptions : undefined}
        selectedCategories={selectedCategories}
        onCategoryChange={canSeeFilter('filter-category') ? setSelectedCategories : undefined}
        categoryOptions={canSeeFilter('filter-category') ? categoryOptions : undefined}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Forecasted Revenue */}
        {canSeeKpi('fin-forecasted-revenue') && (
          <MetricCard
            title="Tahmini Gelir"
            value={format(metrics.ytdValue)}
            subtext="Gelecek 30 Gün"
            icon={TrendingUp}
            change={`${metrics.ytdChange > 0 ? '+' : ''}${metrics.ytdChange.toFixed(0)}%`}
            changeType={metrics.ytdChange >= 0 ? 'positive' : 'negative'}
            delay={0}
          />
        )}

        {/* Budget Achievement */}
        {canSeeKpi('fin-budget-achievement') && (
          <MetricCard
            title="Bütçe Başarısı"
            value={`${metrics.accuracy.toFixed(1)}%`}
            subtext="Yıllık Hedef"
            icon={Target}
            change={`${metrics.accuracyChange > 0 ? '+' : ''}${metrics.accuracyChange.toFixed(1)}%`}
            changeType={metrics.accuracyChange >= 0 ? 'positive' : 'negative'}
            delay={0.1}
          />
        )}

        {/* Inventory Value */}
        {canSeeKpi('fin-inventory-value') && (
          <MetricCard
            title="Envanter Değeri"
            value={format(metrics.forecastValue)}
            subtext="Mevcut Stok"
            icon={Package}
            change={`${metrics.forecastChange > 0 ? '+' : ''}${metrics.forecastChange.toFixed(1)}%`}
            changeType={metrics.forecastChange >= 0 ? 'positive' : 'negative'}
            delay={0.2}
          />
        )}

        {/* Forecasted Margin */}
        {canSeeKpi('fin-forecasted-margin') && (
          <MetricCard
            title="Tahmini Brüt Marj"
            value="%28.5"
            subtext="Ortalama"
            icon={DollarSign}
            change="+2.3%"
            changeType="positive"
            delay={0.3}
          />
        )}

        {/* Forecast vs Budget */}
        {canSeeKpi('fin-forecast-vs-budget') && (
          <MetricCard
            title="Tahmin vs Bütçe"
            value="%95.2"
            subtext="Uyum Oranı"
            icon={Target}
            change="-1.2%"
            changeType="negative"
            delay={0.4}
          />
        )}

        {/* Dead Stock */}
        {canSeeKpi('fin-dead-stock') && (
          <MetricCard
            title="Ölü Stok Değeri"
            value={format(125000)}
            subtext="120 Gündür Hareketsiz"
            icon={AlertCircle}
            change="+5.2%"
            changeType="negative"
            delay={0.5}
          />
        )}
      </div>

      {/* Charts Section */}
      {canSeeChart('fin-tl-based-trend-chart') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* TL-based Trend Chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">TL Bazlı Trend</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Grafik Yakında
            </div>
          </div>

          {/* Budget Comparison Chart */}
          {canSeeChart('fin-budget-comparison-chart') && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Bütçe Karşılaştırması</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Grafik Yakında
              </div>
            </div>
          )}
        </div>
      )}

      {canSeeChart('fin-margin-analysis-chart') && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Marj Analizi</h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Grafik Yakında
          </div>
        </div>
      )}

      {/* Tables Section */}
      {canSeeTable('fin-revenue-breakdown') && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Gelir Breakdown</h3>
          <div className="text-muted-foreground">
            Tablo Yakında
          </div>
        </div>
      )}

      {canSeeTable('fin-budget-variance') && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Bütçe Sapması</h3>
          <div className="text-muted-foreground">
            Tablo Yakında
          </div>
        </div>
      )}
    </div>
  );
}
