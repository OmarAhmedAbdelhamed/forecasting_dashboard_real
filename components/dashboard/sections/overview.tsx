"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { PipelineOverview } from "@/components/dashboard/charts/pipeline-overview";
import { RecentDeals } from "@/components/dashboard/recent-deals";
import { TopPerformers } from "@/components/dashboard/top-performers";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";
import { CircleDollarSign } from "lucide-react"; // Added CircleDollarSign import

export function OverviewSection() {
  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tahmini Ciro" // Changed title
          value="₺47.4k" // Changed value
          subtext="Tahmini Gelir" // Added subtext
          icon={CircleDollarSign} // Changed icon
          delay={0}
        />
        <MetricCard
          title="Conversion Rate"
          value="24.8%"
          change="+3.2%"
          changeType="positive"
          icon={TrendingUp}
          delay={1}
        />
        <MetricCard
          title="Active Deals"
          value="147"
          change="-5"
          changeType="negative"
          icon={Target}
          delay={2}
        />
        <MetricCard
          title="New Leads"
          value="892"
          change="+18.3%"
          changeType="positive"
          icon={Users}
          delay={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Genel Bakış</h2>
        <p className="text-muted-foreground">
          Forecasting metriklerinize genel bir bakış.
        </p>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <PipelineOverview />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentDeals />
        <TopPerformers />
      </div>
    </div>
  );
}
