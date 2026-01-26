"use client";

import React from "react";
import LucideCircleDollarSignIcon from "lucide-react"; // Import the missing icon component

import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import {
  LayoutDashboard,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Settings,
  LineChart,
  Package,
  Tag,
  Calendar,
  TrendingUp,
  CalendarRange,
} from "lucide-react";

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const navigation: { name: string; href: Section; icon: React.ElementType }[] = [
  { name: "Genel Bakış", href: "overview", icon: LayoutDashboard },
  { name: "Talep Tahminleme", href: "demand_forecasting", icon: TrendingUp },
  { name: "Envanter Planlama", href: "inventory_planning", icon: Package },
  { name: "Fiyatlandırma & Promosyon", href: "pricing_promotion", icon: Tag },
  { name: "Sezonluk Planlama", href: "seasonal_planning", icon: CalendarRange },
];

export function Sidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out flex flex-col",
        collapsed ? "w-[72px]" : "w-[260px] shadow-2xl"
      )}
      onMouseEnter={() => onCollapsedChange(false)}
      onMouseLeave={() => onCollapsedChange(true)}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white overflow-hidden p-1">
            <img src="/bee2_ai_logo.svg" alt="Bee2 AI" className="w-full h-full object-contain" />
          </div>
          <span
            className={cn(
              "font-semibold text-lg text-sidebar-foreground whitespace-nowrap transition-all duration-300",
              collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
            )}
          >
            Bee2 AI Forecasting
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.href;

          return (
            <button
              key={item.href}
              onClick={() => onSectionChange(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {/* Active indicator */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-transform duration-200",
                  isActive ? "text-accent" : "group-hover:scale-110"
                )}
              />
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                )}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
