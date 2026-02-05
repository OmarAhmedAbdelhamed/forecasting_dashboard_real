'use client';

import { useState, useMemo } from 'react';
import { FilterBar } from '@/components/ui/shared/filter-bar';
import { MetricCard } from '@/components/dashboard/metric-card';
import { usePermissions } from '@/hooks/use-permissions';
import { useVisibility } from '@/hooks/use-visibility';
import { useDataView } from '@/hooks/use-data-view';
import {
  Package,
  TrendingUp,
  Truck,
  AlertCircle,
  BarChart3,
  Users,
} from 'lucide-react';
import {
  REGIONS,
  getStoresByRegions,
  getCategoriesByStores,
  getMetrics,
} from '@/data/mock-data';

/**
 * Operational Overview Section
 * Displays operational KPIs in cartons (volume-based)
 * Only accessible to Production Planning role users
 */
export function OperationalOverviewSection() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Get hooks
  const { canSeeKpi, canSeeChart, canSeeTable, canSeeFilter } = useVisibility('operationalOverview');
  const { userRole } = usePermissions();
  const { transformKPIValue, format, currentMode } = useDataView();

  // Compute filtered options
  const categoryOptions = useMemo(
    () => [
      { value: 'gıda', label: 'Gıda' },
      { value: 'icecek', label: 'İçecek' },
      { value: 'temizlik', label: 'Temizlik' },
      { value: 'atistirmalik', label: 'Atıştırmalık' },
    ],
    []
  );

  const productOptions = useMemo(
    () => [
      { value: 'sut', label: 'Süt' },
      { value: 'ekmek', label: 'Ekmek' },
      { value: 'peynir', label: 'Peynir' },
      { value: 'yumurta', label: 'Yumurta' },
    ],
    []
  );

  // Get metrics
  const metrics = useMemo(
    () => getMetrics([], [], selectedCategories),
    [selectedCategories]
  );

  return (
    <div className="space-y-4">
      {/* Filter Bar - Only category and product for Production role */}
      <FilterBar
        title="Operasyonel Genel Bakış"
        selectedCategories={selectedCategories}
        onCategoryChange={canSeeFilter('filter-category') ? setSelectedCategories : undefined}
        categoryOptions={canSeeFilter('filter-category') ? categoryOptions : undefined}
        selectedProducts={selectedProducts}
        onProductChange={canSeeFilter('filter-product') ? setSelectedProducts : undefined}
        productOptions={canSeeFilter('filter-product') ? productOptions : undefined}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Order Volume */}
        {canSeeKpi('ops-order-volume') && (
          <MetricCard
            title="Sipariş Hacmi"
            value={format(metrics.forecastUnit)}
            subtext="Haftalık Toplam"
            icon={Package}
            change={`${metrics.forecastChange > 0 ? '+' : ''}${metrics.forecastChange.toFixed(1)}%`}
            changeType={metrics.forecastChange >= 0 ? 'positive' : 'negative'}
            delay={0}
          />
        )}

        {/* Capacity Utilization */}
        {canSeeKpi('ops-capacity-utilization') && (
          <MetricCard
            title="Kapasite Kullanımı"
            value="%78.5"
            subtext="Mevcut Kapasite"
            icon={BarChart3}
            change="+3.2%"
            changeType="positive"
            delay={0.1}
          />
        )}

        {/* Supplier Fill Rate */}
        {canSeeKpi('ops-supplier-fill-rate') && (
          <MetricCard
            title="Tedarikçi Doluluk Oranı"
            value="%94.2"
            subtext="Ortalama"
            icon={Truck}
            change="+1.5%"
            changeType="positive"
            delay={0.2}
          />
        )}

        {/* Forecasted Waste */}
        {canSeeKpi('ops-forecasted-waste') && (
          <MetricCard
            title="Tahmini İsraf"
            value={format(2500)}
            subtext="Haftalık Tahmin"
            icon={AlertCircle}
            change="-2.1%"
            changeType="positive"
            delay={0.3}
          />
        )}

        {/* Inbound Load */}
        {canSeeKpi('ops-inbound-load') && (
          <MetricCard
            title="Gelen Yük"
            value={format(metrics.forecastUnit * 1.2)}
            subtext="Yaklaşan"
            icon={Truck}
            change="+5.8%"
            changeType="positive"
            delay={0.4}
          />
        )}

        {/* Order Requirements */}
        {canSeeKpi('ops-order-requirements') && (
          <MetricCard
            title="Sipariş Gereksinimleri"
            value={format(metrics.forecastUnit * 0.85)}
            subtext="Net İhtiyaç"
            icon={Users}
            change="+4.2%"
            changeType="positive"
            delay={0.5}
          />
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Capacity Chart */}
        {canSeeChart('ops-capacity-chart') && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Kapasite Analizi</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Grafik Yakında
            </div>
          </div>
        )}

        {/* Supplier Performance Chart */}
        {canSeeChart('ops-supplier-performance-chart') && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Tedarikçi Performansı</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Grafik Yakında
            </div>
          </div>
        )}
      </div>

      {/* Tables Section */}
      {canSeeTable('ops-order-requirements') && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Sipariş Gereksinimleri Detay</h3>
          <div className="text-muted-foreground">
            Tablo Yakında
          </div>
        </div>
      )}

      {canSeeTable('ops-supplier-performance') && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Tedarikçi Performans Tablosu</h3>
          <div className="text-muted-foreground">
            Tablo Yakında
          </div>
        </div>
      )}
    </div>
  );
}
