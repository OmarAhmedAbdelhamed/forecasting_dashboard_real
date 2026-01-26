"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export function InventoryPlanningSection() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
      <Package className="h-24 w-24 text-muted-foreground/20" />
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Envanter Planlama</h2>
        <p className="text-muted-foreground">
          Bu modül geliştirme aşamasındadır. Yakında sizlerle!
        </p>
      </div>
    </div>
  );
}
