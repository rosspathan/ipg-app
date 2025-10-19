import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProgramWithConfig } from "@/hooks/useProgramEconomics";

interface QuickStatsBarProps {
  programs: ProgramWithConfig[];
  isLoading: boolean;
}

export function QuickStatsBar({ programs, isLoading }: QuickStatsBarProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  const livePrograms = programs.filter(
    (p) => p.currentConfig?.status === "published"
  ).length;
  const draftPrograms = programs.filter(
    (p) => p.currentConfig?.status === "draft"
  ).length;
  const pausedPrograms = programs.filter(
    (p) => p.currentConfig?.status === "archived"
  ).length;

  const stats = [
    {
      label: "Total Programs",
      value: programs.length,
      icon: Activity,
      trend: null,
    },
    {
      label: "Live Programs",
      value: livePrograms,
      icon: TrendingUp,
      trend: "success",
    },
    {
      label: "Draft Programs",
      value: draftPrograms,
      icon: DollarSign,
      trend: null,
    },
    {
      label: "Paused Programs",
      value: pausedPrograms,
      icon: TrendingDown,
      trend: pausedPrograms > 0 ? "warning" : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="rounded-lg border bg-card p-4 hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{stat.value}</p>
              {stat.trend === "success" && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  Active
                </span>
              )}
              {stat.trend === "warning" && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                  Need attention
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
