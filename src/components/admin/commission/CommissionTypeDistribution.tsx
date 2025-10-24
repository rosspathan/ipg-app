import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBSKAmount } from '@/lib/commissionExport';
import type { CommissionStats } from '@/hooks/useAdminCommissions';

interface CommissionTypeDistributionProps {
  stats: CommissionStats | undefined;
}

export function CommissionTypeDistribution({ stats }: CommissionTypeDistributionProps) {
  if (!stats) return null;

  const total = stats.totalDistributed || 1; // Avoid division by zero
  const directPercent = (stats.byType.direct / total) * 100;
  const teamPercent = (stats.byType.team_income / total) * 100;
  const vipPercent = (stats.byType.vip_milestone / total) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Type Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                💰 Direct (10%)
              </span>
              <span className="font-medium">{directPercent.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${directPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                {formatBSKAmount(stats.byType.direct)} BSK
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                🌳 50-Level Team
              </span>
              <span className="font-medium">{teamPercent.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${teamPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                {formatBSKAmount(stats.byType.team_income)} BSK
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                🎁 VIP Milestones
              </span>
              <span className="font-medium">{vipPercent.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${vipPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                {formatBSKAmount(stats.byType.vip_milestone)} BSK
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Distributed</span>
            <span className="text-lg font-bold">{formatBSKAmount(stats.totalDistributed)} BSK</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
