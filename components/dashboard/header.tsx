"use client";

import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import { Bell } from "lucide-react";

interface HeaderProps {
  activeSection: Section;
}

const sectionTitles: any = {
  overview: "Genel Bakış",
  demand_forecasting: "Talep Tahminleme",
  inventory_planning: "Envanter Planlama",
  pricing_promotion: "Fiyatlandırma & Promosyon",
  seasonal_planning: "Sezonluk Planlama",
};

export function Header({ activeSection }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-semibold text-foreground">
          {sectionTitles[activeSection] || "Bee2 AI"}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
        </button>

        {/* User avatar */}
        <button className="w-9 h-9 rounded-lg overflow-hidden bg-secondary ring-2 ring-transparent hover:ring-accent/50 transition-all duration-200">
          <div className="w-full h-full bg-gradient-to-br from-accent/80 to-chart-1 flex items-center justify-center text-xs font-semibold text-accent-foreground">
            JD
          </div>
        </button>
      </div>
    </header>
  );
}
