import { TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { ProgramAnalytics } from "@/hooks/useProgramAnalytics";

interface ProgramStatsCardProps {
  moduleId?: string;
  analytics?: ProgramAnalytics;
}

export function ProgramStatsCard({ moduleId, analytics }: ProgramStatsCardProps) {
  if (!analytics) {
    return (
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
          Program Stats
        </h3>
        <p className="text-sm text-[hsl(220_9%_65%)]">
          No analytics data available yet
        </p>
      </CleanCard>
    );
  }

  const stats = [
    {
      label: "Active Users",
      value: analytics.activeUsers.toLocaleString(),
      icon: Users,
      trend: analytics.trend,
      color: "hsl(262_100%_65%)",
    },
    {
      label: "Total Views",
      value: analytics.totalViews.toLocaleString(),
      icon: Target,
      trend: analytics.trend,
      color: "hsl(142_71%_45%)",
    },
    {
      label: "Revenue",
      value: `${analytics.revenue.toLocaleString()} BSK`,
      icon: DollarSign,
      trend: analytics.trend,
      color: "hsl(38_92%_50%)",
    },
    {
      label: "Conversion",
      value: `${analytics.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: analytics.trend,
      color: "hsl(199_89%_48%)",
    },
  ];

  return (
    <CleanCard padding="lg">
      <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
        Program Stats
      </h3>
      <div className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: `${stat.color}/0.1` }}
                >
                  <stat.icon 
                    className="w-4 h-4" 
                    style={{ color: stat.color }}
                  />
                </div>
                <span className="text-xs text-[hsl(220_9%_65%)]">
                  {stat.label}
                </span>
              </div>
              {stat.trend === 'up' && (
                <span className="text-xs text-[hsl(142_71%_45%)]">↑</span>
              )}
              {stat.trend === 'down' && (
                <span className="text-xs text-red-400">↓</span>
              )}
            </div>
            <p className="text-lg font-bold text-[hsl(0_0%_98%)]" style={{ fontFeatureSettings: "'tnum'" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </CleanCard>
  );
}
