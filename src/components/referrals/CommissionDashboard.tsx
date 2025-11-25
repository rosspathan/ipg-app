import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, Award, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function CommissionDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['commission-dashboard-stats'],
    queryFn: async () => {
      // Get commission stats for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: commissions } = await supabase
        .from('referral_commissions')
        .select('bsk_amount, commission_type, level, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (!commissions) return null;

      const total = commissions.reduce((sum, c) => sum + c.bsk_amount, 0);
      const l1Subscription = commissions
        .filter(c => c.commission_type === 'badge_subscription')
        .reduce((sum, c) => sum + c.bsk_amount, 0);
      const l1Level = commissions
        .filter(c => c.commission_type === 'multi_level' && c.level === 1)
        .reduce((sum, c) => sum + c.bsk_amount, 0);
      const multiLevel = commissions
        .filter(c => c.commission_type === 'multi_level' && c.level > 1)
        .reduce((sum, c) => sum + c.bsk_amount, 0);

      // Get unique earners
      const uniqueEarners = new Set(commissions.map(c => c.level));

      // Calculate level distribution
      const levelDistribution: Record<string, number> = {};
      commissions.forEach(c => {
        const key = c.level.toString();
        levelDistribution[key] = (levelDistribution[key] || 0) + c.bsk_amount;
      });

      return {
        total,
        l1Subscription,
        l1Level,
        multiLevel,
        uniqueLevelsActive: uniqueEarners.size,
        levelDistribution,
        commissionsCount: commissions.length
      };
    },
    refetchInterval: 30000 // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div>No commission data available</div>;
  }

  const l1Total = stats.l1Subscription + stats.l1Level;
  const l1Percent = (l1Total / stats.total * 100).toFixed(1);
  const multiPercent = (stats.multiLevel / stats.total * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Commissions (30d)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toFixed(0)} BSK</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.commissionsCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              L1 Commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{l1Total.toFixed(0)} BSK</div>
            <p className="text-xs text-muted-foreground mt-1">
              {l1Percent}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Multi-Level (L2-L50)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.multiLevel.toFixed(0)} BSK</div>
            <p className="text-xs text-muted-foreground mt-1">
              {multiPercent}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Active Levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueLevelsActive}</div>
            <p className="text-xs text-muted-foreground mt-1">
              levels earning
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission Breakdown</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">L1 Subscription Bonus (10%)</span>
                <span className="text-sm font-bold">{stats.l1Subscription.toFixed(0)} BSK</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2" 
                  style={{ width: `${(stats.l1Subscription / stats.total * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">L1 Level Reward</span>
                <span className="text-sm font-bold">{stats.l1Level.toFixed(0)} BSK</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-success rounded-full h-2" 
                  style={{ width: `${(stats.l1Level / stats.total * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">L2-L50 Multi-Level</span>
                <span className="text-sm font-bold">{stats.multiLevel.toFixed(0)} BSK</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-accent rounded-full h-2" 
                  style={{ width: `${(stats.multiLevel / stats.total * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
