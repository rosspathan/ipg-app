import { Card, CardContent } from "@/components/ui/card";
import { Users, Award, TrendingUp, Sparkles } from "lucide-react";
import type { DownlineTreeData } from "@/hooks/useDownlineTree";

interface TeamOverviewDashboardProps {
  data: DownlineTreeData;
}

export function TeamOverviewDashboard({ data }: TeamOverviewDashboardProps) {
  // Calculate VIP counts
  const directVIPCount = data.members.filter(m => {
    if (m.level !== 1) return false;
    const badge = m.current_badge?.toUpperCase() || '';
    return badge.includes('VIP') || badge.includes('SMART');
  }).length;

  const totalVIPCount = data.members.filter(m => {
    const badge = m.current_badge?.toUpperCase() || '';
    return badge.includes('VIP') || badge.includes('SMART');
  }).length;

  // Calculate active members (those with badges)
  const activeMembersCount = data.members.filter(m => m.current_badge).length;

  // Calculate total earned from all levels
  const totalEarned = data.levelStats.reduce((sum, level) => sum + level.total_generated, 0);

  // Count direct referrals (Level 1)
  const directReferrals = data.members.filter(m => m.level === 1).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Team */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{data.totalMembers}</p>
            <p className="text-sm font-medium text-muted-foreground">Total Team</p>
            <p className="text-xs text-muted-foreground">Across {data.deepestLevel} levels</p>
          </div>
        </CardContent>
      </Card>

      {/* Direct Referrals (L1) */}
      <Card className="overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{directReferrals}</p>
            <p className="text-sm font-medium text-muted-foreground">Direct (L1)</p>
            <p className="text-xs text-muted-foreground">VIP: {directVIPCount}</p>
          </div>
        </CardContent>
      </Card>

      {/* Active Members */}
      <Card className="overflow-hidden border-green-500/20 bg-gradient-to-br from-green-500/10 via-green-500/5 to-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activeMembersCount}</p>
            <p className="text-sm font-medium text-muted-foreground">Active Members</p>
            <p className="text-xs text-muted-foreground">With badges</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Earned */}
      <Card className="overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {totalEarned.toFixed(0)}
            </p>
            <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
            <p className="text-xs text-muted-foreground">BSK from team</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
