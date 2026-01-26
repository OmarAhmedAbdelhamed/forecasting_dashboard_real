"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";

export function SeasonalPlanningSection() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
      <CalendarRange className="h-24 w-24 text-muted-foreground/20" />
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Sezonluk Planlama</h2>
        <p className="text-muted-foreground">
          Bu modül geliştirme aşamasındadır. Yakında sizlerle!
        </p>
      </div>
    </div>
  );
}
