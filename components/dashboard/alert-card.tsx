"use client";

import { cn } from "@/lib/utils";

import { ChevronRight, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AlertCardProps {
  title: string;
  count: number;
  status: "critical" | "warning" | "success" | "info";
  infoText?: string;
  onClick?: () => void;
}

export function AlertCard({
  title,
  count,
  status,
  infoText,
  onClick,
}: AlertCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-accent/50 transition-all duration-300 overflow-hidden",
        "flex flex-col justify-between min-h-[100px]"
      )}
    >
      {/* Hover Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </span>
          {infoText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1 -m-1 rounded-full hover:bg-muted/50 transition-colors">
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px]">{infoText}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
      </div>

      {/* Content */}
      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            "w-4 h-4 rounded-full shadow-sm",
            status === "critical" && "bg-destructive",
            status === "warning" && "bg-yellow-500",
            status === "success" && "bg-emerald-500",
            status === "info" && "bg-blue-500"
          )}
        />
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {count}
        </span>
      </div>
    </div>
  );
}
