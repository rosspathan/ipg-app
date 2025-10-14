import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { CleanCard } from "./CleanCard";
import { cn } from "@/lib/utils";

interface CleanMetricCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: number;
    trend: "up" | "down";
  };
  icon?: LucideIcon;
  className?: string;
}

export function CleanMetricCard({
  label,
  value,
  delta,
  icon: Icon,
  className,
}: CleanMetricCardProps) {
  const isPositive = delta?.trend === "up";
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <CleanCard padding="lg" className={className}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs uppercase tracking-wide text-[hsl(220_9%_65%)] font-medium">
          {label}
        </p>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-[hsl(262_100%_65%/0.1)]">
            <Icon className="w-4 h-4 text-[hsl(262_100%_65%)]" />
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <h3 
          className="text-3xl font-bold text-[hsl(0_0%_98%)] tracking-tight"
          style={{ fontFeatureSettings: "'tnum'" }}
        >
          {value}
        </h3>
        
        {delta && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
              isPositive 
                ? "bg-[hsl(152_64%_48%/0.1)] text-[hsl(152_64%_48%)]" 
                : "bg-[hsl(0_84%_60%/0.1)] text-[hsl(0_84%_60%)]"
            )}
          >
            <TrendIcon className="w-3 h-3" />
            {Math.abs(delta.value)}%
          </div>
        )}
      </div>
    </CleanCard>
  );
}
