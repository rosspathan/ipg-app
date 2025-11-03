import { Card } from '@/components/ui/card';
import { TrendingUp, ArrowRightLeft, UserPlus, Settings } from 'lucide-react';
import { useTransferStats } from '@/hooks/useAdminBSKTransfers';
import type { TransferFilters } from '@/hooks/useAdminBSKTransfers';

interface BSKTransferAnalyticsProps {
  filters: TransferFilters;
}

export function BSKTransferAnalytics({ filters }: BSKTransferAnalyticsProps) {
  const { data: stats, isLoading } = useTransferStats(filters);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-4 animate-pulse bg-card">
            <div className="h-4 bg-muted rounded mb-2" />
            <div className="h-8 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Transfers',
      value: stats?.totalTransfers || 0,
      icon: ArrowRightLeft,
      color: 'text-primary',
    },
    {
      label: 'Total Volume',
      value: `${(stats?.totalVolume || 0).toLocaleString()} BSK`,
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      label: 'User Transfers',
      value: stats?.userTransfers || 0,
      icon: UserPlus,
      color: 'text-accent',
    },
    {
      label: 'Admin Operations',
      value: (stats?.adminCredits || 0) + (stats?.adminDebits || 0),
      icon: Settings,
      color: 'text-warning',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
              <Icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {typeof kpi.value === 'string' ? kpi.value : kpi.value.toLocaleString()}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
