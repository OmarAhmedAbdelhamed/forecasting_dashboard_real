"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { OverviewSection } from "@/components/dashboard/sections/overview";
import { ForecastingSection } from "@/components/dashboard/sections/forecasting";
import { DemandForecastingSection } from "@/components/dashboard/sections/demand-forecasting";
import { InventoryPlanningSection } from "@/components/dashboard/sections/inventory-planning";
import { SeasonalPlanningSection } from "@/components/dashboard/sections/seasonal-planning";

export type Section = "overview" | "demand_forecasting" | "inventory_planning" | "pricing_promotion" | "seasonal_planning";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "demand_forecasting":
        return <DemandForecastingSection />;
      case "inventory_planning":
        return <InventoryPlanningSection />;
      case "pricing_promotion":
        return <ForecastingSection />;
      case "seasonal_planning":
        return <SeasonalPlanningSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className="flex-1 flex flex-col transition-all duration-300 ease-out ml-[72px]"
      >
        <Header activeSection={activeSection} />
        <main className="flex-1 p-6 overflow-auto">
          <div
            key={activeSection}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
